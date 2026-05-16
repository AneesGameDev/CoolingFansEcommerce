from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid

ROOT_DIR = Path(__file__).parent

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'coolbreeze_secret_2024')
JWT_ALGORITHM = "HS256"
WHATSAPP_NUMBER = os.environ.get('WHATSAPP_NUMBER', '923000000000')

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


# ---- Models ----

class AdminLogin(BaseModel):
    email: str
    password: str


class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    discounted_price: float
    category: str = "fan"
    images: List[str] = []
    video_url: Optional[str] = None
    colors: List[str] = []
    sizes: List[str] = []
    stock: int = 100
    battery_life: Optional[str] = None
    features: List[str] = []
    is_active: bool = True


class ProductUpdate(ProductCreate):
    pass


class OrderCreate(BaseModel):
    customer_name: str
    phone: str
    whatsapp: str
    email: Optional[str] = None
    address: str
    city: str
    province: str
    product_id: str
    product_name: str
    product_image: str
    quantity: int = 1
    selected_color: Optional[str] = None
    selected_size: Optional[str] = None
    unit_price: float
    total_price: float
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str


class ReviewCreate(BaseModel):
    product_id: str
    reviewer_name: str
    rating: int
    comment: str
    images: List[str] = []
    verified_purchase: bool = False


