from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request, Response, Cookie
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import httpx
import asyncio
import resend
import secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid

ROOT_DIR = Path(__file__).parent

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'coolbreeze_secret_2024')
JWT_ALGORITHM = "HS256"
WHATSAPP_NUMBER = os.environ.get('WHATSAPP_NUMBER', '923000000000')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ALLOWED_ADMIN_EMAILS = [
    e.strip().lower() for e in os.environ.get('ALLOWED_ADMIN_EMAILS', '').split(',') if e.strip()
]
DEFAULT_ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Admin@123')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

app = FastAPI()
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(email: str) -> str:
    payload = {"email": email, "role": "admin", "exp": datetime.now(timezone.utc) + timedelta(hours=24)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_admin_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def doc_to_dict(d):
    if d and "_id" in d:
        d["id"] = str(d.pop("_id"))
    return d


# ---- User Auth Helpers (Emergent Google Auth) ----

async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    """Returns the logged-in user or None. Use get_required_user for protected routes."""
    token = None
    if session_token:
        token = session_token
    elif authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    if not token:
        return None

    session = await db.user_sessions.find_one({"session_token": token})
    if not session:
        return None

    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None

    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user


async def get_required_user(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    return user


# ---- Models ----

class AdminLogin(BaseModel):
    email: str
    password: str


class AdminForgotPassword(BaseModel):
    email: EmailStr


class AdminResetPassword(BaseModel):
    email: EmailStr
    code: str
    new_password: str


class ColorVariant(BaseModel):
    name: str
    hex: Optional[str] = None
    image_url: Optional[str] = None


class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    discounted_price: float
    category: str = "fan"
    images: List[str] = []
    video_url: Optional[str] = None
    colors: List[str] = []
    color_variants: List[ColorVariant] = []
    sizes: List[str] = []
    stock: int = 100
    battery_life: Optional[str] = None
    features: List[str] = []
    is_active: bool = True
    total_sold: int = 0


class ProductUpdate(ProductCreate):
    pass


class OrderItem(BaseModel):
    product_id: str
    product_name: str
    product_image: str
    quantity: int = 1
    selected_color: Optional[str] = None
    selected_size: Optional[str] = None
    unit_price: float
    line_total: float


class OrderCreate(BaseModel):
    customer_name: str
    phone: str
    whatsapp: str
    email: Optional[str] = None
    address: str
    city: str
    province: Optional[str] = "Punjab"
    items: List[OrderItem]
    total_price: float
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str


class ReviewCreate(BaseModel):
    product_id: str
    rating: int
    comment: str
    images: List[str] = []   # base64 data URIs (up to 3)


class AdminReviewCreate(BaseModel):
    product_id: str
    reviewer_name: str
    rating: int
    comment: str
    images: List[str] = []
    verified_purchase: bool = False
    is_approved: bool = True
    created_at: Optional[str] = None  # Admin can override review date/time (ISO format)


class SessionExchange(BaseModel):
    session_id: str


class LinkGuestOrders(BaseModel):
    order_numbers: List[str]


class SiteSettingsUpdate(BaseModel):
    settings: dict


class TestimonialItem(BaseModel):
    name: str
    city: Optional[str] = ""
    rating: int = 5
    quote: str
    avatar: Optional[str] = ""
    date: Optional[str] = ""


class TestimonialsBulkUpdate(BaseModel):
    testimonials: List[TestimonialItem]


# ---- Default Site Settings ----

DEFAULT_SITE_SETTINGS = {
    "brand_name": "CoolBreeze PK",
    "brand_tagline": "Beat the Heat with Premium Quality",
    "whatsapp_number": "923000000000",
    "hero_badge": "Pakistan's #1 Imported Fan Store",
    "hero_title_main": "Beat the Heat with",
    "hero_title_accent": "Premium Quality",
    "hero_subtitle": "Directly imported neck fans, baby fans & travel fans — long battery, 7-day warranty, Cash on Delivery!",
    "hero_cta_primary": "Shop Summer Sale",
    "hero_cta_secondary": "Chat on WhatsApp",
    "sale_banner_primary": "🌡️ SUMMER SALE — UP TO 80% OFF",
    "sale_banner_secondary": "FREE DELIVERY on orders over Rs. 2000",
    "sale_banner_tertiary": "Limited Stock — Selling Fast!",
    "why_buy_title": "Why Pakistan Trusts CoolBreeze",
    "why_buy_subtitle": "We import premium fans directly — no middlemen, no copies. Real quality, real cooling, real value.",
    "products_section_title": "Our Premium Fan Collection",
    "products_section_subtitle": "10 imported fans — each handpicked, each on sale, each ready to ship today.",
    "stats_customers_value": "50,000+",
    "stats_customers_label": "Happy Customers",
    "stats_orders_value": "12,000+",
    "stats_orders_label": "Orders Delivered",
    "stats_rating_value": "4.9/5",
    "stats_rating_label": "Customer Rating",
    "stats_cities_value": "100+",
    "stats_cities_label": "Cities Served",
    "founder_quote": "Every Pakistani family deserves real cooling comfort — not cheap copies. That's why we import directly from premium factories and stand behind every single fan we sell.",
    "founder_name": "Team CoolBreeze",
    "founder_role": "Bringing Real Cool to Real Homes",
    "guarantee_title": "100% Satisfaction Guarantee",
    "guarantee_text": "Open the box. Test the fan. Fall in love — or send it back, no questions asked.",
    "whatsapp_cta_title": "Need Help Choosing?",
    "whatsapp_cta_subtitle": "Chat with us directly on WhatsApp. Our team will help you pick the perfect fan.",
    "footer_tagline": "Pakistan's #1 Imported Fan Store • Cash on Delivery",
    "trust_badges": [
        {"label": "Cash on Delivery"},
        {"label": "7-Day Check Warranty"},
        {"label": "Return Back Policy"},
        {"label": "Delivery in 1-2 Days"}
    ],
    "featured_testimonials": [
        {"name": "Ayesha K.", "city": "Karachi", "rating": 5, "quote": "The Neck Fan Pro is a game-changer in summer. Honestly the best Rs. 2500 I've spent this year!", "avatar": "https://i.pravatar.cc/100?img=47"},
        {"name": "Bilal R.", "city": "Lahore", "rating": 5, "quote": "Got it for load-shedding nights — my whole family loves it. Solid build, real battery life. Genuine product.", "avatar": "https://i.pravatar.cc/100?img=12"},
        {"name": "Hira M.", "city": "Islamabad", "rating": 5, "quote": "I was scared to order COD online. But CoolBreeze delivered in 2 days, packaging was premium, fan works perfectly.", "avatar": "https://i.pravatar.cc/100?img=32"}
    ]
}


# ---- Seed Data ----

SEED_PRODUCTS = [
    {
        "name": "Neck Fan Pro 360°",
        "description": "Hands-free bladeless neck fan with 360° airflow technology. Perfect for outdoor activities, daily commute, and summer walks. Ultra-quiet motor with 3 speed settings and 8-hour battery life.",
        "price": 4999, "discounted_price": 2499, "category": "neck-fan",
        "images": [
            "https://images.unsplash.com/photo-1657537488218-f7eb744c5b0b?crop=entropy&cs=srgb&fm=jpg&w=500&q=80",
            "https://images.unsplash.com/photo-1776183422641-5dc7d7ab7d95?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"
        ],
        "video_url": None, "colors": ["White", "Black", "Pink", "Blue"], "color_variants": [], "sizes": [],
        "stock": 150, "battery_life": "8-10 hours",
        "features": ["Bladeless Design", "3 Speed Settings", "USB-C Charging", "Ultra Quiet <35dB", "360° Airflow"],
        "is_active": True, "total_sold": 248
    },
    {
        "name": "Baby Stroller Clip Fan",
        "description": "Whisper-quiet clip fan designed for baby strollers, cribs, and car seats. Safe protective grill design with 360° rotation. Keeps your baby cool all summer long.",
        "price": 2499, "discounted_price": 899, "category": "baby-fan",
        "images": ["https://images.unsplash.com/photo-1566441699339-0c7bac167c58?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
        "video_url": None, "colors": ["White", "Blue", "Pink"], "color_variants": [], "sizes": [],
        "stock": 200, "battery_life": "12 hours",
        "features": ["Baby Safe Design", "Super Quiet", "360° Rotation", "Strong Clip", "USB-C Powered"],
        "is_active": True, "total_sold": 412
    },
    {
        "name": "USB Mini Desk Fan",
        "description": "Compact yet powerful USB desk fan with 5 wind speed settings. Flexible 360° tilt design. Ideal for home office, study table, and bedside. Extremely quiet for night use.",
        "price": 3299, "discounted_price": 1799, "category": "desk-fan",
        "images": ["https://images.unsplash.com/photo-1618941716939-553df3c6c278?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
        "video_url": None, "colors": ["White", "Black", "Blue"], "color_variants": [], "sizes": ["4-inch", "6-inch"],
        "stock": 120, "battery_life": "USB Powered",
        "features": ["5 Speed Settings", "360° Tilt", "Quiet Operation", "USB Powered", "Compact Design"],
        "is_active": True, "total_sold": 156
    },
    {
        "name": "Foldable Handheld Fan",
        "description": "Ultra-portable foldable mini fan that fits in your pocket or bag. Built-in 2000mAh battery with USB charging. 3 speed settings for personal cooling on the go. Perfect travel companion.",
        "price": 1999, "discounted_price": 799, "category": "handheld-fan",
        "images": ["https://images.unsplash.com/photo-1718815416565-c65944a5ec14?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
        "video_url": None, "colors": ["Pink", "White", "Black", "Gold"], "color_variants": [], "sizes": [],
        "stock": 300, "battery_life": "4-6 hours",
        "features": ["Foldable Design", "Pocket Size", "3 Speed Settings", "2000mAh Battery", "USB-C Charging"],
        "is_active": True, "total_sold": 587
    },
    {
        "name": "Bladeless Neck Fan - Turbo",
        "description": "Premium bladeless wearable neck fan with powerful turbo airflow. 4000mAh long-lasting battery, ergonomic lightweight design. Whisper-quiet even at max speed. Best seller for outdoor use.",
        "price": 6999, "discounted_price": 3499, "category": "neck-fan",
        "images": [
            "https://images.unsplash.com/photo-1776183422641-5dc7d7ab7d95?crop=entropy&cs=srgb&fm=jpg&w=500&q=80",
            "https://images.unsplash.com/photo-1657537488218-f7eb744c5b0b?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"
        ],
        "video_url": None, "colors": ["White", "Black", "Sky Blue"], "color_variants": [], "sizes": [],
        "stock": 80, "battery_life": "10-12 hours",
        "features": ["Turbo Mode", "4000mAh Battery", "4 Speed Settings", "USB-C Fast Charge", "Ergonomic Design"],
        "is_active": True, "total_sold": 321
    },
    {
        "name": "Baby Night Cooling Fan",
        "description": "Ultra-silent baby room fan with built-in soft ambient night light. Whisper mode produces less than 25dB noise. Safety certified with fully enclosed blade guard. Perfect for peaceful baby sleep.",
        "price": 3999, "discounted_price": 2199, "category": "baby-fan",
        "images": ["https://images.unsplash.com/photo-1564510182791-29645da7fac4?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
        "video_url": None, "colors": ["White", "Pink"], "color_variants": [], "sizes": [],
        "stock": 100, "battery_life": "USB Powered",
        "features": ["<25dB Whisper Mode", "Night Light", "Baby Safe", "3 Wind Speeds", "Timer Function"],
        "is_active": True, "total_sold": 89
    },
    {
        "name": "10000mAh Travel Fan",
        "description": "High-capacity rechargeable fan with massive 10000mAh power bank. Charges your phone AND cools you simultaneously! 4 speed settings with turbo mode. Ideal for travel and load-shedding.",
        "price": 8999, "discounted_price": 4499, "category": "travel-fan",
        "images": ["https://images.unsplash.com/photo-1523437345381-db5ee4df9c04?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
        "video_url": None, "colors": ["Black", "Blue", "White"], "color_variants": [], "sizes": [],
        "stock": 60, "battery_life": "16-20 hours",
        "features": ["10000mAh Battery", "Phone Charger", "Turbo Mode", "4 Speeds", "LED Battery Display"],
        "is_active": True, "total_sold": 178
    },
    {
        "name": "Car Dashboard USB Fan",
        "description": "Powerful flexible neck car fan for dashboard use. Connects directly to car USB port. 360° adjustable neck design with silent motor. Keeps you cool while driving.",
        "price": 2999, "discounted_price": 1299, "category": "car-fan",
        "images": ["https://images.unsplash.com/photo-1565151443833-29bf2ba5dd8d?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
        "video_url": None, "colors": ["Black", "Silver", "White"], "color_variants": [], "sizes": [],
        "stock": 180, "battery_life": "Car USB Powered",
        "features": ["360° Flexible Neck", "Silent Motor", "2 Speed Settings", "Plug & Play", "Universal USB"],
        "is_active": True, "total_sold": 234
    },
    {
        "name": "Mini Tower Fan (5 Speeds)",
        "description": "Sleek portable tower-style fan with oscillation feature. 5 wind speeds with 2-hour auto-off timer. Built-in 6000mAh battery. Modern design for bedroom, living room, or office desk.",
        "price": 9999, "discounted_price": 5499, "category": "tower-fan",
        "images": [
            "https://images.unsplash.com/photo-1618941716939-553df3c6c278?crop=entropy&cs=srgb&fm=jpg&w=500&q=80",
            "https://images.unsplash.com/photo-1566441699339-0c7bac167c58?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"
        ],
        "video_url": None, "colors": ["White", "Gray"], "color_variants": [], "sizes": ["12-inch", "18-inch"],
        "stock": 40, "battery_life": "8-15 hours",
        "features": ["Oscillation", "5 Speed Settings", "Sleep Timer", "6000mAh Battery", "Touch Controls"],
        "is_active": True, "total_sold": 67
    },
    {
        "name": "Kids Cute Mini Fan",
        "description": "Adorable mini fan designed specially for children. Extra-safe soft blades with full protective cover. Lightweight and easy to hold. USB charging with 1500mAh battery. Perfect summer gift for kids!",
        "price": 1499, "discounted_price": 599, "category": "kids-fan",
        "images": ["https://images.unsplash.com/photo-1718815416565-c65944a5ec14?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
        "video_url": None, "colors": ["Pink", "Blue", "Yellow", "Green"], "color_variants": [], "sizes": [],
        "stock": 250, "battery_life": "3-5 hours",
        "features": ["Safe Soft Blades", "Cute Design", "Lightweight", "1500mAh Battery", "Multiple Colors"],
        "is_active": True, "total_sold": 612
    }
]

SEED_REVIEWS = [
    {"product_index": 0, "reviewer_name": "Ahmed Hassan", "rating": 5, "comment": "Absolutely amazing neck fan! Battery lasts all day during my long walks. Very comfortable to wear. Highly recommend!", "images": [], "verified_purchase": True},
    {"product_index": 0, "reviewer_name": "Sara Malik", "rating": 4, "comment": "Very comfortable and the airflow is great. Only wish it came in more colors. Overall very happy with the purchase.", "images": [], "verified_purchase": True},
    {"product_index": 1, "reviewer_name": "Fatima Rashid", "rating": 5, "comment": "Perfect for my baby's stroller! Very quiet, baby doesn't get disturbed at all. The clip is super strong. 10/10!", "images": [], "verified_purchase": True},
    {"product_index": 2, "reviewer_name": "Hassan Ali", "rating": 4, "comment": "Good desk fan for the price. Very quiet for night use. The 5 speeds are great. Highly recommended!", "images": [], "verified_purchase": True},
    {"product_index": 3, "reviewer_name": "Zara Khan", "rating": 5, "comment": "Pocket-sized and very powerful! I take it everywhere. Fits perfectly in my bag. Battery is decent for the size.", "images": [], "verified_purchase": True},
    {"product_index": 4, "reviewer_name": "Muhammad Tariq", "rating": 5, "comment": "Best neck fan I have ever used! The turbo mode is incredible for hot summer days. Very well built. 5 stars!", "images": [], "verified_purchase": True},
    {"product_index": 6, "reviewer_name": "Amna Sheikh", "rating": 5, "comment": "This fan is a lifesaver during power outages! The 10000mAh battery ran for 18 hours straight. Also charged my phone. Amazing!", "images": [], "verified_purchase": True},
    {"product_index": 7, "reviewer_name": "Bilal Qureshi", "rating": 4, "comment": "Great car fan. Very silent during driving and the flexible neck can reach any direction. Good quality for the price.", "images": [], "verified_purchase": True},
    {"product_index": 9, "reviewer_name": "Hina Baig", "rating": 5, "comment": "Bought this for my 4-year-old daughter and she loves it! Very safe with the soft blades. The pink color is adorable!", "images": [], "verified_purchase": True},
]


@app.on_event("startup")
async def startup_event():
    await db.products.create_index("is_active")
    await db.orders.create_index("created_at")
    await db.orders.create_index("order_number")
    await db.orders.create_index("user_email")
    await db.reviews.create_index("product_id")
    await db.admins.create_index("email", unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)

    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@coolbreeze.pk')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'Admin@123')
    existing = await db.admins.find_one({"email": admin_email})
    if not existing:
        await db.admins.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "CoolBreeze Admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.admins.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # Seed the three allowed admin Gmail accounts with shared password
    SHARED_ADMIN_PASSWORD = "Anees@3221."
    for email in ALLOWED_ADMIN_EMAILS:
        existing_a = await db.admins.find_one({"email": email})
        if not existing_a:
            await db.admins.insert_one({
                "email": email,
                "password_hash": hash_password(SHARED_ADMIN_PASSWORD),
                "name": email.split("@")[0].title(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(f"Allowed admin created: {email}")

    count = await db.products.count_documents({})
    if count == 0:
        now = datetime.now(timezone.utc).isoformat()
        for p in SEED_PRODUCTS:
            p["created_at"] = now
            p["updated_at"] = now
        result = await db.products.insert_many(SEED_PRODUCTS)
        product_ids = [str(pid) for pid in result.inserted_ids]

        review_count = await db.reviews.count_documents({})
        if review_count == 0:
            now2 = datetime.now(timezone.utc).isoformat()
            reviews_to_insert = []
            for review in SEED_REVIEWS:
                r = dict(review)
                idx = r.pop("product_index")
                if idx < len(product_ids):
                    r["product_id"] = product_ids[idx]
                    r["created_at"] = now2
                    r["is_approved"] = True
                    reviews_to_insert.append(r)
            if reviews_to_insert:
                await db.reviews.insert_many(reviews_to_insert)
        logger.info(f"Seeded {len(SEED_PRODUCTS)} products and reviews")
    else:
        # Backfill new schema fields for products created before schema additions
        await db.products.update_many(
            {"color_variants": {"$exists": False}}, {"$set": {"color_variants": []}}
        )
        await db.products.update_many(
            {"video_url": {"$exists": False}}, {"$set": {"video_url": None}}
        )
        await db.products.update_many(
            {"total_sold": {"$exists": False}}, {"$set": {"total_sold": 0}}
        )

    # Site settings seed (singleton document keyed by {"key": "main"})
    existing_settings = await db.site_settings.find_one({"key": "main"})
    if not existing_settings:
        await db.site_settings.insert_one({"key": "main", **DEFAULT_SITE_SETTINGS})
        logger.info("Seeded default site settings")
    else:
        # Backfill any missing default keys
        missing = {k: v for k, v in DEFAULT_SITE_SETTINGS.items() if k not in existing_settings}
        if missing:
            await db.site_settings.update_one({"key": "main"}, {"$set": missing})


# ---- Google Auth (Emergent-managed) ----
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

@api_router.post("/auth/session")
async def auth_session(data: SessionExchange, response: Response):
    """Exchange Emergent session_id for our session_token. Stores user, sets httpOnly cookie."""
    async with httpx.AsyncClient() as http:
        try:
            r = await http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": data.session_id},
                timeout=15.0,
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Auth provider error: {e}")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    payload = r.json()
    email = payload.get("email")
    name = payload.get("name", "")
    picture = payload.get("picture", "")
    session_token = payload.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=400, detail="Incomplete provider response")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )

    return {"user_id": user_id, "email": email, "name": name, "picture": picture}


@api_router.get("/auth/me")
async def auth_me(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # Strip mongo-internal/sensitive fields
    return {
        "user_id": user.get("user_id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture"),
    }


@api_router.post("/auth/logout")
async def auth_logout(
    response: Response,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
):
    token = session_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"message": "Logged out"}


# ---- Admin Auth ----

@api_router.post("/admin/login")
async def admin_login(data: AdminLogin):
    email = data.email.strip().lower()
    admin = await db.admins.find_one({"email": email})
    if not admin or not verify_password(data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(admin["email"])
    return {"token": token, "email": admin["email"], "name": admin.get("name", "Admin")}


@api_router.get("/admin/me")
async def admin_me(current_admin=Depends(get_admin_user)):
    return {"email": current_admin["email"], "role": "admin"}


@api_router.get("/admin/check-access")
async def admin_check_access(user=Depends(get_required_user)):
    """Returns whether the currently-signed-in Google user is an authorized admin."""
    email = (user.get("email") or "").lower()
    allowed = email in ALLOWED_ADMIN_EMAILS
    return {"is_admin": allowed, "email": email}


async def _send_email_async(to_email: str, subject: str, html: str):
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY missing — cannot send email")
        return None
    try:
        return await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html,
        })
    except Exception as e:
        logger.error(f"Resend send failed: {e}")
        return None


@api_router.post("/admin/forgot-password")
async def admin_forgot_password(data: AdminForgotPassword):
    """Send a 6-digit reset code to the admin's email. Always returns success to prevent enumeration."""
    email = data.email.strip().lower()
    admin = await db.admins.find_one({"email": email})
    if admin:
        code = "".join(secrets.choice("0123456789") for _ in range(6))
        await db.admin_reset_codes.update_one(
            {"email": email},
            {"$set": {
                "email": email,
                "code_hash": hash_password(code),
                "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15),
                "attempts": 0,
                "created_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #F0F9FF; border-radius: 16px;">
          <div style="text-align: center; background: linear-gradient(135deg, #0EA5E9, #06B6D4); padding: 24px; border-radius: 12px; color: white;">
            <h1 style="margin: 0; font-size: 22px;">CoolBreeze PK — Admin Reset</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Password reset code</p>
          </div>
          <div style="background: white; margin-top: 16px; padding: 24px; border-radius: 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <p style="color: #475569; margin: 0 0 12px;">Your verification code is:</p>
            <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0EA5E9; background: #F0F9FF; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
              {code}
            </div>
            <p style="color: #94A3B8; font-size: 12px; margin: 0;">Code expires in 15 minutes. Don't share it.</p>
          </div>
          <p style="text-align: center; margin-top: 16px; color: #94A3B8; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        """
        result = await _send_email_async(email, "CoolBreeze Admin Password Reset Code", html)
        # When using onboarding@resend.dev, Resend only delivers to the account owner's verified email.
        # Return success regardless to prevent enumeration; log result for debugging.
        logger.info(f"Reset code sent to {email}: send_result={result}")
    return {"message": "If this email is registered, a reset code has been sent."}


@api_router.post("/admin/reset-password")
async def admin_reset_password(data: AdminResetPassword):
    email = data.email.strip().lower()
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    record = await db.admin_reset_codes.find_one({"email": email})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    expires_at = record.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        await db.admin_reset_codes.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Code has expired. Request a new one.")
    if record.get("attempts", 0) >= 5:
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new code.")
    if not verify_password(data.code, record["code_hash"]):
        await db.admin_reset_codes.update_one({"email": email}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid code")
    # Update password
    result = await db.admins.update_one(
        {"email": email},
        {"$set": {"password_hash": hash_password(data.new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Admin not found")
    await db.admin_reset_codes.delete_one({"email": email})
    return {"message": "Password updated. You can now log in with your new password."}


# ---- Products ----

@api_router.get("/products")
async def get_products():
    products = await db.products.find({"is_active": True}).to_list(100)
    return [doc_to_dict(p) for p in products]


@api_router.get("/admin/products")
async def get_all_products(current_admin=Depends(get_admin_user)):
    products = await db.products.find({}).to_list(100)
    return [doc_to_dict(p) for p in products]


@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    p = await db.products.find_one({"_id": ObjectId(product_id)})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return doc_to_dict(p)


@api_router.post("/products")
async def create_product(data: ProductCreate, current_admin=Depends(get_admin_user)):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.products.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.put("/products/{product_id}")
async def update_product(product_id: str, data: ProductUpdate, current_admin=Depends(get_admin_user)):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    update_data = data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.products.update_one({"_id": ObjectId(product_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    updated = await db.products.find_one({"_id": ObjectId(product_id)})
    return doc_to_dict(updated)


@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_admin=Depends(get_admin_user)):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    result = await db.products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}


# ---- Orders ----

@api_router.post("/orders")
async def create_order(data: OrderCreate, user=Depends(get_current_user)):
    if not data.items or len(data.items) == 0:
        raise HTTPException(status_code=400, detail="Cart is empty")
    doc = data.model_dump()
    doc["status"] = "pending"
    doc["order_number"] = f"CB-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    # Auto-link to registered user: priority — logged in > matching email > matching phone
    linked_email = None
    if user:
        linked_email = user["email"]
    elif data.email:
        existing = await db.users.find_one({"email": data.email}, {"_id": 0, "email": 1})
        if existing:
            linked_email = existing["email"]
    doc["user_email"] = linked_email or (data.email or None)
    doc["guest_phone"] = data.phone  # store for future phone-based linking
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.orders.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    # Increment total_sold for each item
    for item in data.items:
        if ObjectId.is_valid(item.product_id):
            await db.products.update_one(
                {"_id": ObjectId(item.product_id)},
                {"$inc": {"total_sold": item.quantity}}
            )
    return doc


@api_router.post("/orders/link-guest")
async def link_guest_orders(data: LinkGuestOrders, user=Depends(get_required_user)):
    """Claim previously-placed guest orders for the logged-in user by order_number."""
    if not data.order_numbers:
        return {"linked": 0}
    result = await db.orders.update_many(
        {"order_number": {"$in": data.order_numbers},
         "$or": [{"user_email": None}, {"user_email": {"$exists": False}}, {"user_email": user["email"]}]},
        {"$set": {"user_email": user["email"], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"linked": result.modified_count}


@api_router.get("/orders/track/{order_number}")
async def track_order(order_number: str):
    """Public guest tracking by order number only."""
    order = await db.orders.find_one({"order_number": order_number})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return doc_to_dict(order)


@api_router.get("/orders/my")
async def my_orders(user=Depends(get_required_user)):
    """Logged-in users see their order history by email."""
    orders = await db.orders.find({"user_email": user["email"]}).sort("created_at", -1).to_list(500)
    return [doc_to_dict(o) for o in orders]


@api_router.get("/admin/orders")
async def get_orders(current_admin=Depends(get_admin_user)):
    orders = await db.orders.find({}).sort("created_at", -1).to_list(1000)
    return [doc_to_dict(o) for o in orders]


@api_router.put("/admin/orders/{order_id}")
async def update_order(order_id: str, data: OrderStatusUpdate, current_admin=Depends(get_admin_user)):
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")
    result = await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    updated = await db.orders.find_one({"_id": ObjectId(order_id)})
    return doc_to_dict(updated)


@api_router.delete("/admin/orders/{order_id}")
async def delete_order(order_id: str, current_admin=Depends(get_admin_user)):
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")
    result = await db.orders.delete_one({"_id": ObjectId(order_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted"}


# ---- Reviews ----

@api_router.get("/reviews/{product_id}")
async def get_product_reviews(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id, "is_approved": True}).sort("created_at", -1).to_list(100)
    return [doc_to_dict(r) for r in reviews]


@api_router.post("/reviews")
async def create_review(data: ReviewCreate, user=Depends(get_required_user)):
    """Only Google-logged-in users can submit reviews."""
    if len(data.images) > 3:
        raise HTTPException(status_code=400, detail="Max 3 images allowed")
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    doc = {
        "product_id": data.product_id,
        "reviewer_name": user.get("name") or user.get("email", "User"),
        "user_email": user["email"],
        "rating": data.rating,
        "comment": data.comment,
        "images": data.images,
        "verified_purchase": False,
        "is_approved": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.reviews.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.get("/admin/reviews")
async def get_all_reviews(current_admin=Depends(get_admin_user)):
    reviews = await db.reviews.find({}).sort("created_at", -1).to_list(1000)
    return [doc_to_dict(r) for r in reviews]


@api_router.post("/admin/reviews")
async def admin_create_review(data: AdminReviewCreate, current_admin=Depends(get_admin_user)):
    doc = data.model_dump()
    if len(doc.get("images", [])) > 3:
        raise HTTPException(status_code=400, detail="Max 3 images allowed")
    if not doc.get("created_at"):
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.reviews.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/reviews/{review_id}")
async def update_review(review_id: str, data: AdminReviewCreate, current_admin=Depends(get_admin_user)):
    if not ObjectId.is_valid(review_id):
        raise HTTPException(status_code=400, detail="Invalid review ID")
    update_data = data.model_dump()
    if len(update_data.get("images", [])) > 3:
        raise HTTPException(status_code=400, detail="Max 3 images allowed")
    # Allow admin to keep existing date if not provided
    if not update_data.get("created_at"):
        update_data.pop("created_at", None)
    result = await db.reviews.update_one({"_id": ObjectId(review_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    updated = await db.reviews.find_one({"_id": ObjectId(review_id)})
    return doc_to_dict(updated)


@api_router.delete("/admin/reviews/{review_id}")
async def delete_review(review_id: str, current_admin=Depends(get_admin_user)):
    if not ObjectId.is_valid(review_id):
        raise HTTPException(status_code=400, detail="Invalid review ID")
    result = await db.reviews.delete_one({"_id": ObjectId(review_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted"}


@api_router.put("/admin/reviews/{review_id}/toggle")
async def toggle_review_approval(review_id: str, current_admin=Depends(get_admin_user)):
    if not ObjectId.is_valid(review_id):
        raise HTTPException(status_code=400, detail="Invalid review ID")
    review = await db.reviews.find_one({"_id": ObjectId(review_id)})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    new_status = not review.get("is_approved", True)
    await db.reviews.update_one({"_id": ObjectId(review_id)}, {"$set": {"is_approved": new_status}})
    review["is_approved"] = new_status
    return doc_to_dict(review)


# ---- Site Settings ----

@api_router.get("/site-settings")
async def get_site_settings():
    doc = await db.site_settings.find_one({"key": "main"}, {"_id": 0, "key": 0})
    return doc or DEFAULT_SITE_SETTINGS


@api_router.put("/admin/site-settings")
async def update_site_settings(data: SiteSettingsUpdate, current_admin=Depends(get_admin_user)):
    # Whitelist keys to the known DEFAULT_SITE_SETTINGS keys
    safe = {k: v for k, v in data.settings.items() if k in DEFAULT_SITE_SETTINGS}
    await db.site_settings.update_one({"key": "main"}, {"$set": safe}, upsert=True)
    doc = await db.site_settings.find_one({"key": "main"}, {"_id": 0, "key": 0})
    return doc


@api_router.put("/admin/testimonials")
async def update_testimonials(data: TestimonialsBulkUpdate, current_admin=Depends(get_admin_user)):
    """Replace the entire testimonials list (simple bulk-edit model)."""
    items = [t.model_dump() for t in data.testimonials]
    await db.site_settings.update_one(
        {"key": "main"},
        {"$set": {"featured_testimonials": items}},
        upsert=True,
    )
    return {"featured_testimonials": items}


# ---- Admin Stats ----

@api_router.get("/admin/stats")
async def get_admin_stats(current_admin=Depends(get_admin_user)):
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    total_products = await db.products.count_documents({})
    total_reviews = await db.reviews.count_documents({})
    all_orders = await db.orders.find({}, {"total_price": 1}).to_list(10000)
    total_revenue = sum(o.get("total_price", 0) for o in all_orders)
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_products": total_products,
        "total_reviews": total_reviews,
        "total_revenue": total_revenue
    }


app.include_router(api_router)

# Note: when allow_credentials=True we cannot use "*" for origins.
# Allow all via regex which still permits credentials with all origins.
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
