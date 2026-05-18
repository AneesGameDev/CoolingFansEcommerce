from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request, Response, Cookie
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
import os
import logging
import bcrypt
import jwt
import asyncio
import resend
import secrets
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid

# ---- Twilio (optional — only active when credentials are set) ----
try:
    from twilio.rest import Client as TwilioClient
    from twilio.twiml.messaging_response import MessagingResponse
    _twilio_available = True
except ImportError:
    _twilio_available = False

ROOT_DIR = Path(__file__).parent

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'ohomart_secret_2024')
JWT_ALGORITHM = "HS256"
WHATSAPP_NUMBER = os.environ.get('WHATSAPP_NUMBER', '923000000000')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@ohomart.online')
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
COOKIE_DOMAIN = os.environ.get('COOKIE_DOMAIN', '')
ADMIN_EMAILS = [
    e.strip().lower() for e in os.environ.get('ADMIN_EMAILS', '').split(',') if e.strip()
]
DEFAULT_ADMIN_PASSWORD = os.environ.get('DEFAULT_ADMIN_PASSWORD', 'change-me')
CORS_ORIGINS = [
    o.strip() for o in os.environ.get('CORS_ORIGINS', 'https://ohomart.online,https://www.ohomart.online').split(',') if o.strip()
]

# ---- Twilio config ----
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_WHATSAPP_FROM = os.environ.get('TWILIO_WHATSAPP_FROM', '')
ADMIN_WHATSAPP_NOTIFY = os.environ.get('ADMIN_WHATSAPP_NOTIFY', '')
WHATSAPP_AUTO_REPLY = os.environ.get(
    'WHATSAPP_AUTO_REPLY',
    'Hello! Thank you for contacting OHo Mart. We received your message and will reply shortly. Visit https://ohomart.online to browse our fans. Our team is available 9am-9pm PKT.'
)

_twilio_client = None
if _twilio_available and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        _twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception as _e:
        logging.warning(f"Twilio client init failed: {_e}")

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


