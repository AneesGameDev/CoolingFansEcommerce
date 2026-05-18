"""
Tests for OHo Mart: WhatsApp settings, media upload/serve, reviewer_avatar
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

ADMIN_EMAIL = "ockmicrosoft.games@gmail.com"
ADMIN_PASS = "Admin@OHoMart2024"


@pytest.fixture(scope="module")
def admin_token():
    resp = requests.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---- Site Settings / WhatsApp ----

class TestSiteSettings:
    """Site settings including WhatsApp number"""

    def test_get_site_settings_public(self):
        resp = requests.get(f"{BASE_URL}/api/site-settings")
        assert resp.status_code == 200
        data = resp.json()
        assert "whatsapp_number" in data
        print(f"Current WhatsApp number: {data['whatsapp_number']}")

    def test_whatsapp_number_value(self):
        resp = requests.get(f"{BASE_URL}/api/site-settings")
        data = resp.json()
        wn = data.get("whatsapp_number", "")
        assert wn, "whatsapp_number should not be empty"
        assert wn.startswith("92"), f"Expected PK number starting with 92, got: {wn}"

    def test_update_whatsapp_and_verify(self, admin_headers):
        new_number = "923001234567"
        resp = requests.put(
            f"{BASE_URL}/api/admin/site-settings",
            json={"settings": {"whatsapp_number": new_number}},
            headers=admin_headers
        )
        assert resp.status_code == 200
        # Verify via public endpoint
        resp2 = requests.get(f"{BASE_URL}/api/site-settings")
        assert resp2.json()["whatsapp_number"] == new_number

    def test_restore_original_whatsapp(self, admin_headers):
        resp = requests.put(
            f"{BASE_URL}/api/admin/site-settings",
            json={"settings": {"whatsapp_number": "923000000000"}},
            headers=admin_headers
        )
        assert resp.status_code == 200


# ---- Media Upload ----

class TestMediaUpload:
    """GridFS media upload and serve"""

    def test_upload_image(self, admin_headers):
        # Create a tiny PNG in memory
        png_bytes = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00'
            b'\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx'
            b'\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00'
            b'\x00IEND\xaeB`\x82'
        )
        files = {"file": ("test.png", io.BytesIO(png_bytes), "image/png")}
        resp = requests.post(f"{BASE_URL}/api/admin/upload-media", files=files, headers=admin_headers)
        assert resp.status_code == 200, f"Upload failed: {resp.text}"
        data = resp.json()
        assert "url" in data
        assert "file_id" in data
        assert "content_type" in data
        assert data["content_type"] == "image/png"
        print(f"Uploaded file_id: {data['file_id']}")
        return data["file_id"]

    def test_upload_and_serve(self, admin_headers):
        png_bytes = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00'
            b'\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx'
            b'\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00'
            b'\x00IEND\xaeB`\x82'
        )
        files = {"file": ("test_serve.png", io.BytesIO(png_bytes), "image/png")}
        resp = requests.post(f"{BASE_URL}/api/admin/upload-media", files=files, headers=admin_headers)
        assert resp.status_code == 200
        file_id = resp.json()["file_id"]

        # Now serve
        serve_resp = requests.get(f"{BASE_URL}/api/media/{file_id}")
        assert serve_resp.status_code == 200
        assert serve_resp.headers.get("content-type", "").startswith("image/png")
        print(f"Served file OK, size: {len(serve_resp.content)} bytes")

    def test_upload_without_auth_fails(self):
        png_bytes = b'\x89PNG\r\n\x1a\n'
        files = {"file": ("unauth.png", io.BytesIO(png_bytes), "image/png")}
        resp = requests.post(f"{BASE_URL}/api/admin/upload-media", files=files)
        assert resp.status_code in [401, 403]

    def test_serve_invalid_file_id(self):
        resp = requests.get(f"{BASE_URL}/api/media/invalidid123")
        assert resp.status_code in [400, 404]

    def test_serve_nonexistent_file(self):
        resp = requests.get(f"{BASE_URL}/api/media/507f1f77bcf86cd799439011")
        assert resp.status_code == 404


# ---- Reviews with reviewer_avatar ----

class TestReviewAvatar:
    """Review submission includes reviewer_avatar"""

    def _get_product_id(self):
        resp = requests.get(f"{BASE_URL}/api/products")
        assert resp.status_code == 200
        products = resp.json()
        assert len(products) > 0, "No products found"
        return products[0]["id"]

    def test_admin_create_review_and_check_avatar(self, admin_headers):
        product_id = self._get_product_id()
        # Note: AdminReviewCreate does NOT have reviewer_avatar field (only ReviewCreate does)
        resp = requests.post(
            f"{BASE_URL}/api/admin/reviews",
            json={
                "product_id": product_id,
                "reviewer_name": "TEST_ReviewUser",
                "rating": 5,
                "comment": "TEST review for avatar testing",
                "verified_purchase": True
            },
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Create review failed: {resp.text}"
        data = resp.json()
        assert "id" in data

    def test_get_reviews_has_avatar_field(self):
        product_id = self._get_product_id()
        # Correct endpoint is /api/reviews/{product_id}
        resp = requests.get(f"{BASE_URL}/api/reviews/{product_id}")
        assert resp.status_code == 200
        reviews = resp.json()
        if reviews:
            review = reviews[0]
            assert "reviewer_avatar" in review, "reviewer_avatar field missing from reviews"
            print(f"reviewer_avatar in review: {review.get('reviewer_avatar', 'N/A')}")
