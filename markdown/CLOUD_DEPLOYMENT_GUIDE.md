# StockYard — Cloud Deployment & Multi-Location Access Guide

> **Complete guide to hosting StockYard on a cloud server so multiple users across different geographical locations can access it via the internet, with a public website for downloading the desktop installer.**

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [What Needs to Change (Code Recommendations)](#2-what-needs-to-change-code-recommendations)
3. [Choosing a Cloud Provider](#3-choosing-a-cloud-provider)
4. [Server Setup (Ubuntu VPS)](#4-server-setup-ubuntu-vps)
5. [Domain & DNS Setup](#5-domain--dns-setup)
6. [Installing Node.js & Dependencies](#6-installing-nodejs--dependencies)
7. [Database: Migrate SQLite → PostgreSQL](#7-database-migrate-sqlite--postgresql)
8. [Deploying the Backend API](#8-deploying-the-backend-api)
9. [Deploying the Frontend (Next.js)](#9-deploying-the-frontend-nextjs)
10. [Nginx Reverse Proxy & SSL](#10-nginx-reverse-proxy--ssl)
11. [Process Management with PM2](#11-process-management-with-pm2)
12. [Building the Desktop App (Server-Connected Mode)](#12-building-the-desktop-app-server-connected-mode)
13. [Public Website with Download Page](#13-public-website-with-download-page)
14. [User Management & Multi-Dashboard Access](#14-user-management--multi-dashboard-access)
15. [CI/CD — Automated Deployments](#15-cicd--automated-deployments)
16. [Backups & Disaster Recovery](#16-backups--disaster-recovery)
17. [Security Hardening](#17-security-hardening)
18. [Monitoring & Logging](#18-monitoring--logging)
19. [Scaling for the Future](#19-scaling-for-the-future)
20. [Cost Estimation](#20-cost-estimation)
21. [Quick Reference Card](#21-quick-reference-card)
22. [Troubleshooting](#22-troubleshooting)

---

## 1. Overview & Architecture

### Current Architecture (Desktop Only)

```
┌──────────────────────────────────────┐
│         Each User's Windows PC       │
│                                      │
│  ┌─────────────┐  ┌──────────────┐  │
│  │ Electron UI  │→│ Embedded     │  │
│  │ (Next.js     │  │ Backend      │  │
│  │  :3000)      │  │ (Express     │  │
│  │              │  │  :5000)      │  │
│  └─────────────┘  └──────┬───────┘  │
│                          │           │
│                   ┌──────▼───────┐   │
│                   │ Local SQLite │   │
│                   │ Database     │   │
│                   └──────────────┘   │
│                                      │
│  ❌ Data is isolated per PC          │
│  ❌ No internet access               │
│  ❌ No multi-user collaboration      │
└──────────────────────────────────────┘
```

### Target Architecture (Cloud-Hosted Multi-User)

```
                    ┌──────────────────────────────────┐
                    │        CLOUD SERVER (VPS)         │
                    │     stockyard.primeinfraa.com     │
                    │                                   │
                    │  ┌────────────┐  ┌────────────┐  │
                    │  │  Backend   │  │  Frontend   │  │
                    │  │  API       │  │  (Next.js)  │  │
                    │  │  :5000     │  │  :3000      │  │
                    │  └─────┬──────┘  └────────────┘  │
                    │        │                          │
                    │  ┌─────▼──────┐  ┌────────────┐  │
                    │  │ PostgreSQL │  │   Nginx     │  │
                    │  │ Database   │  │   :80/:443  │  │
                    │  └────────────┘  └─────┬──────┘  │
                    │                        │ SSL     │
                    └────────────────────────┼─────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────┐
              │                              │                          │
     ┌────────▼─────────┐       ┌───────────▼──────────┐    ┌─────────▼──────────┐
     │  Office User      │       │  Remote User          │    │  Mobile User        │
     │  (Desktop App)    │       │  (Browser)            │    │  (Phone Browser)    │
     │                   │       │                       │    │                     │
     │  Electron shell   │       │  Chrome/Edge/Firefox  │    │  Safari/Chrome      │
     │  connects to      │       │  https://stockyard.   │    │  https://stockyard. │
     │  cloud backend    │       │  primeinfraa.com      │    │  primeinfraa.com    │
     └───────────────────┘       └───────────────────────┘    └─────────────────────┘

     Delhi Office              Mumbai Site                    Travelling PM
```

### What This Gives You

| Feature | Before (Desktop) | After (Cloud) |
|---------|------------------|---------------|
| Multi-user access | ❌ Each PC has separate data | ✅ Everyone shares one database |
| Remote access | ❌ Office-only | ✅ Anywhere with internet |
| Multiple dashboards | ❌ One per PC | ✅ Unlimited simultaneous users |
| Project managers raise requirements | ❌ Must be in office | ✅ From any location |
| Download software | ❌ Copy via USB/email | ✅ Public download page |
| Public website | ❌ None | ✅ Professional landing page |
| Data backup | ❌ Manual, per-PC | ✅ Automated cloud backups |
| Software updates | ❌ Reinstall on every PC | ✅ Web app auto-updates, desktop auto-update possible |
| Mobile access | ❌ None | ✅ Full access via phone browser |

---

## 2. What Needs to Change (Code Recommendations)

### Summary of Required Code Changes

Before deploying to the cloud, these changes are recommended in the codebase:

#### 2.1 — Switch Database from SQLite to PostgreSQL

**Why:** SQLite does not support concurrent writes from multiple users. With 5+ users hitting the API simultaneously, you will get `SQLITE_BUSY` / database lock errors.

**What to change:**

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Change `provider = "sqlite"` → `provider = "postgresql"` |
| `backend/prisma/schema.prisma` | Update `DATABASE_URL` format from `file:./path` → `postgresql://user:pass@host:5432/db` |
| `backend/prisma/schema.prisma` | Keep `binaryTargets` for cross-platform builds |
| `backend/src/config/database.ts` | When `DATABASE_URL` starts with `postgresql://`, skip file path logic |
| `backend/prisma/migrations/` | Need to regenerate migrations for PostgreSQL |

**Schema change (schema.prisma):**
```prisma
datasource db {
  provider = "postgresql"          // ← Change from "sqlite"
  url      = env("DATABASE_URL")   // ← Will be set via .env
}
```

**Database URL (.env):**
```env
DATABASE_URL="postgresql://stockyard_user:your_secure_password@localhost:5432/stockyard_db"
```

#### 2.2 — Add Environment-Based CORS Configuration

**Why:** The backend currently allows `*` in embedded mode or `http://localhost:3000`. In production, you need to allow your actual domain.

**Current code (`backend/src/server.ts`):**
```typescript
app.use(cors({
  origin: isEmbeddedMode ? '*' : (process.env.CORS_ORIGIN || 'http://localhost:3000'),
  credentials: true,
}));
```

**Recommended change:**
```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')  // Support multiple origins
    : (isEmbeddedMode ? '*' : 'http://localhost:3000'),
  credentials: true,
}));
```

**Production .env:**
```env
CORS_ORIGIN=https://stockyard.primeinfraa.com,https://app.primeinfraa.com
```

#### 2.3 — Strengthen JWT Configuration

**Why:** The current JWT secret is hardcoded or weak. For internet-facing production, it must be a strong random key.

**Production .env:**
```env
JWT_SECRET="$(openssl rand -hex 64)"
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### 2.4 — Add Server-Connected Mode to Electron App

**Why:** The desktop app currently starts its own backend+database locally. For cloud mode, it should connect to the cloud backend instead.

**What to change in `electron-main.js`:**
```javascript
// Add at the top, after existing constants:
const SERVER_MODE = process.env.STOCKYARD_SERVER_URL ? true : false;
const SERVER_URL = process.env.STOCKYARD_SERVER_URL || '';

// In app.whenReady(), add this before existing logic:
if (SERVER_MODE && !isDev) {
  // Cloud-connected mode: skip local backend, point to cloud
  console.log('🌐 Server mode: connecting to', SERVER_URL);
  
  // Just start frontend pointing to the cloud API
  await startFrontend();  // frontend uses NEXT_PUBLIC_API_URL
  mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}`);
  return;
}
```

**What to change in `frontend/src/lib/api.ts`:**
No change needed — it already reads `NEXT_PUBLIC_API_URL` from environment, which is exactly what we need.

**Build command for server-connected installer:**
```bash
NEXT_PUBLIC_API_URL=https://api.primeinfraa.com/api/v1 npm run build:frontend
npm run build:win
```

#### 2.5 — Update `database.ts` to Support PostgreSQL

**Why:** The current code assumes a file-based SQLite path. For PostgreSQL, it just needs to use the env DATABASE_URL directly.

**Recommended change (`backend/src/config/database.ts`):**
```typescript
export function getDatabasePath(): string {
  const dbUrl = process.env.DATABASE_URL || '';
  
  // PostgreSQL: return the connection URL as-is
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    return dbUrl;  // No file path needed
  }
  
  // SQLite: existing file path logic (for desktop embedded mode)
  if (dbUrl.startsWith('file:')) {
    return dbUrl.replace('file:', '');
  }

  const dataDir = getDataDirectory();
  return path.join(dataDir, 'inventory.db');
}
```

#### 2.6 — Add Rate Limiting for Public API

**Why:** Currently rate limiting is disabled in embedded mode. On the internet, it must be enabled.

**Recommendation:** Remove the `if (!isEmbeddedMode)` check; always enable rate limiting in production. The existing `rate-limiter.middleware.ts` already has this — just ensure `EMBEDDED_MODE` is NOT set in cloud deployment.

#### 2.7 — Add File Upload Support (Future)

For cloud deployment, if you later need file uploads (e.g., item photos, documents), add:
- Cloud storage (AWS S3 or Cloudflare R2)
- Or use local disk storage behind Nginx

#### 2.8 — Summary of Changes

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| 🔴 Critical | SQLite → PostgreSQL | Medium | Enables multi-user concurrent access |
| 🔴 Critical | CORS for production domain | Small | Enables cross-origin requests |
| 🔴 Critical | Strong JWT_SECRET | Small | Security |
| 🟡 Important | Server-connected Electron mode | Medium | Desktop app talks to cloud |
| 🟡 Important | database.ts PostgreSQL support | Small | Supports both SQLite + PostgreSQL |
| 🟢 Nice-to-have | Rate limiting always on | Small | DDoS protection |
| 🟢 Nice-to-have | Auto-updater for desktop | Medium | Users get updates without reinstalling |

---

## 3. Choosing a Cloud Provider

### Recommended: DigitalOcean, Hetzner, or AWS Lightsail

| Provider | Plan | Monthly Cost | Specs | Best For |
|----------|------|-------------|-------|----------|
| **DigitalOcean** | Basic Droplet | $6/mo (₹500) | 1 vCPU, 1GB RAM, 25GB SSD | Best balance of price & simplicity |
| **Hetzner** | CX22 | €4.5/mo (₹400) | 2 vCPU, 4GB RAM, 40GB SSD | Best value for money |
| **AWS Lightsail** | $5 plan | $5/mo (₹420) | 1 vCPU, 1GB RAM, 40GB SSD | If already using AWS |
| **Hostinger VPS** | KVM 1 | $5/mo (₹420) | 1 vCPU, 4GB RAM, 50GB SSD | Budget-friendly |
| **Contabo** | Cloud VPS S | €5.5/mo (₹480) | 4 vCPU, 8GB RAM, 200GB SSD | Maximum resources for price |
| **Azure** | B1s | $7.30/mo (₹600) | 1 vCPU, 1GB RAM, 30GB SSD | Enterprise / Microsoft ecosystem |
| **Google Cloud** | e2-micro | Free tier / $7/mo | 0.25 vCPU, 1GB RAM | If already using GCP |

### Recommended Specs for StockYard

For **up to 20 concurrent users**:
- **Minimum:** 1 vCPU, 1GB RAM, 20GB SSD
- **Recommended:** 2 vCPU, 2-4GB RAM, 40GB SSD
- **OS:** Ubuntu 22.04 LTS or 24.04 LTS

### Step-by-Step: Create a DigitalOcean Droplet

1. Go to https://www.digitalocean.com/ and sign up
2. Click **Create → Droplets**
3. Choose:
   - **Region:** Bangalore (BLR1) — closest to India
   - **Image:** Ubuntu 24.04 LTS
   - **Plan:** Basic → Regular → $6/mo (1 vCPU, 1GB RAM)
   - **Authentication:** SSH Key (recommended) or Password
4. Click **Create Droplet**
5. Note the **IP address** (e.g., `134.209.154.XX`)

---

## 4. Server Setup (Ubuntu VPS)

### 4.1 — Connect via SSH

```bash
ssh root@YOUR_SERVER_IP
# or
ssh root@134.209.154.XX
```

### 4.2 — Create a Non-Root User

```bash
adduser deploy
usermod -aG sudo deploy

# Copy SSH key to new user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Switch to new user
su - deploy
```

### 4.3 — Update the System

```bash
sudo apt update && sudo apt upgrade -y
```

### 4.4 — Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp       # HTTP
sudo ufw allow 443/tcp      # HTTPS
sudo ufw enable

# Verify
sudo ufw status
```

### 4.5 — Set Timezone

```bash
sudo timedatectl set-timezone Asia/Kolkata
```

### 4.6 — Install Essential Tools

```bash
sudo apt install -y curl wget git build-essential unzip htop
```

---

## 5. Domain & DNS Setup

### 5.1 — Buy a Domain

Purchase a domain from:
- **Namecheap:** ~$10/year (₹830)
- **GoDaddy:** ~$12/year (₹1000)
- **Google Domains:** ~$12/year
- **Hostinger:** ~$8/year (₹660)
- **Cloudflare Registrar:** at-cost pricing, ~$9/year

Example: `primeinfraa.com`, `stockyard.in`, `piestockyard.com`

### 5.2 — Configure DNS Records

In your domain registrar's DNS panel (or Cloudflare DNS):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `134.209.154.XX` | Auto |
| A | `app` | `134.209.154.XX` | Auto |
| A | `api` | `134.209.154.XX` | Auto |
| A | `www` | `134.209.154.XX` | Auto |
| CNAME | `download` | `@` | Auto |

This gives you:
- `primeinfraa.com` → Main website
- `app.primeinfraa.com` → StockYard dashboard (Next.js)
- `api.primeinfraa.com` → Backend API
- `download.primeinfraa.com` → Software download page

### 5.3 — Use Cloudflare (Recommended)

Even if you buy the domain elsewhere, route DNS through Cloudflare for:
- Free SSL
- DDoS protection
- CDN (faster page loads)
- Analytics

1. Sign up at https://www.cloudflare.com/
2. Add your domain
3. Change your domain's nameservers to Cloudflare's (provided during setup)
4. Add the A records above in Cloudflare DNS

---

## 6. Installing Node.js & Dependencies

### 6.1 — Install Node.js via NVM

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Install Node.js LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node -v   # v20.x.x
npm -v    # 10.x.x
```

> **Why Node 20 instead of 25?** Node 20 is the current LTS (Long Term Support) version, recommended for production servers. Node 25 is the "current" release and may have stability issues.

### 6.2 — Install PM2 (Process Manager)

```bash
npm install -g pm2
```

### 6.3 — Install Build Tools

```bash
sudo apt install -y python3 make g++
```

---

## 7. Database: Migrate SQLite → PostgreSQL

### Why PostgreSQL?

| | SQLite | PostgreSQL |
|---|---|---|
| Concurrent users | ❌ 1 writer at a time | ✅ Hundreds of concurrent connections |
| Network access | ❌ Local file only | ✅ Network accessible |
| Scalability | ❌ Single-node only | ✅ Scales vertically and can replicate |
| Data integrity | ⚠️ Basic | ✅ Full ACID, constraints, transactions |
| Backup | Manual file copy | pg_dump, streaming replication |
| Production readiness | ⚠️ For embedded/desktop only | ✅ Industry standard |

### 7.1 — Install PostgreSQL on Server

```bash
sudo apt install -y postgresql postgresql-contrib

# Start and enable
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 7.2 — Create Database & User

```bash
sudo -u postgres psql
```

In the PostgreSQL shell:
```sql
-- Create user
CREATE USER stockyard_user WITH PASSWORD 'your_strong_password_here';

-- Create database
CREATE DATABASE stockyard_db OWNER stockyard_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE stockyard_db TO stockyard_user;

-- Enable UUID extension (used by Prisma for @id @default(uuid()))
\c stockyard_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\q
```

### 7.3 — Configure PostgreSQL for Remote Access (Optional)

If backend and database are on the same server, skip this. If separate servers:

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf
# Change: listen_addresses = 'localhost' → listen_addresses = '*'

# Edit pg_hba.conf — add remote access
sudo nano /etc/postgresql/16/main/pg_hba.conf
# Add at the bottom:
# host    stockyard_db    stockyard_user    0.0.0.0/0    scram-sha-256

sudo systemctl restart postgresql
```

### 7.4 — Update Prisma Schema

In `backend/prisma/schema.prisma`:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "windows", "debian-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"              // ← Changed from "sqlite"
  url      = env("DATABASE_URL")
}

// All models stay the same — Prisma handles the SQL dialect differences
// One exception: if you use any SQLite-specific syntax, remove it
```

### 7.5 — Generate New Migrations

```bash
cd /home/deploy/stockyard/backend

# Set the new DATABASE_URL
export DATABASE_URL="postgresql://stockyard_user:your_strong_password_here@localhost:5432/stockyard_db"

# Reset migrations for PostgreSQL
rm -rf prisma/migrations

# Create initial migration
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 7.6 — Seed Production Data

```bash
# Seed with admin user
npx tsx prisma/seed-production.ts
```

This creates the default admin: `project@primeinfraa.com` / `Xtrim@Q6`

### 7.7 — Data Migration (If You Have Existing SQLite Data)

If you have existing data in SQLite that needs to be migrated to PostgreSQL:

```bash
# Install pgloader (SQLite → PostgreSQL migration tool)
sudo apt install -y pgloader

# Create a migration script
cat > /tmp/migrate.load << 'EOF'
LOAD DATABASE
  FROM sqlite:///path/to/inventory.db
  INTO postgresql://stockyard_user:your_strong_password_here@localhost:5432/stockyard_db

WITH include no drop, create no tables, create no indexes,
     reset no sequences, data only

SET work_mem to '64MB', maintenance_work_mem to '512 MB';
EOF

pgloader /tmp/migrate.load
```

Alternatively, use a manual approach:
1. Export data from SQLite as JSON using a script
2. Import into PostgreSQL using Prisma seed scripts

---

## 8. Deploying the Backend API

### 8.1 — Clone the Repository

```bash
cd /home/deploy
git clone https://github.com/UtkarshMani/StockYard2Windows.git stockyard
cd stockyard
```

### 8.2 — Install Backend Dependencies

```bash
cd backend
npm install
```

### 8.3 — Create Production Environment File

```bash
nano /home/deploy/stockyard/backend/.env
```

Paste:
```env
# Server
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database (PostgreSQL)
DATABASE_URL="postgresql://stockyard_user:your_strong_password_here@localhost:5432/stockyard_db"

# Authentication
JWT_SECRET="REPLACE_WITH_RANDOM_64_CHAR_HEX"
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS — allow your frontend domains
CORS_ORIGIN=https://app.primeinfraa.com,https://primeinfraa.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
```

Generate a secure JWT secret:
```bash
openssl rand -hex 64
# Copy the output and paste it as JWT_SECRET
```

### 8.4 — Build the Backend

```bash
cd /home/deploy/stockyard/backend

# Generate Prisma client
npx prisma generate

# Compile TypeScript
npm run build

# Run migrations
npx prisma migrate deploy

# Seed database (first time only)
npx tsx prisma/seed-production.ts
```

### 8.5 — Test the Backend

```bash
node dist/server.js
# Should show: ✅ Server running on port 5000
```

Press `Ctrl+C` to stop. We'll run it with PM2 in Section 11.

---

## 9. Deploying the Frontend (Next.js)

### 9.1 — Create Frontend Environment File

```bash
nano /home/deploy/stockyard/frontend/.env.local
```

Paste:
```env
NEXT_PUBLIC_API_URL=https://api.primeinfraa.com/api/v1
```

### 9.2 — Install & Build

```bash
cd /home/deploy/stockyard/frontend
npm install
npm run build
```

### 9.3 — Test the Frontend

```bash
npm start
# Should show: Ready on http://localhost:3000
```

Press `Ctrl+C` to stop.

---

## 10. Nginx Reverse Proxy & SSL

Nginx acts as a reverse proxy — it listens on ports 80/443 and routes traffic to the backend and frontend.

### 10.1 — Install Nginx

```bash
sudo apt install -y nginx
```

### 10.2 — Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/stockyard
```

Paste:
```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name primeinfraa.com www.primeinfraa.com app.primeinfraa.com api.primeinfraa.com download.primeinfraa.com;
    return 301 https://$host$request_uri;
}

# Main Website (landing page + download)
server {
    listen 443 ssl http2;
    server_name primeinfraa.com www.primeinfraa.com download.primeinfraa.com;

    # SSL will be configured by Certbot
    ssl_certificate /etc/letsencrypt/live/primeinfraa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/primeinfraa.com/privkey.pem;

    # Serve the static website
    root /home/deploy/stockyard-website/public;
    index index.html;

    # Download page — serve installer files
    location /downloads/ {
        alias /home/deploy/stockyard-releases/;
        autoindex on;
        add_header Content-Disposition "attachment";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# StockYard Dashboard (Next.js Frontend)
server {
    listen 443 ssl http2;
    server_name app.primeinfraa.com;

    ssl_certificate /etc/letsencrypt/live/primeinfraa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/primeinfraa.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# StockYard API (Express Backend)
server {
    listen 443 ssl http2;
    server_name api.primeinfraa.com;

    ssl_certificate /etc/letsencrypt/live/primeinfraa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/primeinfraa.com/privkey.pem;

    # Increase body size for file uploads
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 10.3 — Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/stockyard /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default   # Remove default site
sudo nginx -t                               # Test configuration
sudo systemctl restart nginx
```

### 10.4 — Install SSL Certificates (Let's Encrypt — Free)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate for all subdomains
sudo certbot --nginx \
  -d primeinfraa.com \
  -d www.primeinfraa.com \
  -d app.primeinfraa.com \
  -d api.primeinfraa.com \
  -d download.primeinfraa.com

# Auto-renewal (Certbot sets this up automatically, verify):
sudo certbot renew --dry-run
```

### 10.5 — Test SSL

Open in browser:
- `https://app.primeinfraa.com` → StockYard Dashboard
- `https://api.primeinfraa.com/health` → API health check
- `https://primeinfraa.com` → Website

---

## 11. Process Management with PM2

PM2 keeps your Node.js processes running, restarts them on crash, and manages logs.

### 11.1 — Start Backend with PM2

```bash
cd /home/deploy/stockyard/backend
pm2 start dist/server.js \
  --name "stockyard-backend" \
  --env production \
  --max-memory-restart 500M \
  -- -p 5000
```

### 11.2 — Start Frontend with PM2

```bash
cd /home/deploy/stockyard/frontend
pm2 start npm \
  --name "stockyard-frontend" \
  -- start
```

### 11.3 — Enable Auto-Start on Boot

```bash
pm2 startup
# Run the command it gives you (e.g., sudo env PATH=...)
pm2 save
```

### 11.4 — Useful PM2 Commands

```bash
pm2 list                      # List all processes
pm2 logs                      # View all logs
pm2 logs stockyard-backend    # View backend logs
pm2 monit                     # Interactive monitoring
pm2 restart all               # Restart everything
pm2 reload stockyard-backend  # Zero-downtime restart
```

---

## 12. Building the Desktop App (Server-Connected Mode)

### Strategy

Two build variants of the desktop app:

| Variant | Use Case | Backend | Database |
|---------|----------|---------|----------|
| **Standalone** (current) | Offline use, single user | Embedded (local) | Local SQLite |
| **Server-Connected** (new) | Multi-user, cloud | Cloud API | Cloud PostgreSQL |

### 12.1 — Build Server-Connected Windows Installer

On your **build machine** (Linux):

```bash
cd /path/to/StockYard2

# Step 1: Set the cloud API URL for the frontend
cd frontend
echo 'NEXT_PUBLIC_API_URL=https://api.primeinfraa.com/api/v1' > .env.local
npm run build
cd ..

# Step 2: Build backend (still included as fallback)
cd backend
npm run build
cd ..

# Step 3: Build Windows installer
npx electron-builder --win --x64
```

The installer will be in `dist/StockYard-1.0.0-Setup.exe`.

When users install this version, the frontend will connect to `https://api.primeinfraa.com` instead of `localhost:5000`.

### 12.2 — Host the Installer for Download

```bash
# On the cloud server, create a releases directory
mkdir -p /home/deploy/stockyard-releases

# Upload the installer from build machine
scp dist/StockYard-1.0.0-Setup.exe deploy@YOUR_SERVER_IP:/home/deploy/stockyard-releases/
scp dist/StockYard-1.0.0-Portable.exe deploy@YOUR_SERVER_IP:/home/deploy/stockyard-releases/
```

The installer is now available at: `https://download.primeinfraa.com/downloads/StockYard-1.0.0-Setup.exe`

### 12.3 — Linux Installer (Optional)

```bash
npx electron-builder --linux --x64
scp dist/StockYard-1.0.0.AppImage deploy@YOUR_SERVER_IP:/home/deploy/stockyard-releases/
```

---

## 13. Public Website with Download Page

### 13.1 — Create the Website

Create a simple, professional landing page for StockYard:

```bash
# On the server
mkdir -p /home/deploy/stockyard-website/public
nano /home/deploy/stockyard-website/public/index.html
```

Paste the following HTML (a clean, professional landing page):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StockYard — Inventory Management System</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; }
    
    /* Hero Section */
    .hero {
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      color: white; padding: 80px 20px; text-align: center; min-height: 90vh;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
    }
    .hero h1 { font-size: 3.5rem; margin-bottom: 20px; letter-spacing: -1px; }
    .hero .subtitle { font-size: 1.3rem; opacity: 0.85; max-width: 600px; margin-bottom: 40px; line-height: 1.6; }
    .hero .badge { background: rgba(255,255,255,0.15); padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; margin-bottom: 30px; display: inline-block; }
    
    /* Buttons */
    .btn-group { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
    .btn {
      padding: 14px 32px; border-radius: 8px; font-size: 1.05rem; font-weight: 600;
      text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
    .btn-primary { background: #4f46e5; color: white; }
    .btn-secondary { background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); }
    .btn-download { background: #059669; color: white; }
    
    /* Features */
    .features { padding: 80px 20px; max-width: 1100px; margin: 0 auto; }
    .features h2 { text-align: center; font-size: 2.2rem; margin-bottom: 50px; }
    .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
    .feature-card {
      padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;
      transition: box-shadow 0.2s;
    }
    .feature-card:hover { box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .feature-card .icon { font-size: 2rem; margin-bottom: 12px; }
    .feature-card h3 { font-size: 1.2rem; margin-bottom: 8px; }
    .feature-card p { color: #6b7280; line-height: 1.5; }
    
    /* Download Section */
    .download {
      background: #f8fafc; padding: 80px 20px; text-align: center;
    }
    .download h2 { font-size: 2.2rem; margin-bottom: 16px; }
    .download p { color: #6b7280; margin-bottom: 40px; font-size: 1.1rem; }
    .download-cards { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; }
    .download-card {
      background: white; border: 1px solid #e5e7eb; padding: 30px; border-radius: 12px;
      min-width: 260px; text-align: center;
    }
    .download-card .os-icon { font-size: 2.5rem; margin-bottom: 12px; }
    .download-card h3 { margin-bottom: 8px; }
    .download-card .version { color: #9ca3af; font-size: 0.85rem; margin-bottom: 16px; }

    /* Access Section */
    .access {
      padding: 60px 20px; text-align: center; max-width: 700px; margin: 0 auto;
    }
    .access h2 { font-size: 2rem; margin-bottom: 16px; }
    .access p { color: #6b7280; margin-bottom: 30px; line-height: 1.6; }
    
    /* Footer */
    footer {
      background: #1a1a2e; color: rgba(255,255,255,0.6); padding: 30px 20px;
      text-align: center; font-size: 0.9rem;
    }
    footer a { color: rgba(255,255,255,0.8); text-decoration: none; }
  </style>
</head>
<body>

  <!-- Hero -->
  <section class="hero">
    <div class="badge">📦 v1.0.0 — Inventory Management System</div>
    <h1>StockYard</h1>
    <p class="subtitle">
      Manage inventory, projects, purchase orders, gate passes, and stock movements 
      from anywhere. Built for teams that need real-time collaboration across multiple locations.
    </p>
    <div class="btn-group">
      <a href="https://app.primeinfraa.com" class="btn btn-primary">🚀 Open Dashboard</a>
      <a href="#download" class="btn btn-download">⬇ Download Desktop App</a>
      <a href="#features" class="btn btn-secondary">Learn More →</a>
    </div>
  </section>

  <!-- Features -->
  <section class="features" id="features">
    <h2>Everything You Need</h2>
    <div class="feature-grid">
      <div class="feature-card">
        <div class="icon">📊</div>
        <h3>Real-Time Dashboard</h3>
        <p>Live analytics, stock levels, project progress, and alerts — all in one view. Multiple users see updates instantly.</p>
      </div>
      <div class="feature-card">
        <div class="icon">👥</div>
        <h3>Multi-User Roles</h3>
        <p>Admin, Project Manager, Warehouse Staff, Gate Pass Staff — each with customizable permissions and dashboards.</p>
      </div>
      <div class="feature-card">
        <div class="icon">📋</div>
        <h3>Requirements System</h3>
        <p>Project managers raise material requirements from any location. Track approvals, purchase orders, and deliveries.</p>
      </div>
      <div class="feature-card">
        <div class="icon">🔖</div>
        <h3>Barcode Scanning</h3>
        <p>Scan items using your phone camera or barcode reader for instant stock-in and stock-out operations.</p>
      </div>
      <div class="feature-card">
        <div class="icon">🌍</div>
        <h3>Access from Anywhere</h3>
        <p>Use the web dashboard from any device with a browser — laptop, tablet, or phone. Or install the desktop app.</p>
      </div>
      <div class="feature-card">
        <div class="icon">📄</div>
        <h3>PDF Reports</h3>
        <p>Generate professional gate passes, purchase orders, and inventory reports as PDFs for printing or emailing.</p>
      </div>
    </div>
  </section>

  <!-- Download -->
  <section class="download" id="download">
    <h2>Download StockYard</h2>
    <p>Install the desktop app for the full experience with offline capability.</p>
    <div class="download-cards">
      <div class="download-card">
        <div class="os-icon">🪟</div>
        <h3>Windows</h3>
        <div class="version">v1.0.0 • 64-bit • ~90MB</div>
        <a href="/downloads/StockYard-1.0.0-Setup.exe" class="btn btn-download" style="width:100%;justify-content:center">
          ⬇ Download Installer (.exe)
        </a>
        <br><br>
        <a href="/downloads/StockYard-1.0.0-Portable.exe" class="btn btn-secondary" style="width:100%;justify-content:center;color:#1a1a2e;border-color:#d1d5db">
          📁 Portable Version
        </a>
      </div>
      <div class="download-card">
        <div class="os-icon">🐧</div>
        <h3>Linux</h3>
        <div class="version">v1.0.0 • 64-bit • ~85MB</div>
        <a href="/downloads/StockYard-1.0.0.AppImage" class="btn btn-download" style="width:100%;justify-content:center">
          ⬇ Download AppImage
        </a>
      </div>
      <div class="download-card">
        <div class="os-icon">🌐</div>
        <h3>Web App</h3>
        <div class="version">Always up-to-date • No install</div>
        <a href="https://app.primeinfraa.com" class="btn btn-primary" style="width:100%;justify-content:center">
          🚀 Open in Browser
        </a>
      </div>
    </div>
  </section>

  <!-- Access -->
  <section class="access">
    <h2>Already have an account?</h2>
    <p>
      Open the web dashboard from any device. Your admin will provide your login credentials.
      Use the same account on the desktop app, web app, or phone browser.
    </p>
    <a href="https://app.primeinfraa.com/login" class="btn btn-primary">🔐 Sign In to Dashboard</a>
  </section>

  <!-- Footer -->
  <footer>
    <p>© 2026 Prime Infraa Engineering Pvt Ltd. All rights reserved.</p>
    <p style="margin-top:8px"><a href="https://app.primeinfraa.com">Dashboard</a> · <a href="#download">Download</a> · <a href="mailto:support@primeinfraa.com">Support</a></p>
  </footer>

</body>
</html>
```

### 13.2 — Upload New Releases

When you build a new version:

```bash
# On your build machine, after building:
scp dist/StockYard-1.0.0-Setup.exe deploy@YOUR_SERVER_IP:/home/deploy/stockyard-releases/
scp dist/StockYard-1.0.0-Portable.exe deploy@YOUR_SERVER_IP:/home/deploy/stockyard-releases/
scp dist/StockYard-1.0.0.AppImage deploy@YOUR_SERVER_IP:/home/deploy/stockyard-releases/
```

### 13.3 — Automate with GitHub Releases (Advanced)

Instead of manually uploading, use GitHub Actions to automatically build and publish:

```yaml
# .github/workflows/release.yml
name: Build & Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: cd backend && npm install && npm run build
      - run: cd frontend && npm install && npm run build
        env:
          NEXT_PUBLIC_API_URL: https://api.primeinfraa.com/api/v1
      - run: npx electron-builder --win --x64
      - uses: softprops/action-gh-release@v1
        with:
          files: |
            dist/StockYard-*-Setup.exe
            dist/StockYard-*-Portable.exe

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: cd backend && npm install && npm run build
      - run: cd frontend && npm install && npm run build
        env:
          NEXT_PUBLIC_API_URL: https://api.primeinfraa.com/api/v1
      - run: npx electron-builder --linux --x64
      - uses: softprops/action-gh-release@v1
        with:
          files: dist/StockYard-*.AppImage
```

Then your download page can link to GitHub releases:
```
https://github.com/UtkarshMani/StockYard2Windows/releases/latest
```

---

## 14. User Management & Multi-Dashboard Access

### Current Role System

StockYard already has a multi-role system built in:

| Role | Permissions | Dashboard View |
|------|------------|----------------|
| **admin** | Full access to everything | Analytics, all modules, user management |
| **project_manager** | Manage projects, raise requirements, view inventory | Projects dashboard, requirement forms |
| **warehouse_staff** | Stock in/out, inventory management | Inventory, stock movements, categories |
| **gatepass_staff** | Create/manage gate passes | Gate pass dashboard |

### 14.1 — Creating Users

After deploying, log in as admin and create users:

1. Go to `https://app.primeinfraa.com/login`
2. Login: `project@primeinfraa.com` / `Xtrim@Q6`
3. Navigate to **Users** → **Add User**
4. Create users for each team member with appropriate roles

### 14.2 — Permission System

The existing fine-grained permission system allows per-resource access control:

| Resource | canView | canCreate | canEdit | canDelete |
|----------|---------|-----------|---------|-----------|
| inventory | ✅ | ✅ | ✅ | ❌ |
| projects | ✅ | ✅ | ✅ | ❌ |
| gatepass | ✅ | ✅ | ❌ | ❌ |
| purchase_orders | ✅ | ❌ | ❌ | ❌ |
| suppliers | ✅ | ❌ | ❌ | ❌ |
| users | ❌ | ❌ | ❌ | ❌ |
| analytics | ✅ | ❌ | ❌ | ❌ |
| settings | ❌ | ❌ | ❌ | ❌ |

### 14.3 — Multi-Location Access Scenarios

```
┌─────────────────────────────────────────────────────────┐
│                  CLOUD SERVER                            │
│             api.primeinfraa.com                          │
│                                                          │
│  Backend API ←→ PostgreSQL Database                      │
│  All data centralized, all users authenticated           │
└──────────────┬──────────────┬──────────────┬────────────┘
               │              │              │
     ┌─────────▼──────┐  ┌───▼───────┐  ┌───▼───────────┐
     │ Delhi HQ        │  │ Mumbai    │  │ Site Visit    │
     │ (Office)        │  │ (Site)    │  │ (Travel)      │
     │                 │  │           │  │               │
     │ Admin           │  │ PM raises │  │ Warehouse     │
     │ Full dashboard  │  │ material  │  │ staff does    │
     │ Desktop app or  │  │ requests  │  │ stock-in via  │
     │ browser         │  │ Browser   │  │ phone browser │
     └────────────────┘  └───────────┘  └───────────────┘
```

### 14.4 — Suggested Workflow Enhancements (Future Code Changes)

These are features to consider adding in the codebase:

| Feature | Description | Benefit |
|---------|-------------|---------|
| **Email notifications** | Alert PMs when requirements are approved/rejected | Remote PMs stay informed |
| **Push notifications** | Browser push for stock alerts | Real-time awareness |
| **Project-scoped views** | Each PM sees only their projects | Data isolation |
| **Activity feed** | Real-time feed of actions across the org | Team awareness |
| **Mobile-responsive improvements** | Better touch UI for phone users | Field workers can use phones |
| **Offline sync** | Desktop app queues actions when offline, syncs when online | For field workers with poor internet |

---

## 15. CI/CD — Automated Deployments

### 15.1 — Simple Deploy Script

Create a deployment script on the server:

```bash
nano /home/deploy/deploy.sh
```

Paste:
```bash
#!/bin/bash
set -e

echo "🚀 Deploying StockYard..."

cd /home/deploy/stockyard

# Pull latest code
git pull origin main

# Backend
echo "📦 Building backend..."
cd backend
npm install --production
npx prisma generate
npm run build
npx prisma migrate deploy
cd ..

# Frontend
echo "🎨 Building frontend..."
cd frontend
npm install --production
npm run build
cd ..

# Restart services
echo "🔄 Restarting services..."
pm2 restart stockyard-backend
pm2 restart stockyard-frontend

echo "✅ Deployment complete!"
```

```bash
chmod +x /home/deploy/deploy.sh
```

To deploy: just SSH in and run `./deploy.sh`.

### 15.2 — GitHub Actions Auto-Deploy (Advanced)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Server

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: deploy
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: /home/deploy/deploy.sh
```

Set these GitHub Secrets:
- `SERVER_HOST`: Your server IP
- `SSH_PRIVATE_KEY`: Your deployment SSH key

### 15.3 — Webhook Deploy (Simple Alternative)

On the server, create a webhook endpoint:

```bash
# Install webhook tool
sudo apt install -y webhook

# Create webhook config
cat > /home/deploy/hooks.json << 'EOF'
[
  {
    "id": "deploy-stockyard",
    "execute-command": "/home/deploy/deploy.sh",
    "command-working-directory": "/home/deploy",
    "trigger-rule": {
      "match": {
        "type": "payload-hmac-sha256",
        "secret": "YOUR_WEBHOOK_SECRET",
        "parameter": {
          "source": "header",
          "name": "X-Hub-Signature-256"
        }
      }
    }
  }
]
EOF

# Run webhook listener
pm2 start webhook -- -hooks /home/deploy/hooks.json -verbose
```

In GitHub → Settings → Webhooks → Add: `https://api.primeinfraa.com/hooks/deploy-stockyard`

---

## 16. Backups & Disaster Recovery

### 16.1 — Automated PostgreSQL Backups

```bash
# Create backup script
nano /home/deploy/backup-db.sh
```

Paste:
```bash
#!/bin/bash
BACKUP_DIR="/home/deploy/backups/db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="stockyard_db_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Dump and compress
pg_dump -U stockyard_user -h localhost stockyard_db | gzip > "$BACKUP_DIR/$FILENAME"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Backup created: $FILENAME"
```

```bash
chmod +x /home/deploy/backup-db.sh

# Run daily at 2 AM
crontab -e
# Add:
0 2 * * * /home/deploy/backup-db.sh >> /home/deploy/backups/backup.log 2>&1
```

### 16.2 — Off-Server Backups (Critical!)

Never keep backups only on the same server. Sync to:

**Option A: Sync to your office NAS**
```bash
# Install rclone
sudo apt install -y rclone

# Or rsync to office server (requires VPN or SSH access)
rsync -avz /home/deploy/backups/ admin@OFFICE_IP:/mnt/nas/backups/stockyard/
```

**Option B: Sync to cloud storage (S3/Backblaze B2)**
```bash
# Configure rclone for Backblaze B2 (cheapest: $0.005/GB/month)
rclone config
# Follow interactive setup for 'b2' provider

# Sync backups
rclone sync /home/deploy/backups/ b2:stockyard-backups/
```

**Option C: DigitalOcean Spaces (if using DO)**
```bash
# Already integrated, enable droplet backups in DO dashboard ($1.20/mo)
```

### 16.3 — Restore from Backup

```bash
# Decompress and restore
gunzip < /home/deploy/backups/db/stockyard_db_20260301_020000.sql.gz | \
  psql -U stockyard_user -h localhost stockyard_db
```

### 16.4 — Full Server Snapshots

Most cloud providers offer server snapshots:
- **DigitalOcean:** Droplet → Snapshots → Create Snapshot (~$0.06/GB/month)
- **AWS:** EBS Snapshots
- **Hetzner:** Snapshots (free for up to 1)

Create a snapshot before major updates.

---

## 17. Security Hardening

### 17.1 — SSH Hardening

```bash
sudo nano /etc/ssh/sshd_config
```

Change:
```
PermitRootLogin no
PasswordAuthentication no                # Key-only access
AllowUsers deploy
MaxAuthTries 3
```

```bash
sudo systemctl restart sshd
```

### 17.2 — Fail2Ban (Block Brute Force)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban

# Configure
sudo nano /etc/fail2ban/jail.local
```

Paste:
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
```

```bash
sudo systemctl restart fail2ban
```

### 17.3 — API Security Checklist

| Security Measure | Status | Details |
|-----------------|--------|---------|
| HTTPS (SSL/TLS) | ✅ Set up in Section 10 | Let's Encrypt auto-renewal |
| CORS restrictions | ✅ Set in .env | Only allow your domains |
| JWT authentication | ✅ Already built | Tokens expire in 15min |
| Rate limiting | ✅ Already built | 100 requests per 15min window |
| Helmet.js headers | ✅ Already built | XSS protection, CSP, etc. |
| Input validation | ✅ Already built (Zod) | All endpoints validated |
| SQL injection | ✅ Prisma ORM | Parameterized queries |
| Password hashing | ✅ bcryptjs, 12 rounds | Salted and hashed |
| Audit logging | ✅ Already built | All actions logged |
| Firewall (UFW) | ✅ Set in Section 4 | Only 22, 80, 443 open |

### 17.4 — Environment Variables Security

Never commit `.env` files to Git:

```bash
# Add to .gitignore (should already be there):
echo "backend/.env" >> .gitignore
echo "frontend/.env.local" >> .gitignore
```

### 17.5 — Regular Updates

```bash
# Set up unattended security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 18. Monitoring & Logging

### 18.1 — PM2 Monitoring

```bash
# Built-in monitoring
pm2 monit

# Log rotation (prevent disk fill-up)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 18.2 — Simple Health Check Script

```bash
nano /home/deploy/healthcheck.sh
```

Paste:
```bash
#!/bin/bash
# Check if services are responding

BACKEND=$(curl -s -o /dev/null -w "%{http_code}" https://api.primeinfraa.com/health)
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" https://app.primeinfraa.com)

if [ "$BACKEND" != "200" ]; then
  echo "⚠️ Backend is DOWN (HTTP $BACKEND)" | mail -s "StockYard Alert: Backend Down" admin@primeinfraa.com
  pm2 restart stockyard-backend
fi

if [ "$FRONTEND" != "200" ]; then
  echo "⚠️ Frontend is DOWN (HTTP $FRONTEND)" | mail -s "StockYard Alert: Frontend Down" admin@primeinfraa.com
  pm2 restart stockyard-frontend
fi
```

```bash
chmod +x /home/deploy/healthcheck.sh

# Run every 5 minutes
crontab -e
# Add:
*/5 * * * * /home/deploy/healthcheck.sh >> /home/deploy/healthcheck.log 2>&1
```

### 18.3 — UptimeRobot (Free External Monitoring)

1. Go to https://uptimerobot.com/ (free tier: 50 monitors)
2. Add monitors:
   - **HTTP(s)** → `https://api.primeinfraa.com/health`
   - **HTTP(s)** → `https://app.primeinfraa.com`
3. Set alert contacts (email, SMS, Telegram)
4. Get notified if your server goes down

### 18.4 — Disk Space Monitoring

```bash
# Add to crontab — alert if disk > 80%
echo '0 */6 * * * df -h / | awk "NR==2 && int(\$5)>80 {print \"⚠️ Disk at \"\$5}" | mail -s "StockYard: Disk Alert" admin@primeinfraa.com' | crontab -
```

---

## 19. Scaling for the Future

### When to Scale?

| Users | Server Spec | Notes |
|-------|-------------|-------|
| 1–20 | 1 vCPU, 1GB RAM | Starter (current guide) |
| 20–100 | 2 vCPU, 4GB RAM | Upgrade droplet size |
| 100–500 | 4 vCPU, 8GB RAM + separate DB | Move PostgreSQL to managed service |
| 500+ | Multiple servers + load balancer | Contact a DevOps engineer |

### Easy Upgrades

**Vertical scaling (bigger server):**
- DigitalOcean: Droplet → Resize → Select larger plan → Done (~2 min downtime)
- Most providers support this

**Managed Database (remove DB management burden):**
- DigitalOcean Managed PostgreSQL: $15/mo
- AWS RDS: ~$15/mo
- Supabase: Free tier available, then $25/mo

**CDN for Frontend:**
- Host Next.js on Vercel (free tier) → Automatic global CDN
- Or use Cloudflare Pages

### Alternative: Vercel + Railway (No Server Management)

Instead of managing a VPS yourself, use managed platforms:

| Service | What | Cost |
|---------|------|------|
| **Vercel** (frontend) | Host Next.js frontend + static website | Free (hobby) / $20/mo (pro) |
| **Railway** (backend) | Host Express backend | $5/mo |
| **Supabase** (database) | Managed PostgreSQL | Free (500MB) / $25/mo |

This eliminates all server management (no Nginx, no PM2, no SSL setup, no OS updates).

```
Frontend: https://stockyard-frontend.vercel.app → CNAME to app.primeinfraa.com
Backend:  https://stockyard-backend.railway.app → CNAME to api.primeinfraa.com
Database: postgresql://user:pass@db.supabase.co:5432/stockyard
```

---

## 20. Cost Estimation

### Monthly Costs

| Item | Service | Cost (₹) | Cost ($) | Notes |
|------|---------|-----------|----------|-------|
| VPS Server | DigitalOcean / Hetzner | ₹400–500 | $5–6 | 1 vCPU, 1-4GB RAM |
| Domain | Namecheap / Cloudflare | ₹70/mo | ~$1 | ~$10/year |
| SSL Certificate | Let's Encrypt | Free | Free | Auto-renewal |
| DNS + CDN | Cloudflare | Free | Free | Free tier |
| Monitoring | UptimeRobot | Free | Free | Free tier |
| Off-site Backup | Backblaze B2 / Own NAS | Free–₹50 | $0–1 | 10GB free |
| **TOTAL** | | **₹470–620/mo** | **$6–8/mo** | |

### One-Time Costs

| Item | Cost | Notes |
|------|------|-------|
| Domain registration | ₹830 ($10) / year | One time purchase, renew yearly |
| Time to set up | 4–6 hours | Following this guide |

### Comparison with Commercial Solutions

| Solution | Monthly Cost | Limitations |
|----------|-------------|-------------|
| **StockYard (self-hosted)** | ₹500/mo ($6) | Unlimited users, full control |
| Zoho Inventory | ₹4,000/mo ($50) | Limited to 2 warehouses |
| Cin7 | ₹25,000/mo ($300) | Enterprise pricing |
| TradeGecko | ₹15,000/mo ($180) | Per-user pricing |

---

## 21. Quick Reference Card

### URLs (After Full Setup)

| Service | URL |
|---------|-----|
| Main Website | https://primeinfraa.com |
| Dashboard (Web) | https://app.primeinfraa.com |
| API | https://api.primeinfraa.com |
| API Health Check | https://api.primeinfraa.com/health |
| API Documentation | https://api.primeinfraa.com/api-docs |
| Software Download | https://primeinfraa.com/#download |
| Server SSH | `ssh deploy@134.209.154.XX` |

### Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| StockYard Admin | project@primeinfraa.com | Xtrim@Q6 |
| Server SSH | deploy | (SSH key-based) |
| PostgreSQL | stockyard_user | (your password) |

### Key Files on Server

| File | Path |
|------|------|
| Backend code | `/home/deploy/stockyard/backend/` |
| Frontend code | `/home/deploy/stockyard/frontend/` |
| Backend .env | `/home/deploy/stockyard/backend/.env` |
| Frontend .env | `/home/deploy/stockyard/frontend/.env.local` |
| Nginx config | `/etc/nginx/sites-available/stockyard` |
| Website files | `/home/deploy/stockyard-website/public/` |
| Download files | `/home/deploy/stockyard-releases/` |
| DB backups | `/home/deploy/backups/db/` |
| Deploy script | `/home/deploy/deploy.sh` |
| PM2 logs | `~/.pm2/logs/` |

### Common Commands

```bash
# Deploy latest code
./deploy.sh

# View processes
pm2 list

# View logs
pm2 logs stockyard-backend
pm2 logs stockyard-frontend

# Restart
pm2 restart all

# Database backup (manual)
./backup-db.sh

# Check disk space
df -h

# Check PostgreSQL
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'stockyard_db';"
```

---

## 22. Troubleshooting

### Problem: "CORS error" in browser

**Cause:** The frontend domain is not in the CORS allowed origins list.

**Fix:**
```bash
# Edit backend .env
nano /home/deploy/stockyard/backend/.env
# Make sure CORS_ORIGIN includes your frontend domain:
CORS_ORIGIN=https://app.primeinfraa.com,https://primeinfraa.com

pm2 restart stockyard-backend
```

### Problem: "502 Bad Gateway" from Nginx

**Cause:** Backend or frontend process crashed.

**Fix:**
```bash
pm2 list            # Check if processes are running
pm2 logs            # Check error logs
pm2 restart all     # Restart
```

### Problem: "Database connection refused"

**Cause:** PostgreSQL is not running or credentials are wrong.

**Fix:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection manually
psql -U stockyard_user -h localhost -d stockyard_db

# Check DATABASE_URL in .env
cat /home/deploy/stockyard/backend/.env | grep DATABASE_URL
```

### Problem: SSL certificate not working

**Cause:** Certificate expired or not generated.

**Fix:**
```bash
# Check certificate
sudo certbot certificates

# Renew
sudo certbot renew

# Force renew
sudo certbot renew --force-renewal
sudo systemctl restart nginx
```

### Problem: Desktop app "Network Error" / "Connection refused"

**Cause:** App is trying to connect to `localhost:5000` instead of the cloud server.

**Fix:** The desktop installer was built without the server URL. Rebuild:
```bash
cd frontend
echo 'NEXT_PUBLIC_API_URL=https://api.primeinfraa.com/api/v1' > .env.local
npm run build
cd ..
npx electron-builder --win --x64
```

### Problem: "SQLITE_BUSY" / Database locked

**Cause:** Still using SQLite with multiple concurrent users.

**Fix:** Migrate to PostgreSQL (Section 7). This is the reason this guide exists.

### Problem: Server runs out of disk space

**Fix:**
```bash
# Check which directories are large
du -sh /home/deploy/*

# Clean old backups
find /home/deploy/backups -mtime +30 -delete

# Clean PM2 logs
pm2 flush

# Clean npm cache
npm cache clean --force

# Clean apt cache
sudo apt autoremove -y
sudo apt clean
```

### Problem: Slow performance

**Diagnosis:**
```bash
# Check system resources
htop

# Check if it's the database
pm2 logs stockyard-backend | grep "Duration"

# Check PostgreSQL
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname = 'stockyard_db';"
```

**Fix:** Upgrade the server plan (Section 19) or add database indexes.

---

## Deployment Checklist

Use this checklist when deploying:

```
□ VPS created and SSH access works
□ Domain purchased and DNS configured
□ Node.js installed
□ PostgreSQL installed and database created
□ Backend code cloned and .env configured
□ Prisma schema updated to PostgreSQL
□ Migrations run and database seeded
□ Backend builds and starts correctly
□ Frontend .env.local configured with API URL
□ Frontend builds and starts correctly
□ Nginx configured with reverse proxy
□ SSL certificates installed (Let's Encrypt)
□ PM2 running both backend + frontend
□ PM2 startup enabled (survives reboot)
□ Firewall configured (22, 80, 443 only)
□ Automated backups configured (cron)
□ Website HTML deployed
□ Download files uploaded
□ Desktop installer built with server URL
□ All URLs tested:
  □ https://primeinfraa.com (website)
  □ https://app.primeinfraa.com (dashboard)
  □ https://api.primeinfraa.com/health (API)
  □ https://primeinfraa.com/#download (downloads)
□ User accounts created for team members
□ UptimeRobot monitoring configured
□ SSH key-only access enabled (password disabled)
□ Fail2Ban installed
□ Off-server backups configured
```

---

## Summary

After following this guide, you will have:

1. ✅ **Cloud-hosted backend** — accessible from anywhere via the internet
2. ✅ **PostgreSQL database** — handles multiple concurrent users without locking
3. ✅ **Multi-user dashboards** — admin, project managers, warehouse staff, all at the same time
4. ✅ **Project managers raise requirements remotely** — from any browser, any location
5. ✅ **Public website** — professional landing page at `primeinfraa.com`
6. ✅ **Software download page** — Windows/Linux installers available for download
7. ✅ **Desktop app connected to cloud** — Electron app talks to the server, not local database
8. ✅ **HTTPS everywhere** — encrypted, secure, professional
9. ✅ **Automated deployments** — push to Git, it deploys
10. ✅ **Automated backups** — daily PostgreSQL dumps, synced off-server
11. ✅ **Monitoring & alerts** — notified when something goes down
12. ✅ **Costs under ₹500/month** — fraction of commercial alternatives
