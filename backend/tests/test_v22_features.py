"""
Tests for OHo Mart v2.2 features:
- Multi-admin login (3 shared Gmails)
- /admin/check-access endpoint
- /admin/forgot-password and /admin/reset-password flow
- /admin/testimonials editor endpoint
- Resend email non-blocking via asyncio.to_thread (verified through endpoint latency)
"""
import os
import time
import bcrypt
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ohomart.online').rstrip('/')
API = f"{BASE_URL}/api"

# Direct mongo connection for DB-backed verification (reset codes)
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'ohomart_db')
mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]

ALLOWED = ["ockmicrosoft.games@gmail.com", "tradebyabdul@gmail.com", "royalu101@gmail.com"]
SHARED_PASSWORD = "Anees@3221."
TEST_SESSION_TOKEN = "test_session_fixed_abc123"


# ----- Multi-admin login -----

@pytest.mark.parametrize("email", ALLOWED)
def test_admin_login_all_three_gmails(email):
    r = requests.post(f"{API}/admin/login", json={"email": email, "password": SHARED_PASSWORD})
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
    assert data["email"].lower() == email


def test_admin_login_wrong_password_401():
    r = requests.post(f"{API}/admin/login", json={"email": "tradebyabdul@gmail.com", "password": "wrong"})
    assert r.status_code == 401


def test_legacy_admin_still_works():
    r = requests.post(f"{API}/admin/login", json={"email": "admin@ohomart.pk", "password": "Admin@123"})
    assert r.status_code == 200


# ----- /admin/check-access -----

def test_check_access_no_auth_401():
    r = requests.get(f"{API}/admin/check-access")
    assert r.status_code == 401


