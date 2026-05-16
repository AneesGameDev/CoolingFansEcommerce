import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "admin@coolbreeze.pk"
ADMIN_PASSWORD = "Admin@123"


@pytest.fixture(scope="module")
def admin_token():
    resp = requests.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --- Public endpoints ---

class TestPublicProducts:
    """Public product endpoints"""

    def test_get_products_returns_10(self):
        resp = requests.get(f"{BASE_URL}/api/products")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 10, f"Expected 10 products, got {len(data)}"

    def test_get_product_detail(self):
        resp = requests.get(f"{BASE_URL}/api/products")
        products = resp.json()
        pid = products[0]["id"]
        detail = requests.get(f"{BASE_URL}/api/products/{pid}")
        assert detail.status_code == 200
        d = detail.json()
        assert d["id"] == pid
        assert "name" in d
        assert "price" in d
        assert "discounted_price" in d

    def test_invalid_product_id(self):
        resp = requests.get(f"{BASE_URL}/api/products/invalidid123")
        assert resp.status_code == 400


class TestOrders:
    """Order placement"""

    def test_create_order(self):
        prods = requests.get(f"{BASE_URL}/api/products").json()
        p = prods[0]
        payload = {
            "customer_name": "TEST_Customer",
            "phone": "03001234567",
            "whatsapp": "03001234567",
            "address": "House 123, Test Street",
            "city": "Karachi",
            "province": "Sindh",
            "product_id": p["id"],
            "product_name": p["name"],
            "product_image": p["images"][0] if p["images"] else "",
            "quantity": 1,
            "unit_price": p["discounted_price"],
            "total_price": p["discounted_price"],
        }
        resp = requests.post(f"{BASE_URL}/api/orders", json=payload)
        assert resp.status_code == 200
        d = resp.json()
        assert "order_number" in d
        assert d["order_number"].startswith("CB-")
        assert d["status"] == "pending"
        return d["id"]


class TestAdminAuth:
    """Admin auth"""

    def test_admin_login_success(self):
        resp = requests.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert resp.status_code == 200
        assert "token" in resp.json()

    def test_admin_login_wrong_password(self):
        resp = requests.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert resp.status_code == 401

    def test_admin_me(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["role"] == "admin"

    def test_unauthenticated_access_blocked(self):
        resp = requests.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 401


class TestAdminStats:
    """Admin stats"""

    def test_get_stats(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers)
        assert resp.status_code == 200
        d = resp.json()
        assert "total_orders" in d
        assert "total_products" in d
        assert d["total_products"] == 10


class TestAdminProducts:
    """Admin product CRUD"""

    def test_get_all_products(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/products", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 10

    def test_create_update_delete_product(self, auth_headers):
        payload = {
            "name": "TEST_Fan Product",
            "description": "Test desc",
            "price": 1000.0,
            "discounted_price": 800.0,
            "category": "test",
            "images": [],
            "colors": ["White"],
            "sizes": [],
            "stock": 10,
            "features": ["Feature1"],
            "is_active": True
        }
        create = requests.post(f"{BASE_URL}/api/products", json=payload, headers=auth_headers)
        assert create.status_code == 200
        pid = create.json()["id"]

        # Update
        payload["name"] = "TEST_Fan Product Updated"
        update = requests.put(f"{BASE_URL}/api/products/{pid}", json=payload, headers=auth_headers)
        assert update.status_code == 200
        assert update.json()["name"] == "TEST_Fan Product Updated"

        # Delete
        delete = requests.delete(f"{BASE_URL}/api/products/{pid}", headers=auth_headers)
        assert delete.status_code == 200

        # Verify deleted
        get = requests.get(f"{BASE_URL}/api/products/{pid}")
        assert get.status_code == 404


class TestAdminOrders:
    """Admin order management"""

    def test_get_orders(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/orders", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_update_order_status(self, auth_headers):
        # Create test order first
        prods = requests.get(f"{BASE_URL}/api/products").json()
        p = prods[0]
        order = requests.post(f"{BASE_URL}/api/orders", json={
            "customer_name": "TEST_StatusUpdate",
            "phone": "03001234567",
            "whatsapp": "03001234567",
            "address": "Test Address",
            "city": "Lahore",
            "province": "Punjab",
            "product_id": p["id"],
            "product_name": p["name"],
            "product_image": p["images"][0] if p["images"] else "",
            "quantity": 1,
            "unit_price": p["discounted_price"],
            "total_price": p["discounted_price"],
        }).json()
        oid = order["id"]

        update = requests.put(f"{BASE_URL}/api/admin/orders/{oid}", json={"status": "confirmed"}, headers=auth_headers)
        assert update.status_code == 200
        assert update.json()["status"] == "confirmed"

        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/orders/{oid}", headers=auth_headers)


class TestAdminReviews:
    """Admin review management"""

    def test_get_reviews(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/reviews", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 9

    def test_create_delete_review(self, auth_headers):
        prods = requests.get(f"{BASE_URL}/api/products").json()
        pid = prods[0]["id"]
        payload = {
            "product_id": pid,
            "reviewer_name": "TEST_Reviewer",
            "rating": 5,
            "comment": "Test review",
            "images": [],
            "verified_purchase": False,
            "is_approved": True
        }
        create = requests.post(f"{BASE_URL}/api/admin/reviews", json=payload, headers=auth_headers)
        assert create.status_code == 200
        rid = create.json()["id"]

        # Delete
        delete = requests.delete(f"{BASE_URL}/api/admin/reviews/{rid}", headers=auth_headers)
        assert delete.status_code == 200
