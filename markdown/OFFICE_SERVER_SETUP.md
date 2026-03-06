# Office Server Setup Guide

> Turn an old laptop/desktop into a NAS + Local Server for your office.
> Host apps (StockYard, etc.), databases, and file storage — accessible from any PC on the network.

---

## Table of Contents

1. [Hardware Requirements](#1-hardware-requirements)
2. [Installing Ubuntu Server](#2-installing-ubuntu-server)
3. [Initial Server Configuration](#3-initial-server-configuration)
4. [Setting a Static IP Address](#4-setting-a-static-ip-address)
5. [SSH Remote Access](#5-ssh-remote-access)
6. [Wake-on-LAN (WoL)](#6-wake-on-lan-wol)
7. [NAS — Network Attached Storage (Samba)](#7-nas--network-attached-storage-samba)
8. [Installing Node.js](#8-installing-nodejs)
9. [Hosting StockYard (Backend + Frontend)](#9-hosting-stockyard-backend--frontend)
10. [Running Apps as System Services](#10-running-apps-as-system-services)
11. [Installing & Hosting Databases](#11-installing--hosting-databases)
12. [Nginx Reverse Proxy](#12-nginx-reverse-proxy)
13. [Auto-Start Everything on Boot](#13-auto-start-everything-on-boot)
14. [Firewall Configuration](#14-firewall-configuration)
15. [Accessing from Other PCs](#15-accessing-from-other-pcs)
16. [Backups](#16-backups)
17. [Optional: Docker Setup](#17-optional-docker-setup)
18. [Troubleshooting](#18-troubleshooting)
19. [Desktop App Connecting to Server Database](#19-desktop-app-connecting-to-server-database)
20. [Remote Access from Outside the Office (VPN)](#20-remote-access-from-outside-the-office-vpn)
21. [Remote Access via Cloudflare Tunnel (No VPN)](#21-remote-access-via-cloudflare-tunnel-no-vpn)

---

## 1. Hardware Requirements

### Minimum (for small office, 5-10 users)
- **CPU:** Any dual-core (Intel i3/i5 or AMD equivalent)
- **RAM:** 4 GB minimum, 8 GB recommended
- **Storage:** 128 GB SSD (for OS + apps) + optional HDD for file storage
- **Network:** Ethernet port (Wi-Fi works but Ethernet is much more reliable)
- **UPS:** Strongly recommended to prevent data corruption during power cuts

### Prepare Before Starting
- A USB drive (8 GB+) for the Ubuntu installer
- An Ethernet cable to connect the laptop/desktop to your office router/switch
- Note down your office network details:
  - Router IP (usually `192.168.1.1` or `192.168.0.1`)
  - Available IP range for static assignment

---

## 2. Installing Ubuntu Server

### Step 1: Download Ubuntu Server
Go to: https://ubuntu.com/download/server

Download **Ubuntu Server 24.04 LTS** (Long Term Support — 5 years of updates).

### Step 2: Create Bootable USB

**On Windows:**
1. Download Rufus: https://rufus.ie
2. Insert USB drive
3. Open Rufus:
   - Device: Select your USB drive
   - Boot selection: Select the downloaded Ubuntu ISO
   - Partition scheme: GPT
   - Click **START**
4. Wait for it to finish

**On Linux:**
```bash
# Find your USB drive
lsblk

# Create bootable USB (replace /dev/sdX with your USB device)
sudo dd if=ubuntu-24.04-live-server-amd64.iso of=/dev/sdX bs=4M status=progress
sync
```

### Step 3: Boot from USB
1. Insert USB into the old laptop/desktop
2. Power on and press the boot menu key:
   - **Dell:** F12
   - **HP:** F9
   - **Lenovo:** F12
   - **Acer:** F12
   - **ASUS:** F8 or ESC
3. Select the USB drive to boot from

### Step 4: Install Ubuntu Server
Follow the installer:

1. **Language:** English
2. **Keyboard:** English (US) or your preferred layout
3. **Installation type:** Ubuntu Server (minimized)
4. **Network:** It should auto-detect your Ethernet connection. Note the IP assigned (e.g., `192.168.1.105`)
5. **Proxy:** Leave blank (unless your office uses one)
6. **Mirror:** Leave default
7. **Storage:**
   - Select **Use an entire disk**
   - Choose your primary disk (SSD if available)
   - Confirm the partition layout
8. **Profile setup:**
   - Your name: `Admin` (or your name)
   - Server name: `office-server`
   - Username: `admin` (or your preferred username)
   - Password: Choose a strong password — **write it down**
9. **SSH:** ✅ Check **Install OpenSSH server** (very important!)
10. **Featured snaps:** Skip (press Done)
11. Wait for installation to complete
12. Remove USB and reboot

### Step 5: First Login
After reboot, you'll see a login prompt:
```
office-server login: admin
Password: ********
```

---

## 3. Initial Server Configuration

### Update the System
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Essential Tools
```bash
sudo apt install -y \
  curl wget git htop net-tools \
  build-essential software-properties-common \
  unzip zip tree nano vim \
  ethtool wakeonlan
```

### Set Timezone
```bash
# List available timezones
timedatectl list-timezones | grep Asia

# Set your timezone (example: India)
sudo timedatectl set-timezone Asia/Kolkata

# Verify
date
```

### Set Hostname (if you didn't during install)
```bash
sudo hostnamectl set-hostname office-server
```

---

## 4. Setting a Static IP Address

A static IP ensures the server always has the same address on your network.

### Find Your Current Network Info
```bash
# Find your network interface name (usually eth0, ens33, enp3s0, etc.)
ip addr show

# Find your gateway (router IP)
ip route | grep default
```

Note down:
- Interface name (e.g., `enp3s0`)
- Current IP (e.g., `192.168.1.105`)
- Gateway (e.g., `192.168.1.1`)

### Configure Static IP
```bash
sudo nano /etc/netplan/50-cloud-init.yaml
```

Replace the contents with (adjust values to match your network):
```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:                    # ← Replace with YOUR interface name
      dhcp4: no
      addresses:
        - 192.168.1.100/24     # ← Your chosen static IP
      routes:
        - to: default
          via: 192.168.1.1     # ← Your router/gateway IP
      nameservers:
        addresses:
          - 8.8.8.8            # Google DNS
          - 8.8.4.4            # Google DNS backup
```

Apply the configuration:
```bash
sudo netplan apply
```

Verify:
```bash
ip addr show
ping google.com
```

### Reserve the IP on Your Router (Recommended)
Log into your router (usually `192.168.1.1` in a browser) and reserve the IP `192.168.1.100` for this server's MAC address. This prevents IP conflicts.

Find your MAC address:
```bash
ip link show enp3s0 | grep ether
```

---

## 5. SSH Remote Access

SSH lets you manage the server from any PC without needing a monitor/keyboard attached.

### SSH is Already Installed (from Step 2.4)
Verify it's running:
```bash
sudo systemctl status ssh
```

### Connect from Another PC

**From Windows:**
Open PowerShell or Command Prompt:
```cmd
ssh admin@192.168.1.100
```

Or use **PuTTY**: https://www.putty.org/

**From Linux/Mac:**
```bash
ssh admin@192.168.1.100
```

### Secure SSH (Optional but Recommended)
```bash
sudo nano /etc/ssh/sshd_config
```

Change these settings:
```
Port 2222                        # Change from default 22
PermitRootLogin no               # Disable root login
PasswordAuthentication yes       # Keep password auth for now
MaxAuthTries 3                   # Limit login attempts
```

Restart SSH:
```bash
sudo systemctl restart ssh
```

Now connect with:
```bash
ssh -p 2222 admin@192.168.1.100
```

---

## 6. Wake-on-LAN (WoL)

Wake-on-LAN lets you power on the server remotely from any PC on the network — useful if you want to shut it down at night and wake it up in the morning.

### Step 1: Enable WoL in BIOS
1. Restart the server and enter BIOS (usually F2, DEL, or F10)
2. Look for these settings (names vary by manufacturer):
   - **Power Management → Wake on LAN** → Enable
   - **Network Boot / PXE** → Enable
   - Some BIOS call it: "Resume by LAN", "Power On by PCIE", or "Wake on PME"
3. Save and exit BIOS

### Step 2: Enable WoL in Ubuntu
Find your network interface:
```bash
ip link show
# Look for your ethernet interface (e.g., enp3s0)
```

Check current WoL status:
```bash
sudo ethtool enp3s0 | grep Wake-on
```
You want to see `Wake-on: g` (g = magic packet).

Enable WoL:
```bash
sudo ethtool -s enp3s0 wol g
```

### Step 3: Make WoL Persistent Across Reboots
Create a systemd service:
```bash
sudo nano /etc/systemd/system/wol.service
```

Paste:
```ini
[Unit]
Description=Enable Wake-on-LAN
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/ethtool -s enp3s0 wol g
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

Enable it:
```bash
sudo systemctl enable wol.service
sudo systemctl start wol.service
```

### Step 4: Get the Server's MAC Address
```bash
ip link show enp3s0 | grep ether
# Example output: link/ether aa:bb:cc:dd:ee:ff
```

**Write down the MAC address** — you'll need it to wake the server.

### Step 5: Wake the Server from Another PC

**From Windows (PowerShell):**
Install the WoL tool:
```powershell
# Option 1: Use a free tool like "WakeMeOnLan" from NirSoft
# Download from: https://www.nirsoft.net/utils/wake_on_lan.html

# Option 2: PowerShell script
# Save as wake-server.ps1
$mac = "AA:BB:CC:DD:EE:FF"  # ← Replace with server MAC
$macBytes = $mac -split "[:-]" | ForEach-Object { [byte]("0x" + $_) }
$magicPacket = [byte[]](,0xFF * 6) + ($macBytes * 16)
$udpClient = New-Object System.Net.Sockets.UdpClient
$udpClient.Connect("255.255.255.255", 9)
$udpClient.Send($magicPacket, $magicPacket.Length) | Out-Null
$udpClient.Close()
Write-Host "Magic packet sent to $mac"
```

**From Linux:**
```bash
# Install wakeonlan
sudo apt install wakeonlan

# Wake the server
wakeonlan AA:BB:CC:DD:EE:FF
```

### Step 6: Test WoL
1. Shut down the server: `sudo shutdown now`
2. Wait 10 seconds
3. Send the magic packet from another PC
4. The server should power on within 5-10 seconds

---

## 7. NAS — Network Attached Storage (Samba)

Samba lets you share folders from the server that Windows PCs can access like regular network drives.

### Step 1: Install Samba
```bash
sudo apt install -y samba samba-common
```

### Step 2: Create Shared Folders
```bash
# Create main shared directories
sudo mkdir -p /srv/nas/shared        # General shared files
sudo mkdir -p /srv/nas/databases     # Database files
sudo mkdir -p /srv/nas/backups       # Backup files
sudo mkdir -p /srv/nas/apps          # App data

# Set permissions
sudo chown -R nobody:nogroup /srv/nas
sudo chmod -R 0775 /srv/nas
```

### Step 3: Add a Samba User
```bash
# Create a dedicated Samba user
sudo adduser nasuser --no-create-home --disabled-login
sudo smbpasswd -a nasuser
# Enter a password for network access (can be different from Linux password)

# Add to the right group
sudo usermod -aG sudo nasuser
```

### Step 4: Configure Samba Shares
Backup the default config:
```bash
sudo cp /etc/samba/smb.conf /etc/samba/smb.conf.backup
```

Edit the config:
```bash
sudo nano /etc/samba/smb.conf
```

Add at the end of the file:
```ini
# ============================================
# Office NAS Shares
# ============================================

[Shared]
   comment = Office Shared Files
   path = /srv/nas/shared
   browseable = yes
   read only = no
   guest ok = no
   valid users = nasuser, admin
   create mask = 0664
   directory mask = 0775
   force user = nobody
   force group = nogroup

[Backups]
   comment = Backup Storage
   path = /srv/nas/backups
   browseable = yes
   read only = no
   guest ok = no
   valid users = nasuser, admin
   create mask = 0664
   directory mask = 0775

[Databases]
   comment = Database Files
   path = /srv/nas/databases
   browseable = yes
   read only = no
   guest ok = no
   valid users = nasuser, admin
   create mask = 0664
   directory mask = 0775
```

### Step 5: Restart Samba
```bash
# Test config for errors
testparm

# Restart Samba
sudo systemctl restart smbd nmbd
sudo systemctl enable smbd nmbd
```

### Step 6: Access from Windows PCs
On any Windows PC in the office:

1. Open **File Explorer**
2. In the address bar, type: `\\192.168.1.100`
3. Enter credentials: `nasuser` / the password you set
4. You'll see the shared folders: `Shared`, `Backups`, `Databases`

**Map as a Network Drive (permanent access):**
1. Right-click **This PC** → **Map Network Drive**
2. Drive letter: `Z:` (or any letter)
3. Folder: `\\192.168.1.100\Shared`
4. ✅ Check "Reconnect at sign-in"
5. ✅ Check "Connect using different credentials"
6. Enter: `nasuser` / password
7. Click Finish

Or via command line:
```cmd
net use Z: \\192.168.1.100\Shared /user:nasuser PASSWORD /persistent:yes
```

---

## 8. Installing Node.js

Required for hosting StockYard and other Node.js apps.

### Install Node.js via NVM (Recommended)
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js LTS
nvm install --lts

# Verify
node -v
npm -v
```

### Install PM2 (Process Manager)
PM2 keeps your apps running in the background and auto-restarts them if they crash.
```bash
npm install -g pm2
```

---

## 9. Hosting StockYard (Backend + Frontend)

### Step 1: Clone the Repository
```bash
cd /home/admin
git clone https://github.com/UtkarshMani/StockYard2Windows.git stockyard
cd stockyard
```

### Step 2: Install Dependencies
```bash
# Install root dependencies
npm install --ignore-scripts

# Install backend
cd backend
npm install
npx prisma generate
npm run build
cd ..

# Install frontend
cd frontend
npm install
npm run build
cd ..
```

### Step 3: Configure Environment
Create backend environment file:
```bash
nano backend/.env
```

Paste:
```env
# Server
PORT=5000
NODE_ENV=production

# Database — store on NAS for shared access
DATABASE_URL="file:/srv/nas/databases/stockyard.db"

# JWT Secrets (generate your own random strings)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string-64chars
JWT_REFRESH_SECRET=your-refresh-secret-change-this-to-another-random-string
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

# CORS — allow all office PCs
CORS_ORIGIN=*
```

Generate secure random secrets:
```bash
# Generate random JWT secrets
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
```

Create frontend environment file:
```bash
nano frontend/.env.local
```

Paste:
```env
NEXT_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
```

Rebuild frontend with the new API URL:
```bash
cd frontend && npm run build && cd ..
```

### Step 4: Initialize the Database
```bash
cd backend

# Set database URL
export DATABASE_URL="file:/srv/nas/databases/stockyard.db"

# Push schema and seed
npx prisma db push
npx tsx prisma/seed-production.ts

cd ..
```

### Step 5: Start with PM2
```bash
# Start backend
pm2 start backend/dist/server.js --name "stockyard-api" \
  --env production \
  --log-date-format "YYYY-MM-DD HH:mm:ss"

# Start frontend
pm2 start npm --name "stockyard-web" \
  -- --prefix frontend start -- -p 3000

# Check status
pm2 status

# Save PM2 process list (for auto-restart on reboot)
pm2 save
pm2 startup
# ↑ This prints a command — copy and run it with sudo
```

### Step 6: Verify
From the server:
```bash
curl http://localhost:5000/api/v1/health
curl http://localhost:3000
```

From any office PC, open a browser:
- **App:** http://192.168.1.100:3000
- **API:** http://192.168.1.100:5000/api/v1

---

## 10. Running Apps as System Services

If you prefer systemd over PM2 (more "Linux-native"):

### Create StockYard Backend Service
```bash
sudo nano /etc/systemd/system/stockyard-api.service
```

Paste:
```ini
[Unit]
Description=StockYard Backend API
After=network.target

[Service]
Type=simple
User=admin
WorkingDirectory=/home/admin/stockyard/backend
ExecStart=/home/admin/.nvm/versions/node/v22.14.0/bin/node dist/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=DATABASE_URL=file:/srv/nas/databases/stockyard.db
Environment=JWT_SECRET=your-jwt-secret-here
Environment=JWT_REFRESH_SECRET=your-refresh-secret-here
Environment=CORS_ORIGIN=*

[Install]
WantedBy=multi-user.target
```

> **Note:** Replace the Node.js path with your actual path. Find it with: `which node`

### Create StockYard Frontend Service
```bash
sudo nano /etc/systemd/system/stockyard-web.service
```

Paste:
```ini
[Unit]
Description=StockYard Frontend (Next.js)
After=network.target stockyard-api.service

[Service]
Type=simple
User=admin
WorkingDirectory=/home/admin/stockyard/frontend
ExecStart=/home/admin/.nvm/versions/node/v22.14.0/bin/npx next start -p 3000
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Enable and Start
```bash
sudo systemctl daemon-reload
sudo systemctl enable stockyard-api stockyard-web
sudo systemctl start stockyard-api stockyard-web

# Check status
sudo systemctl status stockyard-api
sudo systemctl status stockyard-web
```

---

## 11. Installing & Hosting Databases

### SQLite (Already included with StockYard)
No installation needed. The database file is at `/srv/nas/databases/stockyard.db`.

### PostgreSQL (For heavier apps)
```bash
# Install
sudo apt install -y postgresql postgresql-contrib

# Start and enable
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create a database and user
sudo -u postgres psql
```

Inside PostgreSQL:
```sql
CREATE USER officeuser WITH PASSWORD 'your-secure-password';
CREATE DATABASE officedb OWNER officeuser;
GRANT ALL PRIVILEGES ON DATABASE officedb TO officeuser;
\q
```

Allow network access:
```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/16/main/postgresql.conf
# Find and change:
#   listen_addresses = 'localhost'
# To:
#   listen_addresses = '*'

# Edit access rules
sudo nano /etc/postgresql/16/main/pg_hba.conf
# Add this line at the end:
#   host    all    all    192.168.1.0/24    md5

sudo systemctl restart postgresql
```

### MySQL/MariaDB (For WordPress, etc.)
```bash
# Install
sudo apt install -y mariadb-server

# Secure installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

Inside MySQL:
```sql
CREATE DATABASE officedb;
CREATE USER 'officeuser'@'%' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON officedb.* TO 'officeuser'@'%';
FLUSH PRIVILEGES;
EXIT;
```

Allow network access:
```bash
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
# Change:
#   bind-address = 127.0.0.1
# To:
#   bind-address = 0.0.0.0

sudo systemctl restart mariadb
```

### MongoDB (For NoSQL apps)
```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add repository
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install
sudo apt update
sudo apt install -y mongodb-org

# Start and enable
sudo systemctl enable mongod
sudo systemctl start mongod
```

---

## 12. Nginx Reverse Proxy

Nginx lets you access apps with clean URLs instead of port numbers:
- `http://stockyard.office/` instead of `http://192.168.1.100:3000`
- `http://server.office/` instead of `http://192.168.1.100`

### Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### Configure StockYard Proxy
```bash
sudo nano /etc/nginx/sites-available/stockyard
```

Paste:
```nginx
server {
    listen 80;
    server_name 192.168.1.100 stockyard.office;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/stockyard /etc/nginx/sites-enabled/
sudo nginx -t        # Test config
sudo systemctl reload nginx
```

Now you can access StockYard at: `http://192.168.1.100` (no port number!)

### Optional: Custom Domain Name on Office PCs
To use `http://stockyard.office` on Windows PCs:

Edit `C:\Windows\System32\drivers\etc\hosts` (as Administrator):
```
192.168.1.100    stockyard.office
192.168.1.100    server.office
```

---

## 13. Auto-Start Everything on Boot

### If Using PM2:
```bash
pm2 startup
# Run the command it outputs (with sudo)
pm2 save
```

### If Using systemd:
Already handled — services with `WantedBy=multi-user.target` start on boot.

### Verify After Reboot:
```bash
sudo reboot

# After reboot, check everything:
pm2 status                           # or
sudo systemctl status stockyard-api
sudo systemctl status stockyard-web
sudo systemctl status smbd
sudo systemctl status nginx
```

---

## 14. Firewall Configuration

### Enable and Configure UFW
```bash
# Enable firewall
sudo ufw enable

# Allow SSH (important — don't lock yourself out!)
sudo ufw allow 2222/tcp comment "SSH"      # If you changed SSH port
sudo ufw allow 22/tcp comment "SSH"        # If using default port

# Allow Samba (NAS file sharing)
sudo ufw allow samba comment "Samba NAS"

# Allow HTTP (Nginx)
sudo ufw allow 80/tcp comment "HTTP"

# Allow StockYard (if not using Nginx proxy)
sudo ufw allow 3000/tcp comment "StockYard Frontend"
sudo ufw allow 5000/tcp comment "StockYard API"

# Allow databases (only if other PCs need direct access)
sudo ufw allow 5432/tcp comment "PostgreSQL"
sudo ufw allow 3306/tcp comment "MySQL"
sudo ufw allow 27017/tcp comment "MongoDB"

# Allow Wake-on-LAN
sudo ufw allow 9/udp comment "Wake-on-LAN"

# Check status
sudo ufw status verbose
```

### Restrict to Office Network Only (More Secure)
```bash
# Instead of allowing from anywhere, restrict to office subnet:
sudo ufw allow from 192.168.1.0/24 to any port 80
sudo ufw allow from 192.168.1.0/24 to any port 3000
sudo ufw allow from 192.168.1.0/24 to any port 5000
sudo ufw allow from 192.168.1.0/24 to any port 445    # Samba
```

---

## 15. Accessing from Other PCs

### StockYard Web App
Open any browser on any office PC:
```
http://192.168.1.100
```
Login: `project@primeinfraa.com` / `Xtrim@Q6`

### Shared Files (NAS)
Windows File Explorer:
```
\\192.168.1.100\Shared
```

### SSH (Remote Management)
```cmd
ssh admin@192.168.1.100
```

### Wake-on-LAN (if server is off)
Run the PowerShell script or use WakeMeOnLan tool.

---

## 16. Backups

### Automated Daily Backups
```bash
sudo nano /home/admin/backup.sh
```

Paste:
```bash
#!/bin/bash
# Daily Backup Script for Office Server

BACKUP_DIR="/srv/nas/backups"
DATE=$(date +%Y-%m-%d_%H-%M)

echo "Starting backup: $DATE"

# Backup StockYard database
cp /srv/nas/databases/stockyard.db "$BACKUP_DIR/stockyard_$DATE.db"

# Backup PostgreSQL (if installed)
if command -v pg_dump &> /dev/null; then
    sudo -u postgres pg_dump officedb > "$BACKUP_DIR/postgres_officedb_$DATE.sql"
fi

# Backup MySQL (if installed)
if command -v mysqldump &> /dev/null; then
    mysqldump -u root officedb > "$BACKUP_DIR/mysql_officedb_$DATE.sql"
fi

# Backup shared files
tar -czf "$BACKUP_DIR/shared_files_$DATE.tar.gz" /srv/nas/shared/ 2>/dev/null

# Delete backups older than 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

Make it executable and schedule it:
```bash
chmod +x /home/admin/backup.sh

# Run daily at 2 AM
crontab -e
# Add this line:
0 2 * * * /home/admin/backup.sh >> /home/admin/backup.log 2>&1
```

---

## 17. Optional: Docker Setup

Docker lets you run apps in isolated containers. Useful for running many different apps without version conflicts.

### Install Docker
```bash
# Add Docker repository
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker admin

# Log out and back in, then verify
docker --version
```

### Install Docker Compose
```bash
sudo apt install -y docker-compose-plugin
docker compose version
```

### Example: Run StockYard in Docker
Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/data/stockyard.db
      - JWT_SECRET=your-secret
      - JWT_REFRESH_SECRET=your-refresh-secret
    volumes:
      - /srv/nas/databases:/data
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
    depends_on:
      - backend
    restart: always
```

Run:
```bash
docker compose up -d
```

---

## 18. Troubleshooting

### Can't Access Server from Other PCs
```bash
# Check if the service is running
sudo systemctl status nginx
sudo systemctl status stockyard-api

# Check if the port is open
sudo ss -tlnp | grep -E "80|3000|5000"

# Check firewall
sudo ufw status

# Test from server itself
curl http://localhost:3000
curl http://localhost:5000/api/v1/health
```

### Samba Share Not Visible
```bash
# Check Samba status
sudo systemctl status smbd

# Test Samba config
testparm

# Check Samba logs
tail -50 /var/log/samba/log.smbd
```

### Wake-on-LAN Not Working
- Verify WoL is enabled in BIOS
- Check with: `sudo ethtool enp3s0 | grep Wake-on` (should show `g`)
- The server must be **shut down** (not hibernated/suspended)
- Must be connected via **Ethernet** (WoL doesn't work over Wi-Fi)
- Some routers block broadcast packets — try connecting to the same switch

### PM2 Apps Not Starting on Boot
```bash
pm2 startup
# Copy and run the printed sudo command
pm2 save
pm2 resurrect
```

### Database Permission Errors
```bash
sudo chown -R admin:admin /srv/nas/databases
chmod 664 /srv/nas/databases/stockyard.db
```

### Check Logs
```bash
# StockYard logs
pm2 logs stockyard-api
pm2 logs stockyard-web

# Nginx logs
tail -50 /var/log/nginx/error.log

# System logs
journalctl -u stockyard-api --since "1 hour ago"
```

---

## Quick Reference Card

| Service | URL / Path | Port |
|---------|-----------|------|
| StockYard App | http://192.168.1.100 | 80 |
| StockYard API | http://192.168.1.100:5000/api/v1 | 5000 |
| NAS Shared Files | \\\\192.168.1.100\Shared | 445 |
| NAS Backups | \\\\192.168.1.100\Backups | 445 |
| SSH Access | ssh admin@192.168.1.100 | 22/2222 |
| Server IP | 192.168.1.100 | — |
| Server MAC | (check with `ip link show`) | — |

| Credentials | Username | Password |
|-------------|----------|----------|
| StockYard | project@primeinfraa.com | Xtrim@Q6 |
| Server SSH | admin | (your password) |
| NAS Access | nasuser | (your password) |

---

---

## 19. Desktop App Connecting to Server Database

By default, the StockYard desktop app (Electron) runs its own backend + database locally on each PC. To make **all PCs share one database** hosted on the server, we configure the desktop app to connect to the server's backend API instead.

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    OFFICE SERVER                         │
│                  (192.168.1.100)                         │
│                                                          │
│   Backend API (:5000) ←→ SQLite Database                 │
│   Frontend Web (:3000)                                   │
└──────────────┬───────────────────────────┬───────────────┘
               │                           │
        ┌──────┴──────┐             ┌──────┴──────┐
        │   Office PC  │             │   Office PC  │
        │  (Desktop    │             │  (Browser    │
        │   App)       │             │   Only)      │
        │              │             │              │
        │  Electron ──→│ API call ──→│ http://      │
        │  localhost:  │             │ 192.168.1.100│
        │  3000 (UI)   │             │              │
        └─────────────┘             └─────────────┘

        ┌─────────────┐
        │ Remote User  │
        │ (VPN/Tunnel) │
        │              │
        │ Desktop App ─│──→ API via VPN/Tunnel
        │    or        │
        │ Browser    ──│──→ https://stockyard.yourcompany.com
        └─────────────┘
```

### How It Works

The desktop app has two components:
1. **Frontend (Next.js)** — the UI, runs locally on the user's PC
2. **Backend (Express API)** — handles data, runs on the **server**

We make the desktop app's frontend point to the **server's backend API** instead of a local one.

### Method 1: Browser Access (Simplest — No Desktop App Needed)

If users only need to access StockYard, they can just open a browser:
```
http://192.168.1.100
```
No installation needed on client PCs. This is the recommended approach for office PCs.

### Method 2: Desktop App Pointing to Server (For Offline-Capable / Desktop Feel)

Modify the desktop app to connect to the server's backend instead of running its own.

#### Step 1: Modify the Frontend API URL

The frontend connects to the backend via an API URL. This is set in `frontend/src/lib/api.ts`.

The current app already supports this — it reads `NEXT_PUBLIC_API_URL` from environment.

#### Step 2: Rebuild Frontend with Server URL

On your **build machine** (Linux), before building the installer:

```bash
cd /path/to/StockYard2/frontend

# Create .env.local pointing to the server
echo 'NEXT_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1' > .env.local

# Rebuild frontend
npm run build
```

#### Step 3: Modify Electron to Skip Local Backend

Edit `electron-main.js` — in the production section, instead of starting the embedded backend,
just start the frontend and point it to the server:

Find this section and change the `USE_EXISTING_SERVERS` logic:

```javascript
// At the top of electron-main.js, change:
const USE_EXISTING_SERVERS = isDev;

// To (for server-connected mode):
const SERVER_MODE = true; // Set to true when using office server
const SERVER_URL = 'http://192.168.1.100:5000'; // Office server IP
const USE_EXISTING_SERVERS = isDev;
```

Then in the `app.whenReady()` section, add a check that skips backend startup when in server mode:

```javascript
if (SERVER_MODE && !isDev) {
  // Server mode: Only start frontend, backend runs on server
  console.log('🌐 Server mode: connecting to', SERVER_URL);
  
  // Just start the frontend pointing to the server
  await startFrontend();
  await mainWindow.loadURL(mainWindow.frontendUrl);
  
} else if (USE_EXISTING_SERVERS) {
  // ... existing dev mode code
} else {
  // ... existing embedded mode code
}
```

#### Step 4: Rebuild Windows Installer

```bash
cd /path/to/StockYard2

# Rebuild backend (still needed for embedded mode fallback)
cd backend && npm run build && cd ..

# Rebuild frontend with server URL
cd frontend && npm run build && cd ..

# Build Windows installer
npx electron-builder --win --x64
```

The installer in `dist/StockYard-1.0.0-Setup.exe` will now connect to the server.

#### Step 5: Install on Office PCs

1. Copy `StockYard-1.0.0-Setup.exe` to each PC
2. Install it
3. Launch — it will connect to `http://192.168.1.100:5000` for data
4. All PCs share the same database on the server

### Verifying the Connection

From any office PC, test the server API:
```cmd
curl http://192.168.1.100:5000/api/v1/health
```

Or open in a browser:
```
http://192.168.1.100:5000/api/v1/health
```

You should see a JSON response confirming the server is running.

---

## 20. Remote Access from Outside the Office (VPN)

To access StockYard and the server from home or a different location, set up a VPN.
**WireGuard** is the simplest and fastest VPN solution.

### Architecture

```
Remote User (Home/Travel)          Office Network
┌───────────────────┐              ┌──────────────────────┐
│  Laptop/PC        │   WireGuard  │  Office Server       │
│                   │──────────────│  192.168.1.100       │
│  Gets VPN IP:     │   Encrypted  │                      │
│  10.0.0.2         │   Tunnel     │  VPN IP: 10.0.0.1   │
│                   │              │                      │
│  Access:          │              │  StockYard: :5000    │
│  http://10.0.0.1  │              │  NAS: :445           │
│  or               │              │  SSH: :22            │
│  http://192.168.  │              │                      │
│  1.100 (via VPN)  │              │                      │
└───────────────────┘              └──────────────────────┘
```

### Step 1: Install WireGuard on the Server

```bash
sudo apt install -y wireguard
```

### Step 2: Generate Server Keys

```bash
# Generate server private and public keys
wg genkey | sudo tee /etc/wireguard/server_private.key | wg pubkey | sudo tee /etc/wireguard/server_public.key

# Secure the private key
sudo chmod 600 /etc/wireguard/server_private.key

# View the keys (you'll need these later)
echo "Server Private Key: $(sudo cat /etc/wireguard/server_private.key)"
echo "Server Public Key: $(sudo cat /etc/wireguard/server_public.key)"
```

### Step 3: Generate Client Keys (One Per Remote User)

```bash
# For each remote user, generate a key pair
wg genkey | tee /tmp/client1_private.key | wg pubkey > /tmp/client1_public.key

echo "Client 1 Private Key: $(cat /tmp/client1_private.key)"
echo "Client 1 Public Key: $(cat /tmp/client1_public.key)"

# Repeat for more users:
wg genkey | tee /tmp/client2_private.key | wg pubkey > /tmp/client2_public.key
```

### Step 4: Configure WireGuard Server

```bash
sudo nano /etc/wireguard/wg0.conf
```

Paste:
```ini
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = <SERVER_PRIVATE_KEY>     # ← Paste server private key

# Enable IP forwarding and NAT so VPN clients can access the LAN
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o enp3s0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o enp3s0 -j MASQUERADE

# Client 1 (e.g., Boss's laptop)
[Peer]
PublicKey = <CLIENT1_PUBLIC_KEY>      # ← Paste client 1 public key
AllowedIPs = 10.0.0.2/32

# Client 2 (e.g., Manager's laptop)
[Peer]
PublicKey = <CLIENT2_PUBLIC_KEY>      # ← Paste client 2 public key
AllowedIPs = 10.0.0.3/32

# Add more [Peer] sections for more users
```

> **Note:** Replace `enp3s0` with your actual network interface name.

### Step 5: Enable IP Forwarding

```bash
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Step 6: Start WireGuard Server

```bash
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0

# Check status
sudo wg show
```

### Step 7: Open Port on Firewall

```bash
sudo ufw allow 51820/udp comment "WireGuard VPN"
```

### Step 8: Port Forward on Office Router

Log into your office router (usually `192.168.1.1` in a browser):

1. Go to **Port Forwarding** / **NAT** / **Virtual Server** settings
2. Add a rule:
   - **External Port:** 51820
   - **Internal IP:** 192.168.1.100
   - **Internal Port:** 51820
   - **Protocol:** UDP
3. Save

### Step 9: Get Your Office's Public IP

```bash
curl ifconfig.me
# Example output: 203.0.113.50
```

Write this down — remote clients need it. If your ISP gives you a dynamic IP,
set up a free dynamic DNS (see Step 12 below).

### Step 10: Configure WireGuard on Client (Windows)

1. Download WireGuard for Windows: https://www.wireguard.com/install/
2. Install and open WireGuard
3. Click **Add Tunnel** → **Add empty tunnel**
4. Replace the config with:

```ini
[Interface]
PrivateKey = <CLIENT1_PRIVATE_KEY>    # ← Paste client 1 private key
Address = 10.0.0.2/24
DNS = 8.8.8.8

[Peer]
PublicKey = <SERVER_PUBLIC_KEY>       # ← Paste server public key
Endpoint = 203.0.113.50:51820        # ← Your office PUBLIC IP:port
AllowedIPs = 10.0.0.0/24, 192.168.1.0/24
PersistentKeepalive = 25
```

> **AllowedIPs explained:**
> - `10.0.0.0/24` — routes VPN traffic
> - `192.168.1.0/24` — routes office LAN traffic through VPN
> - This means you can access `192.168.1.100` (the server) from home as if you're in the office

5. Click **Save** then **Activate**

### Step 11: Test Remote Access

With VPN connected on the remote PC:

```cmd
:: Test VPN connection
ping 10.0.0.1

:: Test server access via VPN
ping 192.168.1.100

:: Test StockYard API
curl http://192.168.1.100:5000/api/v1/health

:: Open StockYard in browser
start http://192.168.1.100
```

The desktop app also works — it connects to `http://192.168.1.100:5000` and the VPN routes that traffic.

### Step 12: Dynamic DNS (If Your Office IP Changes)

If your ISP gives a dynamic public IP, use a free Dynamic DNS service:

#### Option A: Duck DNS (Free)
1. Go to https://www.duckdns.org/
2. Sign in with Google/GitHub
3. Create a subdomain, e.g., `myoffice.duckdns.org`
4. On the server:

```bash
# Install Duck DNS updater
mkdir -p ~/duckdns
nano ~/duckdns/duck.sh
```

Paste:
```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=myoffice&token=YOUR-DUCKDNS-TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
```

```bash
chmod +x ~/duckdns/duck.sh

# Run every 5 minutes
crontab -e
# Add:
*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

Now use `myoffice.duckdns.org` instead of the IP in WireGuard client config:
```ini
Endpoint = myoffice.duckdns.org:51820
```

#### Option B: No-IP (Free)
1. Go to https://www.noip.com/
2. Create a free hostname
3. Install their update client on the server:
```bash
sudo apt install -y noip2
sudo noip2 -C   # Configure with your account
sudo systemctl enable noip2
```

### Step 13: Mobile Access (Optional)

WireGuard has apps for Android and iOS:
- **Android:** https://play.google.com/store/apps/details?id=com.wireguard.android
- **iOS:** https://apps.apple.com/app/wireguard/id1441195209

Scan the QR code generated by:
```bash
# Install qrencode
sudo apt install -y qrencode

# Generate QR code for client config
qrencode -t ansiutf8 < /tmp/client1.conf
```

Create `/tmp/client1.conf`:
```ini
[Interface]
PrivateKey = <CLIENT1_PRIVATE_KEY>
Address = 10.0.0.2/24
DNS = 8.8.8.8

[Peer]
PublicKey = <SERVER_PUBLIC_KEY>
Endpoint = myoffice.duckdns.org:51820
AllowedIPs = 10.0.0.0/24, 192.168.1.0/24
PersistentKeepalive = 25
```

Scan the QR code with the WireGuard mobile app → Activate → Access StockYard from your phone's browser.

---

## 21. Remote Access via Cloudflare Tunnel (No VPN)

If you don't want to deal with VPN clients on every device, **Cloudflare Tunnel** exposes your server
to the internet securely — no port forwarding, no public IP needed.

### How It Works

```
Remote User                  Cloudflare                    Office Server
┌──────────┐    HTTPS        ┌──────────┐    Encrypted     ┌──────────┐
│ Browser  │────────────────→│ Cloudflare│←───Tunnel──────→│ Server   │
│          │                 │ Edge      │                  │ :5000    │
│ stockyard│                 │           │                  │ :3000    │
│ .yourco  │                 │           │                  │          │
│ .com     │                 │           │                  │          │
└──────────┘                 └──────────┘                  └──────────┘
```

- Free tier available
- No port forwarding on router
- HTTPS automatically
- Works even behind CGNAT (where port forwarding is impossible)
- Requires a domain name (can buy cheap ones for ~$10/year)

### Step 1: Get a Domain Name

Buy a cheap domain from:
- Cloudflare Registrar: https://www.cloudflare.com/products/registrar/
- Namecheap: https://www.namecheap.com/
- Example: `primeinfraa.com` or `stockyard.in`

Add the domain to your Cloudflare account (free plan is fine).

### Step 2: Install Cloudflare Tunnel on Server

```bash
# Install cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update
sudo apt install -y cloudflared

# Authenticate with Cloudflare
cloudflared tunnel login
# This opens a browser — log in and authorize your domain
```

### Step 3: Create a Tunnel

```bash
# Create tunnel
cloudflared tunnel create office-server

# Note the Tunnel ID and credentials file path from the output
```

### Step 4: Configure the Tunnel

```bash
nano ~/.cloudflared/config.yml
```

Paste:
```yaml
tunnel: <TUNNEL_ID>                          # ← From Step 3
credentials-file: /home/admin/.cloudflared/<TUNNEL_ID>.json

ingress:
  # StockYard Web App
  - hostname: stockyard.yourdomain.com
    service: http://localhost:80              # Nginx proxy

  # StockYard API (for desktop apps)
  - hostname: api.yourdomain.com
    service: http://localhost:5000

  # Catch-all
  - service: http_status:404
```

### Step 5: Add DNS Records

```bash
cloudflared tunnel route dns office-server stockyard.yourdomain.com
cloudflared tunnel route dns office-server api.yourdomain.com
```

### Step 6: Start and Enable the Tunnel

```bash
# Test
cloudflared tunnel run office-server

# Install as system service
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### Step 7: Access from Anywhere

- **Browser (any device):** `https://stockyard.yourdomain.com`
- **API:** `https://api.yourdomain.com/api/v1/health`

For the **desktop app** connecting remotely, rebuild with:
```bash
cd frontend
echo 'NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1' > .env.local
npm run build
cd ..
npx electron-builder --win --x64
```

### Comparison: VPN vs Cloudflare Tunnel

| | **WireGuard VPN** | **Cloudflare Tunnel** |
|---|---|---|
| Cost | Free | Free (basic), domain ~$10/yr |
| Setup | Medium | Medium |
| Client install needed | Yes (WireGuard app) | No (just a browser) |
| Desktop app works | Yes (full LAN access) | Yes (via public URL) |
| NAS file access | Yes | No (web apps only) |
| Speed | Faster (direct) | Slightly slower (via Cloudflare) |
| Port forwarding | Required | Not required |
| Works behind CGNAT | No | Yes |
| Security | Excellent | Excellent |

**Recommendation:**
- Use **WireGuard VPN** if remote users need full access (NAS files + apps + SSH)
- Use **Cloudflare Tunnel** if remote users only need web app access (simpler, no client install)
- Use **both** for maximum flexibility

---

## Quick Reference Card

| Service | Office Access | Remote Access (VPN) | Remote Access (Tunnel) |
|---------|--------------|--------------------|-----------------------|
| StockYard App | http://192.168.1.100 | http://192.168.1.100 (via VPN) | https://stockyard.yourdomain.com |
| StockYard API | http://192.168.1.100:5000 | http://192.168.1.100:5000 (via VPN) | https://api.yourdomain.com |
| NAS Files | \\\\192.168.1.100\\Shared | \\\\192.168.1.100\\Shared (via VPN) | ❌ Not available |
| SSH | ssh admin@192.168.1.100 | ssh admin@192.168.1.100 (via VPN) | ❌ Not available |
| WireGuard VPN | Not needed | Connect first, then access everything | Not needed |

| Credentials | Username | Password |
|-------------|----------|----------|
| StockYard | project@primeinfraa.com | Xtrim@Q6 |
| Server SSH | admin | (your password) |
| NAS Access | nasuser | (your password) |
| WireGuard | N/A | (key-based, no password) |

---

## Summary

After completing this guide, your old laptop/desktop will be:

1. ✅ **Ubuntu Server** — running 24/7 as your office server
2. ✅ **NAS** — file sharing via Samba, accessible from all Windows PCs
3. ✅ **Wake-on-LAN** — power on remotely when needed
4. ✅ **App Server** — hosting StockYard (and any other web apps)
5. ✅ **Database Server** — SQLite, PostgreSQL, MySQL, MongoDB ready
6. ✅ **Auto-startup** — everything starts automatically on boot
7. ✅ **Backups** — daily automated backups to NAS
8. ✅ **Firewall** — secured and only accessible from office network
9. ✅ **Desktop App** — connects to server database, all PCs share one database
10. ✅ **VPN (WireGuard)** — full remote access to office network from anywhere
11. ✅ **Cloudflare Tunnel** — web app access from anywhere, no VPN needed
