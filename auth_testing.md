# Auth-Gated Testing Playbook (CoolBreeze PK)

## Step 1: Create Test User & Session
mongosh --eval "
use('coolbreeze_db');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"

## Step 2: API Tests
curl -X GET "$URL/api/auth/me" -H "Authorization: Bearer SESSION_TOKEN"
curl -X POST "$URL/api/reviews" -H "Authorization: Bearer SESSION_TOKEN" -H "Content-Type: application/json" -d '{"product_id":"...","rating":5,"comment":"Test","images":[]}'

## Step 3: Browser Test
Set cookie session_token then visit product page; ensure "Write a Review" form appears.

## Endpoints
- GET /api/auth/me
- POST /api/auth/session  (body: session_id)
- POST /api/auth/logout
- POST /api/reviews  (Bearer or cookie required)
- GET /api/orders/my-orders  (Bearer or cookie required)
- GET /api/orders/track?order_number=XYZ  (public)
