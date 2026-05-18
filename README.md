# OHo Mart — Pakistan's #1 Imported Fan Store

**Full-stack e-commerce platform** for portable/neck/baby/travel fans.  
Live domain: **https://ohomart.online**

---

## Tech Stack
- **Frontend:** React 19 + Tailwind CSS + shadcn/ui
- **Backend:** FastAPI (Python 3.11)
- **Database:** MongoDB 7 (auto-setup — no manual schema required)
- **Auth:** Google Sign-In (One Tap) + JWT session cookies

---

## Features
- Product catalog (10 seeded products, fully manageable)
- Shopping cart with color/size selection
- Cash-on-Delivery checkout
- Order tracking (public)
- Google Sign-In for customers
- Admin panel (products, orders, reviews, site content, admin users)
- WhatsApp integration for order CTAs
- Password reset via email (Resend)
- Fully dynamic site content editable from admin panel

---

## WhatsApp Notifications & Auto-Reply

### How It Works
1. **Order Notification:** Every new order automatically sends a detailed WhatsApp message to your admin phone
2. **Auto-Reply:** When any customer messages your WhatsApp business number, they instantly get an auto-reply

### Setup (Twilio)

**Step 1: Create a Twilio account**
- Go to https://www.twilio.com/try-twilio
- Get your **Account SID** and **Auth Token** from the Console Dashboard

**Step 2: Enable WhatsApp Sandbox** (for testing)
- Console → Messaging → Try it out → Send a WhatsApp message
- Note the sandbox number (e.g., +14155238886)
- Send the join code from your WhatsApp to activate

**Step 3: Configure backend/.env**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
ADMIN_WHATSAPP_NOTIFY=whatsapp:+92xxxxxxxxxx   # Your phone to receive order alerts
WHATSAPP_AUTO_REPLY=Hello! Thank you for contacting OHo Mart...
```

**Step 4: Configure Twilio Webhook** (for auto-reply)
- Console → Messaging → Phone Numbers → Your WhatsApp number
- Set **"A message comes in"** webhook to:
  ```
  https://ohomart.online/api/whatsapp/webhook
  ```
  Method: **HTTP POST**

### For Production WhatsApp Business
- Apply for a WhatsApp Business number via Twilio Console → WhatsApp Senders
- Replace `TWILIO_WHATSAPP_FROM` with your approved business number
- Update webhook URL in Twilio console

---

## Complete Credentials Checklist (Fill Before Deploying)

### Required — App won't work without these
| # | Env Variable | Where to Get | Example |
|---|-------------|--------------|---------|
| 1 | `MONGO_URL` | Your MongoDB / Atlas URI | `mongodb://localhost:27017` |
| 2 | `JWT_SECRET` | Generate any random 32+ char string | `ohomart_abc123xyz456secret` |
| 3 | `ADMIN_EMAILS` | Your email(s), comma-separated | `you@gmail.com,team@gmail.com` |
| 4 | `DEFAULT_ADMIN_PASSWORD` | Choose strong password | `MyPassword@2024` |
| 5 | `GOOGLE_CLIENT_ID` | Already configured for you | `845488070993-ak986...` |

### Required for WhatsApp Features
| # | Env Variable | Where to Get |
|---|-------------|--------------|
| 6 | `TWILIO_ACCOUNT_SID` | https://www.twilio.com/console (Dashboard) |
| 7 | `TWILIO_AUTH_TOKEN` | https://www.twilio.com/console (Dashboard) |
| 8 | `TWILIO_WHATSAPP_FROM` | Twilio Sandbox: `whatsapp:+14155238886` |
| 9 | `ADMIN_WHATSAPP_NOTIFY` | Your personal WhatsApp: `whatsapp:+923xxxxxxxxx` |

### Optional
| # | Env Variable | Where to Get | Purpose |
|---|-------------|--------------|---------|
| 10 | `RESEND_API_KEY` | https://resend.com/api-keys | Password reset emails |
| 11 | `SENDER_EMAIL` | Your verified Resend domain | Email sender address |
| 12 | `COOKIE_DOMAIN` | Your domain name | `ohomart.online` |
| 13 | `WHATSAPP_AUTO_REPLY` | Custom text | Auto-reply message to customers |

---


### Prerequisites
- Docker + Docker Compose installed on your VPS
- Domain `ohomart.online` pointed to your server IP (A record)

