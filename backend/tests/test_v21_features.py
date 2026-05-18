"""
OHo Mart v2.1 — Tests for new features:
- Site Settings GET/PUT (with whitelist filter)
- Admin Review with created_at override
- Orders link-guest endpoint
- Order auto-link by email on creation
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ohomart.online").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "ockmicrosoft.games@gmail.com")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD")  # set in env — never hardcode
TEST_SESSION = os.getenv("TEST_SESSION_TOKEN", "test_session_fixed_abc123")
TEST_USER_EMAIL = os.getenv("TEST_USER_EMAIL", "test.reviewer@ohomart.pk")

if not ADMIN_PASSWORD:
    raise RuntimeError(
        "Set TEST_ADMIN_PASSWORD environment variable before running tests.\n"
        "  export TEST_ADMIN_PASSWORD='Admin@OHoMart2024'"
    )

EXPECTED_KEYS = [
    "brand_name", "brand_tagline", "whatsapp_number",
    "hero_badge", "hero_title_main", "hero_title_accent", "hero_subtitle",
    "hero_cta_primary", "hero_cta_secondary",
    "sale_banner_primary", "sale_banner_secondary", "sale_banner_tertiary",
    "why_buy_title", "why_buy_subtitle",
    "products_section_title", "products_section_subtitle",
    "stats_customers_value", "stats_customers_label",
    "stats_orders_value", "stats_orders_label",
    "stats_rating_value", "stats_rating_label",
    "stats_cities_value", "stats_cities_label",
    "founder_quote", "founder_name", "founder_role",
    "guarantee_title", "guarantee_text",
    "whatsapp_cta_title", "whatsapp_cta_subtitle",
    "footer_tagline", "trust_badges", "featured_testimonials",
]


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
    return r.json()


# ---------- Site Settings ----------
class TestSiteSettings:
    def test_get_site_settings_public_returns_all_keys(self):
        r = requests.get(f"{API}/site-settings", timeout=15)
        assert r.status_code == 200
        data = r.json()
        missing = [k for k in EXPECTED_KEYS if k not in data]
        assert not missing, f"Missing keys: {missing}"
        # Validate nested structures
        assert isinstance(data["trust_badges"], list) and len(data["trust_badges"]) >= 1
        assert isinstance(data["featured_testimonials"], list) and len(data["featured_testimonials"]) >= 1
        tm = data["featured_testimonials"][0]
        for k in ("name", "city", "rating", "quote", "avatar"):
            assert k in tm

    def test_put_site_settings_requires_admin(self):
        r = requests.put(f"{API}/admin/site-settings", json={"settings": {"brand_name": "Hack"}}, timeout=15)
        assert r.status_code == 401

    def test_put_site_settings_updates_and_filters(self, admin_headers):
        # Save current value to restore later
        before = requests.get(f"{API}/site-settings", timeout=15).json()
        original_title = before["hero_title_main"]
        original_brand = before["brand_name"]

        new_title = f"TEST_TITLE_{uuid.uuid4().hex[:6]}"
        # Include a non-whitelisted key that should be filtered out
        payload = {
            "settings": {
                "hero_title_main": new_title,
                "malicious_key_xyz": "should_be_dropped",
                "whatsapp_number": "923009999999",
            }
        }
        r = requests.put(f"{API}/admin/site-settings", headers=admin_headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["hero_title_main"] == new_title
        assert updated["whatsapp_number"] == "923009999999"
        assert "malicious_key_xyz" not in updated

        # Verify via public GET
        r2 = requests.get(f"{API}/site-settings", timeout=15)
        assert r2.json()["hero_title_main"] == new_title

        # Restore originals
        requests.put(
            f"{API}/admin/site-settings",
            headers=admin_headers,
            json={"settings": {"hero_title_main": original_title, "brand_name": original_brand,
                               "whatsapp_number": before["whatsapp_number"]}},
            timeout=15,
        )


# ---------- Admin Review created_at Override ----------
class TestAdminReviewDateOverride:
    def test_admin_review_with_custom_created_at(self, admin_headers, products):
        pid = products[0]["id"]
        custom_date = "2024-01-15T10:30:00.000Z"
        payload = {
            "product_id": pid,
            "reviewer_name": "TEST_OldReview",
            "rating": 5,
            "comment": "TEST_old_date_review",
            "images": [],
            "verified_purchase": True,
            "is_approved": True,
            "created_at": custom_date,
        }
        r = requests.post(f"{API}/admin/reviews", headers=admin_headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["created_at"] == custom_date
        rid = data["id"]

        # Verify via admin list
        r2 = requests.get(f"{API}/admin/reviews", headers=admin_headers, timeout=15)
        found = next((x for x in r2.json() if x["id"] == rid), None)
        assert found is not None
        assert found["created_at"] == custom_date

        # Update with new date
        new_date = "2023-06-20T08:00:00.000Z"
        upd_payload = {**payload, "created_at": new_date, "comment": "TEST_updated_date"}
        r3 = requests.put(f"{API}/admin/reviews/{rid}", headers=admin_headers, json=upd_payload, timeout=15)
        assert r3.status_code == 200, r3.text
        assert r3.json()["created_at"] == new_date

        # Cleanup
        requests.delete(f"{API}/admin/reviews/{rid}", headers=admin_headers, timeout=15)

    def test_admin_review_without_created_at_uses_now(self, admin_headers, products):
        pid = products[0]["id"]
        payload = {
            "product_id": pid,
            "reviewer_name": "TEST_NowReview",
            "rating": 4,
            "comment": "TEST_now_date_review",
            "images": [],
            "is_approved": True,
        }
        r = requests.post(f"{API}/admin/reviews", headers=admin_headers, json=payload, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["created_at"] is not None
        # Should start with current year (2025 or 2026)
        assert data["created_at"].startswith("202")
        assert not data["created_at"].startswith("2024-01-15")
        # Cleanup
        requests.delete(f"{API}/admin/reviews/{data['id']}", headers=admin_headers, timeout=15)


# ---------- Guest Order Linking ----------
class TestGuestOrderLinking:
    def _make_guest_order(self, products, email=None):
        p = products[0]
        payload = {
            "customer_name": "TEST_GuestLink",
            "phone": "03001112223",
            "whatsapp": "03001112223",
            "address": "TEST guest link address",
            "city": "Karachi",
            "province": "Sindh",
            "items": [{
                "product_id": p["id"],
                "product_name": p["name"],
                "product_image": (p.get("images") or [""])[0],
                "quantity": 1,
                "unit_price": p["discounted_price"],
                "line_total": p["discounted_price"],
            }],
            "total_price": p["discounted_price"],
        }
        if email:
            payload["email"] = email
        r = requests.post(f"{API}/orders", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        return r.json()

    def test_link_guest_orders_requires_auth(self):
        r = requests.post(f"{API}/orders/link-guest", json={"order_numbers": ["CB-FAKE"]}, timeout=15)
        assert r.status_code == 401

    def test_link_guest_orders_success(self, products, user_headers):
        # Create truly anonymous guest order (no email) so user_email is None
        # and link-guest can claim it.
        order = self._make_guest_order(products, email=None)
        order_num = order["order_number"]
        assert order.get("user_email") in (None,)

        # Link it
        r = requests.post(
            f"{API}/orders/link-guest",
            headers=user_headers,
            json={"order_numbers": [order_num]},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        result = r.json()
        assert result["linked"] >= 1

        # Verify order now belongs to user
        track = requests.get(f"{API}/orders/track/{order_num}", timeout=15).json()
        assert track["user_email"] == TEST_USER_EMAIL

        # Verify it shows in /my-orders
        mine = requests.get(f"{API}/orders/my", headers=user_headers, timeout=15).json()
        assert any(o["order_number"] == order_num for o in mine)

        # Idempotency: re-claim by same user — should still succeed (count may be 0 or >=0)
        r2 = requests.post(
            f"{API}/orders/link-guest",
            headers=user_headers,
            json={"order_numbers": [order_num]},
            timeout=15,
        )
        assert r2.status_code == 200
        # 'linked' field should be present
        assert "linked" in r2.json()

    def test_link_guest_orders_empty_list(self, user_headers):
        r = requests.post(
            f"{API}/orders/link-guest",
            headers=user_headers,
            json={"order_numbers": []},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["linked"] == 0


# ---------- Auto-link order at creation by email ----------
class TestOrderAutoLinkByEmail:
    def test_guest_order_with_registered_email_auto_links(self, products, user_headers):
        # Guest order (no auth) but uses email of registered test user
        p = products[0]
        payload = {
            "customer_name": "TEST_AutoLink",
            "phone": "03004445556",
            "whatsapp": "03004445556",
            "email": TEST_USER_EMAIL,
            "address": "TEST autolink address",
            "city": "Lahore",
            "province": "Punjab",
            "items": [{
                "product_id": p["id"],
                "product_name": p["name"],
                "product_image": (p.get("images") or [""])[0],
                "quantity": 1,
                "unit_price": p["discounted_price"],
                "line_total": p["discounted_price"],
            }],
            "total_price": p["discounted_price"],
        }
        r = requests.post(f"{API}/orders", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        order_num = data["order_number"]
        assert data["user_email"] == TEST_USER_EMAIL

        # Verify it appears in /my-orders without needing to call link-guest
        mine = requests.get(f"{API}/orders/my", headers=user_headers, timeout=15).json()
        assert any(o["order_number"] == order_num for o in mine), \
            f"Order {order_num} not in /my-orders"


# ---------- Stock=0 Product Still Returned ----------
class TestStockZeroProductVisible:
    def test_zero_stock_product_still_returned(self, admin_headers):
        # Find a product to temporarily set stock=0
        all_products = requests.get(f"{API}/admin/products", headers=admin_headers, timeout=15).json()
        assert len(all_products) > 0
        target = all_products[-1]
        pid = target["id"]
        original_stock = target["stock"]

        # Update stock to 0 — must send full ProductUpdate payload
        update_payload = {k: target.get(k) for k in [
            "name", "description", "price", "discounted_price", "category",
            "images", "video_url", "colors", "color_variants", "sizes",
            "battery_life", "features", "is_active", "total_sold"
        ]}
        update_payload["stock"] = 0
        # Sanitize None values
        if update_payload.get("color_variants") is None:
            update_payload["color_variants"] = []
        if update_payload.get("colors") is None:
            update_payload["colors"] = []
        if update_payload.get("sizes") is None:
            update_payload["sizes"] = []
        if update_payload.get("images") is None:
            update_payload["images"] = []
        if update_payload.get("features") is None:
            update_payload["features"] = []

        try:
            r = requests.put(f"{API}/products/{pid}", headers=admin_headers, json=update_payload, timeout=15)
            assert r.status_code == 200, r.text
            assert r.json()["stock"] == 0

            # Public GET /api/products should still include it (only is_active filter)
            public = requests.get(f"{API}/products", timeout=15).json()
            found = next((p for p in public if p["id"] == pid), None)
            assert found is not None, "Stock=0 product was filtered out of public products list"
            assert found["stock"] == 0
        finally:
            # Restore
            update_payload["stock"] = original_stock
            requests.put(f"{API}/products/{pid}", headers=admin_headers, json=update_payload, timeout=15)
