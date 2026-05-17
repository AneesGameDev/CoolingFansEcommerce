"""
OHo Mart Backend Tests
Covers: Google auth, reviews (auth-gated), multi-item orders,
public tracking, my-orders, color_variants, video_url, total_sold, admin CRUD.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ohomart.online").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@ohomart.pk"
ADMIN_PASSWORD = "Admin@123"
TEST_SESSION = "test_session_fixed_abc123"
TEST_USER_EMAIL = "test.reviewer@ohomart.pk"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def user_headers():
    return {"Authorization": f"Bearer {TEST_SESSION}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def products():
    r = requests.get(f"{API}/products", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 10
    return data


# ---------- Auth ----------
class TestAuth:
    def test_session_with_fake_id_returns_401(self):
        r = requests.post(f"{API}/auth/session", json={"session_id": "totally-fake-id-xyz"}, timeout=20)
        assert r.status_code in (401, 502), r.text

    def test_auth_me_with_bearer(self, user_headers):
        r = requests.get(f"{API}/auth/me", headers=user_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == TEST_USER_EMAIL
        assert data["name"] == "Test Reviewer"
        assert "user_id" in data

    def test_auth_me_no_auth_returns_401(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_auth_me_with_cookie(self):
        r = requests.get(f"{API}/auth/me", cookies={"session_token": TEST_SESSION}, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == TEST_USER_EMAIL


# ---------- Products ----------
class TestProducts:
    def test_products_have_required_fields(self, products):
        for p in products:
            for field in ["id", "name", "price", "discounted_price", "color_variants", "video_url", "total_sold"]:
                assert field in p, f"missing {field} in product {p.get('name')}"

    def test_products_count_at_least_10(self, products):
        assert len(products) >= 10


# ---------- Reviews ----------
class TestReviews:
    def test_create_review_unauth_401(self, products):
        pid = products[0]["id"]
        r = requests.post(f"{API}/reviews", json={"product_id": pid, "rating": 5, "comment": "x", "images": []}, timeout=15)
        assert r.status_code == 401

    def test_create_review_authed(self, products, user_headers):
        pid = products[0]["id"]
        payload = {"product_id": pid, "rating": 5, "comment": "TEST_review_authed", "images": []}
        r = requests.post(f"{API}/reviews", headers=user_headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["rating"] == 5
        assert data["product_id"] == pid
        assert data["user_email"] == TEST_USER_EMAIL
        # Verify it shows up in GET /reviews/{pid}
        r2 = requests.get(f"{API}/reviews/{pid}", timeout=15)
        assert r2.status_code == 200
        assert any(rv.get("comment") == "TEST_review_authed" for rv in r2.json())

    def test_create_review_rejects_more_than_3_images(self, products, user_headers):
        pid = products[0]["id"]
        imgs = ["data:image/png;base64,AAAA"] * 4
        r = requests.post(f"{API}/reviews", headers=user_headers,
                          json={"product_id": pid, "rating": 4, "comment": "too many", "images": imgs}, timeout=15)
        assert r.status_code == 400

    def test_create_review_invalid_rating(self, products, user_headers):
        pid = products[0]["id"]
        r = requests.post(f"{API}/reviews", headers=user_headers,
                          json={"product_id": pid, "rating": 7, "comment": "bad", "images": []}, timeout=15)
        assert r.status_code == 400


# ---------- Orders ----------
class TestOrders:
    def _payload(self, products, qty=2):
        p = products[0]
        return {
            "customer_name": "TEST_Customer",
            "phone": "03001234567",
            "whatsapp": "03001234567",
            "address": "TEST address line",
            "city": "Karachi",
            "province": "Sindh",
            "items": [{
                "product_id": p["id"],
                "product_name": p["name"],
                "product_image": (p.get("images") or [""])[0],
                "quantity": qty,
                "unit_price": p["discounted_price"],
                "line_total": p["discounted_price"] * qty,
            }],
            "total_price": p["discounted_price"] * qty,
        }

    def test_create_multi_item_order_guest(self, products):
        payload = self._payload(products, qty=2)
        # add second item
        p2 = products[1]
        payload["items"].append({
            "product_id": p2["id"],
            "product_name": p2["name"],
            "product_image": (p2.get("images") or [""])[0],
            "quantity": 1,
            "unit_price": p2["discounted_price"],
            "line_total": p2["discounted_price"],
        })
        payload["total_price"] += p2["discounted_price"]

        # Capture before count
        before = requests.get(f"{API}/products", timeout=15).json()
        before_sold = {p["id"]: p["total_sold"] for p in before}

        r = requests.post(f"{API}/orders", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["order_number"].startswith("CB-")
        parts = data["order_number"].split("-")
        assert len(parts) == 3 and len(parts[1]) == 8 and len(parts[2]) == 8
        assert len(data["items"]) == 2
        pytest.order_number = data["order_number"]

        # Verify total_sold incremented
        after = requests.get(f"{API}/products", timeout=15).json()
        after_sold = {p["id"]: p["total_sold"] for p in after}
        assert after_sold[products[0]["id"]] == before_sold[products[0]["id"]] + 2
        assert after_sold[products[1]["id"]] == before_sold[products[1]["id"]] + 1

    def test_track_order_public(self, products):
        order_num = getattr(pytest, "order_number", None)
        assert order_num
        r = requests.get(f"{API}/orders/track/{order_num}", timeout=15)
        assert r.status_code == 200
        assert r.json()["order_number"] == order_num

    def test_track_order_unknown_404(self):
        r = requests.get(f"{API}/orders/track/CB-99999999-NOTREAL1", timeout=15)
        assert r.status_code == 404

    def test_my_orders_requires_auth(self):
        r = requests.get(f"{API}/orders/my", timeout=15)
        assert r.status_code == 401

    def test_my_orders_authed(self, products, user_headers):
        # Create an authed order
        payload = self._payload(products, qty=1)
        r = requests.post(f"{API}/orders", headers=user_headers, json=payload, timeout=15)
        assert r.status_code == 200
        order_num = r.json()["order_number"]

        r2 = requests.get(f"{API}/orders/my", headers=user_headers, timeout=15)
        assert r2.status_code == 200
        orders = r2.json()
        assert any(o["order_number"] == order_num for o in orders)
        assert all(o["user_email"] == TEST_USER_EMAIL for o in orders)


# ---------- Admin Color Variants ----------
class TestAdminColorVariants:
    def test_create_product_with_color_variants(self, admin_headers):
        payload = {
            "name": "TEST_Variant_Product",
            "description": "test",
            "price": 1000,
            "discounted_price": 500,
            "category": "neck-fan",
            "images": ["https://example.com/x.jpg"],
            "video_url": "https://example.com/v.mp4",
            "color_variants": [
                {"name": "Red", "hex": "#FF0000", "image_url": "https://example.com/red.jpg"},
                {"name": "Blue", "hex": "#0000FF", "image_url": "https://example.com/blue.jpg"},
            ],
            "stock": 10,
            "total_sold": 0,
        }
        r = requests.post(f"{API}/products", headers=admin_headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        pid = data["id"]
        assert len(data["color_variants"]) == 2
        assert data["color_variants"][0]["name"] == "Red"
        assert data["video_url"] == "https://example.com/v.mp4"

        # GET to verify persistence
        r2 = requests.get(f"{API}/products/{pid}", timeout=15)
        assert r2.status_code == 200
        cv = r2.json()["color_variants"]
        assert len(cv) == 2
        assert cv[1]["image_url"] == "https://example.com/blue.jpg"

        # Cleanup
        requests.delete(f"{API}/products/{pid}", headers=admin_headers, timeout=15)


# ---------- Admin Review with Base64 Images ----------
class TestAdminReview:
    def test_admin_create_review_with_base64(self, admin_headers, products):
        pid = products[0]["id"]
        b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        payload = {
            "product_id": pid,
            "reviewer_name": "TEST_Admin_Reviewer",
            "rating": 4,
            "comment": "TEST_admin_review_b64",
            "images": [b64, b64],
            "verified_purchase": True,
            "is_approved": True,
        }
        r = requests.post(f"{API}/admin/reviews", headers=admin_headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data["images"]) == 2
        assert data["images"][0].startswith("data:image/png;base64,")
        rid = data["id"]
        # Cleanup
        requests.delete(f"{API}/admin/reviews/{rid}", headers=admin_headers, timeout=15)


# ---------- Admin Other Endpoints ----------
class TestAdminEndpoints:
    def test_admin_stats(self, admin_headers):
        r = requests.get(f"{API}/admin/stats", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        s = r.json()
        for k in ["total_orders", "pending_orders", "total_products", "total_reviews", "total_revenue"]:
            assert k in s

    def test_admin_orders_list(self, admin_headers):
        r = requests.get(f"{API}/admin/orders", headers=admin_headers, timeout=15)
        assert r.status_code == 200

    def test_admin_no_token_401(self):
        r = requests.get(f"{API}/admin/stats", timeout=15)
        assert r.status_code == 401