class ReviewUpdate(ReviewCreate):
    is_approved: bool = True


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
        "video_url": None, "colors": ["White", "Black", "Pink", "Blue"], "sizes": [],
        "stock": 150, "battery_life": "8-10 hours",
        "features": ["Bladeless Design", "3 Speed Settings", "USB-C Charging", "Ultra Quiet <35dB", "360° Airflow"],
        "is_active": True, "order_count": 0
    },
    {
        "name": "Baby Stroller Clip Fan",
        "description": "Whisper-quiet clip fan designed for baby strollers, cribs, and car seats. Safe protective grill design with 360° rotation. Keeps your baby cool all summer long.",
        "price": 2499, "discounted_price": 899, "category": "baby-fan",
        "images": ["https://images.unsplash.com/photo-1566441699339-0c7bac167c58?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
        "video_url": None, "colors": ["White", "Blue", "Pink"], "sizes": [],
        "stock": 200, "battery_life": "12 hours",
        "features": ["Baby Safe Design", "Super Quiet", "360° Rotation", "Strong Clip", "USB-C Powered"],
        "is_active": True, "order_count": 0
    },
    {
        "name": "USB Mini Desk Fan",
        "description": "Compact yet powerful USB desk fan with 5 wind speed settings. Flexible 360° tilt design. Ideal for home office, study table, and bedside. Extremely quiet for night use.",
        "price": 3299, "discounted_price": 1799, "category": "desk-fan",
        "images": ["https://images.unsplash.com/photo-1618941716939-553df3c6c278?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
        "video_url": None, "colors": ["White", "Black", "Blue"], "sizes": ["4-inch", "6-inch"],
        "stock": 120, "battery_life": "USB Powered",
        "features": ["5 Speed Settings", "360° Tilt", "Quiet Operation", "USB Powered", "Compact Design"],
        "is_active": True, "order_count": 0
    },
    {
        "name": "Foldable Handheld Fan",
        "description": "Ultra-portable foldable mini fan that fits in your pocket or bag. Built-in 2000mAh battery with USB charging. 3 speed settings for personal cooling on the go. Perfect travel companion.",
        "price": 1999, "discounted_price": 799, "category": "handheld-fan",
        "images": ["https://images.unsplash.com/photo-1718815416565-c65944a5ec14?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
        "video_url": None, "colors": ["Pink", "White", "Black", "Gold"], "sizes": [],
        "stock": 300, "battery_life": "4-6 hours",
        "features": ["Foldable Design", "Pocket Size", "3 Speed Settings", "2000mAh Battery", "USB-C Charging"],
        "is_active": True, "order_count": 0
    },
    {
        "name": "Bladeless Neck Fan - Turbo",
        "description": "Premium bladeless wearable neck fan with powerful turbo airflow. 4000mAh long-lasting battery, ergonomic lightweight design. Whisper-quiet even at max speed. Best seller for outdoor use.",
        "price": 6999, "discounted_price": 3499, "category": "neck-fan",
        "images": [
            "https://images.unsplash.com/photo-1776183422641-5dc7d7ab7d95?crop=entropy&cs=srgb&fm=jpg&w=500&q=80",
            "https://images.unsplash.com/photo-1657537488218-f7eb744c5b0b?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"
        ],
        "video_url": None, "colors": ["White", "Black", "Sky Blue"], "sizes": [],
        "stock": 80, "battery_life": "10-12 hours",
        "features": ["Turbo Mode", "4000mAh Battery", "4 Speed Settings", "USB-C Fast Charge", "Ergonomic Design"],
        "is_active": True, "order_count": 0
    },
    {
        "name": "Baby Night Cooling Fan",
        "description": "Ultra-silent baby room fan with built-in soft ambient night light. Whisper mode produces less than 25dB noise. Safety certified with fully enclosed blade guard. Perfect for peaceful baby sleep.",
        "price": 3999, "discounted_price": 2199, "category": "baby-fan",
        "images": ["https://images.unsplash.com/photo-1564510182791-29645da7fac4?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
        "video_url": None, "colors": ["White", "Pink"], "sizes": [],
        "stock": 100, "battery_life": "USB Powered",
        "features": ["<25dB Whisper Mode", "Night Light", "Baby Safe", "3 Wind Speeds", "Timer Function"],
        "is_active": True, "order_count": 0
    },
    {
        "name": "10000mAh Travel Fan",
        "description": "High-capacity rechargeable fan with massive 10000mAh power bank. Charges your phone AND cools you simultaneously! 4 speed settings with turbo mode. Ideal for travel and load-shedding.",
        "price": 8999, "discounted_price": 4499, "category": "travel-fan",
        "images": ["https://images.unsplash.com/photo-1523437345381-db5ee4df9c04?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
        "video_url": None, "colors": ["Black", "Blue", "White"], "sizes": [],
        "stock": 60, "battery_life": "16-20 hours",
        "features": ["10000mAh Battery", "Phone Charger", "Turbo Mode", "4 Speeds", "LED Battery Display"],
        "is_active": True, "order_count": 0
    },
    {
        "name": "Car Dashboard USB Fan",
        "description": "Powerful flexible neck car fan for dashboard use. Connects directly to car USB port. 360° adjustable neck design with silent motor. Keeps you cool while driving.",
        "price": 2999, "discounted_price": 1299, "category": "car-fan",
        "images": ["https://images.unsplash.com/photo-1565151443833-29bf2ba5dd8d?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
        "video_url": None, "colors": ["Black", "Silver", "White"], "sizes": [],
        "stock": 180, "battery_life": "Car USB Powered",
        "features": ["360° Flexible Neck", "Silent Motor", "2 Speed Settings", "Plug & Play", "Universal USB"],
        "is_active": True, "order_count": 0
    },
    {
        "name": "Mini Tower Fan (5 Speeds)",
        "description": "Sleek portable tower-style fan with oscillation feature. 5 wind speeds with 2-hour auto-off timer. Built-in 6000mAh battery. Modern design for bedroom, living room, or office desk.",
        "price": 9999, "discounted_price": 5499, "category": "tower-fan",
        "images": [
            "https://images.unsplash.com/photo-1618941716939-553df3c6c278?crop=entropy&cs=srgb&fm=jpg&w=500&q=80",
            "https://images.unsplash.com/photo-1566441699339-0c7bac167c58?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"
        ],
        "video_url": None, "colors": ["White", "Gray"], "sizes": ["12-inch", "18-inch"],
        "stock": 40, "battery_life": "8-15 hours",
        "features": ["Oscillation", "5 Speed Settings", "Sleep Timer", "6000mAh Battery", "Touch Controls"],
        "is_active": True, "order_count": 0
    },
    {
        "name": "Kids Cute Mini Fan",
        "description": "Adorable mini fan designed specially for children. Extra-safe soft blades with full protective cover. Lightweight and easy to hold. USB charging with 1500mAh battery. Perfect summer gift for kids!",
        "price": 1499, "discounted_price": 599, "category": "kids-fan",
        "images": ["https://images.unsplash.com/photo-1718815416565-c65944a5ec14?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
        "video_url": None, "colors": ["Pink", "Blue", "Yellow", "Green"], "sizes": [],
        "stock": 250, "battery_life": "3-5 hours",
        "features": ["Safe Soft Blades", "Cute Design", "Lightweight", "1500mAh Battery", "Multiple Colors"],
        "is_active": True, "order_count": 0
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
    await db.reviews.create_index("product_id")
    await db.admins.create_index("email", unique=True)

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


# ---- Admin Auth ----

@api_router.post("/admin/login")
async def admin_login(data: AdminLogin):
    admin = await db.admins.find_one({"email": data.email})
    if not admin or not verify_password(data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(admin["email"])
    return {"token": token, "email": admin["email"], "name": admin.get("name", "Admin")}


@api_router.get("/admin/me")
async def admin_me(current_admin=Depends(get_admin_user)):
    return {"email": current_admin["email"], "role": "admin"}


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
    doc["order_count"] = 0
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
async def create_order(data: OrderCreate):
    doc = data.model_dump()
    doc["status"] = "pending"
    doc["order_number"] = f"CB-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.orders.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    if ObjectId.is_valid(data.product_id):
        await db.products.update_one({"_id": ObjectId(data.product_id)}, {"$inc": {"order_count": 1}})
    return doc


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
async def create_review(data: ReviewCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["is_approved"] = True
    result = await db.reviews.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.get("/admin/reviews")
async def get_all_reviews(current_admin=Depends(get_admin_user)):
    reviews = await db.reviews.find({}).sort("created_at", -1).to_list(1000)
    return [doc_to_dict(r) for r in reviews]


@api_router.post("/admin/reviews")
async def admin_create_review(data: ReviewUpdate, current_admin=Depends(get_admin_user)):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.reviews.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/reviews/{review_id}")
async def update_review(review_id: str, data: ReviewUpdate, current_admin=Depends(get_admin_user)):
    if not ObjectId.is_valid(review_id):
        raise HTTPException(status_code=400, detail="Invalid review ID")
    update_data = data.model_dump()
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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