### 1. Clone / Upload the code
```bash
git clone <your-repo> ohomart
cd ohomart
```

### 2. Configure Backend Environment
```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Edit these required values:
```
MONGO_URL=mongodb://mongodb:27017        # keep as-is for Docker
DB_NAME=ohomart_db
CORS_ORIGINS=https://ohomart.online,https://www.ohomart.online
JWT_SECRET=<generate random 32+ char string>
ADMIN_EMAILS=your@email.com,second@email.com
DEFAULT_ADMIN_PASSWORD=YourSecurePassword123
GOOGLE_CLIENT_ID=845488070993-ak986ktr940p9nuk2aciqquhidn01mat.apps.googleusercontent.com
COOKIE_DOMAIN=ohomart.online
WHATSAPP_NUMBER=923xxxxxxxxx             # your WhatsApp number
```

Optional (for password reset emails):
```
RESEND_API_KEY=re_xxxxxxxxxxxx
SENDER_EMAIL=noreply@ohomart.online
```

### 3. Start All Services
```bash
docker compose up -d --build
```

This starts:
- MongoDB on port 27017 (internal only)
- Backend API on port 8001
- Frontend on port 3000

**Database setup is automatic** — collections, indexes, and all 10 seed products are created on first startup.

### 4. Setup Nginx Reverse Proxy (SSL + Routing)

Install nginx and certbot:
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Create nginx config `/etc/nginx/sites-available/ohomart`:
```nginx
server {
    server_name ohomart.online www.ohomart.online;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 80;
}
```

Enable and get SSL:
```bash
sudo ln -s /etc/nginx/sites-available/ohomart /etc/nginx/sites-enabled/
sudo certbot --nginx -d ohomart.online -d www.ohomart.online
sudo systemctl reload nginx
```

### 5. Access Your Store
- **Store:** https://ohomart.online
- **Admin:** https://ohomart.online/admin
- **Track Order:** https://ohomart.online/track

---

## Admin Panel Login

Login at `/admin` with any email you set in `ADMIN_EMAILS` and `DEFAULT_ADMIN_PASSWORD`.

**Default seeded admins** (set in backend/.env):
- `ockmicrosoft.games@gmail.com` / `Admin@OHoMart2024`
- `tradebyabdul@gmail.com` / `Admin@OHoMart2024`
- `royalu101@gmail.com` / `Admin@OHoMart2024`

> After first login, go to **Admin Users** tab to change passwords and add new admins.

---

## Google Sign-In Setup

Your Google Client ID is already configured:
```
845488070993-ak986ktr940p9nuk2aciqquhidn01mat.apps.googleusercontent.com
```

Make sure these are added in [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Your OAuth Client:

**Authorized JavaScript origins:**
```
https://ohomart.online
https://www.ohomart.online
```

**Authorized redirect URIs:**
```
https://ohomart.online
https://www.ohomart.online
```

---

## Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | Yes | MongoDB connection string |
| `DB_NAME` | Yes | Database name |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `JWT_SECRET` | Yes | Secret for JWT signing (32+ chars) |
| `ADMIN_EMAILS` | Yes | Comma-separated initial admin emails |
| `DEFAULT_ADMIN_PASSWORD` | Yes | Password for seeded admin accounts |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `COOKIE_DOMAIN` | Yes | Cookie domain (e.g. `ohomart.online`) |
| `WHATSAPP_NUMBER` | Yes | WhatsApp number with country code |
| `RESEND_API_KEY` | No | For password reset emails |
| `SENDER_EMAIL` | No | Sender address for emails |

### Frontend (`frontend/.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_BACKEND_URL` | Yes | Full URL of your backend (e.g. `https://ohomart.online`) |
| `REACT_APP_GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |

---

## Manual Deployment (Without Docker)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit values
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Frontend
```bash
cd frontend
yarn install
REACT_APP_BACKEND_URL=https://ohomart.online \
REACT_APP_GOOGLE_CLIENT_ID=845488070993-ak986ktr940p9nuk2aciqquhidn01mat.apps.googleusercontent.com \
yarn build
# Serve the 'build' folder via nginx or any static host
```

---

## Updating the Site

```bash
cd ohomart
git pull
docker compose up -d --build
```

---

## Support

For help: WhatsApp the number configured in your admin settings.