def create_access_token(email: str, role: str = "admin") -> str:
    payload = {"email": email, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=24)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_jwt(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


async def is_admin_user(email: str) -> bool:
    if not email:
        return False
    doc = await db.admin_users.find_one({"email": email.lower(), "is_active": True}, {"_id": 0, "email": 1})
    return doc is not None


async def get_admin_user(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif session_token:
        token = session_token
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = _decode_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    # Verify still active in DB
    if not await is_admin_user(payload.get("email", "")):
        raise HTTPException(status_code=403, detail="Admin access revoked")
    return payload


def doc_to_dict(d):
    if d and "_id" in d:
        d["id"] = str(d.pop("_id"))
    return d


# ---- User Auth Helpers (Google ID token via JWT cookie) ----

async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    """Returns the logged-in user or None. Decodes our own JWT cookie/header."""
    token = None
    if session_token:
        token = session_token
    elif authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    if not token:
        return None
    payload = _decode_jwt(token)
    if not payload:
        return None
    email = (payload.get("email") or "").lower()
    if not email:
        return None
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        return None
    user["is_admin"] = await is_admin_user(email)
    return user


async def get_required_user(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    return user


def _set_session_cookie(response: Response, token: str):
    kwargs = dict(
        key="session_token",
        value=token,
        max_age=24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )
    if COOKIE_DOMAIN:
        kwargs["domain"] = COOKIE_DOMAIN
    response.set_cookie(**kwargs)


def _clear_session_cookie(response: Response):
    kwargs = dict(key="session_token", path="/")
    if COOKIE_DOMAIN:
        kwargs["domain"] = COOKIE_DOMAIN
    response.delete_cookie(**kwargs)


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


class GoogleAuthCredential(BaseModel):
    credential: str


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class AdminUserPatch(BaseModel):
    password: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None


# ---- Default Site Settings ----

DEFAULT_SITE_SETTINGS = {
    "brand_name": "OHo Mart",
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
    "why_buy_title": "Why Pakistan Trusts OHo Mart",
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
    "founder_name": "Team OHo Mart",
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
        {"name": "Hira M.", "city": "Islamabad", "rating": 5, "quote": "I was scared to order COD online. But OHo Mart delivered in 2 days, packaging was premium, fan works perfectly.", "avatar": "https://i.pravatar.cc/100?img=32"}
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
    # Indexes
    await db.products.create_index("is_active")
    try:
        await db.products.create_index("slug", unique=True, sparse=True)
    except Exception as e:
        logger.warning(f"products.slug index: {e}")
    await db.orders.create_index("created_at")
    await db.orders.create_index("order_number", unique=True)
    await db.orders.create_index("user_email")
    await db.reviews.create_index("product_id")
    await db.admins.create_index("email", unique=True)
    await db.admin_users.create_index("email", unique=True)
    await db.users.create_index("email", unique=True)

    # Seed admin_users if empty (idempotent)
    if await db.admin_users.count_documents({}) == 0 and ADMIN_EMAILS:
        for email in ADMIN_EMAILS:
            await db.admin_users.insert_one({
                "email": email,
                "password_hash": hash_password(DEFAULT_ADMIN_PASSWORD),
                "name": email.split("@")[0].title(),
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system_seed",
            })
        logger.info(f"Seeded {len(ADMIN_EMAILS)} admin_users")

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
        await db.site_settings.insert_one({
            "key": "main",
            "brand": "OHo Mart",
            "currency": "PKR",
            "whatsapp": WHATSAPP_NUMBER,
            **DEFAULT_SITE_SETTINGS,
        })
        logger.info("Seeded default site settings")
    else:
        # Backfill any missing default keys
        missing = {k: v for k, v in DEFAULT_SITE_SETTINGS.items() if k not in existing_settings}
        if missing:
            await db.site_settings.update_one({"key": "main"}, {"$set": missing})

    logger.info("OHo Mart backend ready.")


# ---- Google Auth (Google Identity Services — independent) ----

@api_router.post("/auth/google")
async def auth_google(data: GoogleAuthCredential, response: Response):
    """Verify Google ID token, upsert user, issue our JWT cookie."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google auth not configured")
    try:
        idinfo = await asyncio.to_thread(
            google_id_token.verify_oauth2_token,
            data.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    email = (idinfo.get("email") or "").lower()
    if not email or not idinfo.get("email_verified", False):
        raise HTTPException(status_code=401, detail="Email not verified by Google")

    name = idinfo.get("name", "")
    picture = idinfo.get("picture", "")
    now = datetime.now(timezone.utc)

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture, "last_login_at": now.isoformat()}},
        )
        user_id = existing.get("user_id") or f"user_{uuid.uuid4().hex[:12]}"
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "provider": "google",
            "created_at": now.isoformat(),
            "last_login_at": now.isoformat(),
        })

    admin_flag = await is_admin_user(email)
    token = create_access_token(email, role="admin" if admin_flag else "user")
    _set_session_cookie(response, token)

    return {
        "id": user_id,
        "email": email,
        "name": name,
        "picture": picture,
        "is_admin": admin_flag,
    }


@api_router.get("/auth/me")
async def auth_me(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "user_id": user.get("user_id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture"),
        "is_admin": bool(user.get("is_admin")),
    }


@api_router.post("/auth/logout")
async def auth_logout(response: Response):
    _clear_session_cookie(response)
    return {"message": "Logged out"}


# ---- Admin Auth (email + password against admin_users) ----

@api_router.post("/admin/login")
async def admin_login(data: AdminLogin):
    email = data.email.strip().lower()
    admin = await db.admin_users.find_one({"email": email, "is_active": True})
    if not admin or not verify_password(data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(admin["email"])
    return {"token": token, "email": admin["email"], "name": admin.get("name", "Admin")}


@api_router.get("/admin/me")
async def admin_me(current_admin=Depends(get_admin_user)):
    return {"email": current_admin["email"], "role": "admin"}


@api_router.get("/admin/check-access")
async def admin_check_access(user=Depends(get_required_user)):
    """Returns whether the currently-signed-in user is an authorized admin."""
    email = (user.get("email") or "").lower()
    return {"is_admin": await is_admin_user(email), "email": email}


# ---- Admin Users CRUD ----

@api_router.get("/admin/admins")
async def list_admins(current_admin=Depends(get_admin_user)):
    docs = await db.admin_users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return docs


@api_router.post("/admin/admins")
async def create_admin(data: AdminUserCreate, current_admin=Depends(get_admin_user)):
    email = data.email.lower()
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    existing = await db.admin_users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists")
    doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name or email.split("@")[0].title(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_admin.get("email"),
    }
    await db.admin_users.insert_one(doc)
    doc.pop("password_hash", None)
    return doc


@api_router.patch("/admin/admins/{email}")
async def update_admin(email: str, data: AdminUserPatch, current_admin=Depends(get_admin_user)):
    email = email.lower()
    target = await db.admin_users.find_one({"email": email})
    if not target:
        raise HTTPException(status_code=404, detail="Admin not found")
    update = {}
    if data.password is not None:
        if len(data.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        update["password_hash"] = hash_password(data.password)
    if data.name is not None:
        update["name"] = data.name
    if data.is_active is not None:
        if not data.is_active and target.get("is_active"):
            active_count = await db.admin_users.count_documents({"is_active": True})
            if active_count <= 1:
                raise HTTPException(status_code=400, detail="Cannot deactivate the last active admin")
        update["is_active"] = data.is_active
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.admin_users.update_one({"email": email}, {"$set": update})
    doc = await db.admin_users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    return doc


@api_router.delete("/admin/admins/{email}")
async def delete_admin(email: str, current_admin=Depends(get_admin_user)):
    email = email.lower()
    target = await db.admin_users.find_one({"email": email})
    if not target:
        raise HTTPException(status_code=404, detail="Admin not found")
    if target.get("is_active"):
        active_count = await db.admin_users.count_documents({"is_active": True})
        if active_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last active admin")
    await db.admin_users.delete_one({"email": email})
    return {"message": "Admin deleted"}


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


# ---- WhatsApp Helpers ----

def _send_whatsapp(to: str, body: str) -> Optional[str]:
    """Send a WhatsApp message via Twilio. Returns message SID or None."""
    if not _twilio_client:
        logger.warning("Twilio not configured — skipping WhatsApp send")
        return None
    if not to or not TWILIO_WHATSAPP_FROM:
        return None
    # Ensure whatsapp: prefix
    to_wa = to if to.startswith("whatsapp:") else f"whatsapp:{to}"
    from_wa = TWILIO_WHATSAPP_FROM if TWILIO_WHATSAPP_FROM.startswith("whatsapp:") else f"whatsapp:{TWILIO_WHATSAPP_FROM}"
    try:
        msg = _twilio_client.messages.create(body=body, from_=from_wa, to=to_wa)
        logger.info(f"WhatsApp sent to {to_wa}: SID={msg.sid}")
        return msg.sid
    except Exception as e:
        logger.error(f"WhatsApp send failed: {e}")
        return None


async def _notify_admin_new_order(order: dict):
    """Build a rich order notification and send to admin WhatsApp."""
    if not ADMIN_WHATSAPP_NOTIFY:
        return
    items_text = ""
    for it in (order.get("items") or []):
        color_info = f" [{it.get('selected_color')}]" if it.get("selected_color") else ""
        size_info = f" [{it.get('selected_size')}]" if it.get("selected_size") else ""
        items_text += f"  • {it.get('product_name','?')} x{it.get('quantity',1)}{color_info}{size_info} — Rs.{it.get('line_total',0):,.0f}\n"

    msg = (
        f"*NEW ORDER — OHo Mart*\n"
        f"Order: {order.get('order_number','')}\n"
        f"Customer: {order.get('customer_name','')}\n"
        f"Phone: {order.get('phone','')}\n"
        f"City: {order.get('city','')}{', '+order['province'] if order.get('province') else ''}\n"
        f"Address: {order.get('address','')}\n\n"
        f"Items:\n{items_text}"
        f"*Total: Rs.{order.get('total_price',0):,.0f}*\n"
        f"Payment: Cash on Delivery\n"
        f"Time: {datetime.now(timezone.utc).strftime('%d %b %Y, %I:%M %p UTC')}"
    )
    if order.get("notes"):
        msg += f"\nNotes: {order['notes']}"
    await asyncio.to_thread(_send_whatsapp, ADMIN_WHATSAPP_NOTIFY, msg)


@api_router.post("/admin/forgot-password")
async def admin_forgot_password(data: AdminForgotPassword):
    """Send a 6-digit reset code to the admin's email. Always returns success to prevent enumeration."""
    email = data.email.strip().lower()
    admin = await db.admin_users.find_one({"email": email, "is_active": True})
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
            <h1 style="margin: 0; font-size: 22px;">OHo Mart — Admin Reset</h1>
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
        result = await _send_email_async(email, "OHo Mart Admin Password Reset Code", html)
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
    result = await db.admin_users.update_one(
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
    # Send WhatsApp notification to admin (non-blocking)
    asyncio.create_task(_notify_admin_new_order(doc))
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


# ---- Health Check ----

@api_router.get("/health")
async def health_check():
    """Liveness + DB ping. Used by load balancers, Docker healthcheck, hosting platforms."""
    try:
        await client.admin.command("ping")
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {e}"
    return {
        "service": "ohomart-backend",
        "status": "ok" if db_status == "ok" else "degraded",
        "db": db_status,
    }


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


# ---- WhatsApp Webhook (inbound messages → auto-reply) ----

@api_router.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    """
    Twilio webhook for incoming WhatsApp messages.
    Configure in Twilio Console:
      Sandbox/Phone → 'A message comes in' → Webhook:
      https://ohomart.online/api/whatsapp/webhook  (HTTP POST)
    """
    try:
        form = await request.form()
        sender = form.get("From", "")
        body_text = form.get("Body", "")
        logger.info(f"Inbound WhatsApp from {sender}: {body_text[:80]}")
        # Store for admin visibility
        await db.whatsapp_messages.insert_one({
            "direction": "inbound",
            "from": sender,
            "body": body_text,
            "twilio_sid": form.get("MessageSid", ""),
            "received_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.error(f"WhatsApp webhook DB error: {e}")

    reply_text = WHATSAPP_AUTO_REPLY
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Response>'
        f'<Message>{reply_text}</Message>'
        '</Response>'
    )
    return Response(content=xml, media_type="application/xml")


@api_router.get("/admin/whatsapp-messages")
async def get_whatsapp_messages(current_admin=Depends(get_admin_user)):
    """Admin: view all inbound WhatsApp messages."""
    msgs = await db.whatsapp_messages.find({"direction": "inbound"}).sort("received_at", -1).to_list(500)
    return [doc_to_dict(m) for m in msgs]


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