def test_check_access_non_admin_user_returns_false():
    # Make sure test session exists
    db.users.update_one(
        {"user_id": "test-user-fixed-001"},
        {"$set": {"user_id": "test-user-fixed-001", "email": "test.reviewer@ohomart.pk", "name": "Test Reviewer"}},
        upsert=True,
    )
    db.user_sessions.update_one(
        {"session_token": TEST_SESSION_TOKEN},
        {"$set": {
            "user_id": "test-user-fixed-001",
            "session_token": TEST_SESSION_TOKEN,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        }},
        upsert=True,
    )
    r = requests.get(f"{API}/admin/check-access", headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["is_admin"] is False
    assert data["email"] == "test.reviewer@ohomart.pk"


def test_check_access_allowed_admin_returns_true():
    """Create/reuse a Google user whose email is in ALLOWED_ADMIN_EMAILS and verify check-access returns true."""
    email = "ockmicrosoft.games@gmail.com"
    tok = "TEST_admin_session_token_xyz"

    # Find or create a user with this email (avoid duplicate-key on email)
    existing = db.users.find_one({"email": email})
    if existing:
        uid = existing["user_id"]
        cleanup_user = False
    else:
        uid = "TEST_admin_user_001"
        db.users.insert_one({
            "user_id": uid, "email": email, "name": "OCK Admin",
            "created_at": datetime.now(timezone.utc),
        })
        cleanup_user = True

    db.user_sessions.update_one({"session_token": tok}, {"$set": {
        "user_id": uid, "session_token": tok,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
    }}, upsert=True)
    try:
        r = requests.get(f"{API}/admin/check-access", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["is_admin"] is True
        assert data["email"] == email
    finally:
        db.user_sessions.delete_one({"session_token": tok})
        if cleanup_user:
            db.users.delete_one({"user_id": uid})


# ----- Forgot-password -----

def test_forgot_password_returns_generic_for_unknown_email():
    r = requests.post(f"{API}/admin/forgot-password", json={"email": "nobody-xyz-noexist@example.com"})
    assert r.status_code == 200
    body = r.json()
    assert "message" in body
    # Should NOT have a code created
    rec = db.admin_reset_codes.find_one({"email": "nobody-xyz-noexist@example.com"})
    assert rec is None


def test_forgot_password_creates_db_record_and_returns_quickly():
    email = "ockmicrosoft.games@gmail.com"
    # Cleanup any existing record
    db.admin_reset_codes.delete_one({"email": email})
    t0 = time.time()
    r = requests.post(f"{API}/admin/forgot-password", json={"email": email})
    elapsed = time.time() - t0
    assert r.status_code == 200, r.text
    body = r.json()
    assert "message" in body
    # Non-blocking: even with email send (asyncio.to_thread), should return <5s
    assert elapsed < 5.0, f"forgot-password took {elapsed:.2f}s — should be fast (non-blocking send)"

    rec = db.admin_reset_codes.find_one({"email": email})
    assert rec is not None
    assert "code_hash" in rec
    assert rec["code_hash"].startswith("$2b$")
    assert "expires_at" in rec
    assert rec.get("attempts", 0) == 0


def test_forgot_password_for_unverified_resend_email_still_200():
    # Email at Resend would fail send (sandbox), but endpoint must still return 200 + create record
    email = "tradebyabdul@gmail.com"
    db.admin_reset_codes.delete_one({"email": email})
    r = requests.post(f"{API}/admin/forgot-password", json={"email": email})
    assert r.status_code == 200
    rec = db.admin_reset_codes.find_one({"email": email})
    assert rec is not None


# ----- Reset-password -----

def _set_known_reset_code(email: str, code: str = "123456", expires_in_min: int = 15, attempts: int = 0):
    code_hash = bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()
    db.admin_reset_codes.update_one({"email": email}, {"$set": {
        "email": email,
        "code_hash": code_hash,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=expires_in_min),
        "attempts": attempts,
        "created_at": datetime.now(timezone.utc),
    }}, upsert=True)


def test_reset_password_short_password_returns_400():
    email = "ockmicrosoft.games@gmail.com"
    _set_known_reset_code(email)
    r = requests.post(f"{API}/admin/reset-password", json={
        "email": email, "code": "123456", "new_password": "short"
    })
    assert r.status_code == 400


def test_reset_password_invalid_code_returns_400_and_increments_attempts():
    email = "ockmicrosoft.games@gmail.com"
    _set_known_reset_code(email, code="111111", attempts=0)
    r = requests.post(f"{API}/admin/reset-password", json={
        "email": email, "code": "999999", "new_password": "NewSecurePass123!"
    })
    assert r.status_code == 400
    rec = db.admin_reset_codes.find_one({"email": email})
    assert rec is not None and rec.get("attempts", 0) == 1


def test_reset_password_too_many_attempts_returns_429():
    email = "ockmicrosoft.games@gmail.com"
    _set_known_reset_code(email, code="222222", attempts=5)
    r = requests.post(f"{API}/admin/reset-password", json={
        "email": email, "code": "222222", "new_password": "NewSecurePass123!"
    })
    assert r.status_code == 429


def test_reset_password_expired_returns_400():
    email = "ockmicrosoft.games@gmail.com"
    # Set expired code
    code_hash = bcrypt.hashpw(b"333333", bcrypt.gensalt()).decode()
    db.admin_reset_codes.update_one({"email": email}, {"$set": {
        "email": email,
        "code_hash": code_hash,
        "expires_at": datetime.now(timezone.utc) - timedelta(minutes=1),
        "attempts": 0,
    }}, upsert=True)
    r = requests.post(f"{API}/admin/reset-password", json={
        "email": email, "code": "333333", "new_password": "NewSecurePass123!"
    })
    assert r.status_code == 400
    # Record should be deleted on expiry
    assert db.admin_reset_codes.find_one({"email": email}) is None


def test_reset_password_success_updates_password_and_deletes_record():
    # Use tradebyabdul so we don't disturb the main test admin
    email = "tradebyabdul@gmail.com"
    new_pass = "TempPass@2026!"
    _set_known_reset_code(email, code="654321")
    r = requests.post(f"{API}/admin/reset-password", json={
        "email": email, "code": "654321", "new_password": new_pass
    })
    assert r.status_code == 200, r.text
    # Record deleted
    assert db.admin_reset_codes.find_one({"email": email}) is None
    # Login with new password works
    login = requests.post(f"{API}/admin/login", json={"email": email, "password": new_pass})
    assert login.status_code == 200, login.text
    # Restore original shared password so other tests pass
    _set_known_reset_code(email, code="000000")
    restore = requests.post(f"{API}/admin/reset-password", json={
        "email": email, "code": "000000", "new_password": SHARED_PASSWORD
    })
    assert restore.status_code == 200
    login2 = requests.post(f"{API}/admin/login", json={"email": email, "password": SHARED_PASSWORD})
    assert login2.status_code == 200


# ----- Testimonials endpoint -----

@pytest.fixture
def admin_token():
    r = requests.post(f"{API}/admin/login", json={"email": "ockmicrosoft.games@gmail.com", "password": SHARED_PASSWORD})
    assert r.status_code == 200
    return r.json()["token"]


def test_put_testimonials_replaces_list_and_get_settings_reflects(admin_token):
    items = [
        {"name": "TEST_Ali", "city": "Lahore", "rating": 5, "quote": "Test quote 1", "avatar": "https://i.pravatar.cc/64?img=1", "date": "2026-01-10"},
        {"name": "TEST_Sara", "city": "Karachi", "rating": 4, "quote": "Test quote 2", "avatar": "https://i.pravatar.cc/64?img=2", "date": "2026-01-12"},
    ]
    # Save original to restore later
    orig = (db.site_settings.find_one({"key": "main"}) or {}).get("featured_testimonials", [])

    r = requests.put(
        f"{API}/admin/testimonials",
        json={"testimonials": items},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "featured_testimonials" in body
    assert len(body["featured_testimonials"]) == 2
    assert body["featured_testimonials"][0]["name"] == "TEST_Ali"

    # Verify via public GET
    r2 = requests.get(f"{API}/site-settings")
    assert r2.status_code == 200
    settings = r2.json()
    names = [t["name"] for t in settings.get("featured_testimonials", [])]
    assert "TEST_Ali" in names and "TEST_Sara" in names

    # Restore originals
    requests.put(
        f"{API}/admin/testimonials",
        json={"testimonials": orig},
        headers={"Authorization": f"Bearer {admin_token}"}
    )


def test_put_testimonials_requires_admin_token():
    r = requests.put(f"{API}/admin/testimonials", json={"testimonials": []})
    assert r.status_code in (401, 403)


# ----- Regression: site-settings still works -----

def test_get_site_settings_public_works():
    r = requests.get(f"{API}/site-settings")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "featured_testimonials" in data


# ----- Regression: products / orders smoke -----

def test_products_endpoint_works():
    r = requests.get(f"{API}/products")
    assert r.status_code == 200
    products = r.json()
    assert isinstance(products, list) and len(products) > 0
