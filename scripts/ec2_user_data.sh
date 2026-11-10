#!/bin/bash
# ==============================================================================
# AquaAlert - EC2 Automated Cloud-Init Deployment Script
# Automatically provisions Ubuntu, installs Node.js, builds AquaAlert,
# configures Nginx with SPA routing, and serves on Port 80.
# ==============================================================================

set -e
export DEBIAN_FRONTEND=noninteractive

echo ">>> [1/5] Updating packages and configuring 2GB swap for low-memory instance..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

apt-get update -y
apt-get install -y curl git nginx ufw awscli

echo ">>> [2/5] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo ">>> [3/5] Cloning AquaAlert repository from GitHub..."
mkdir -p /var/www
cd /var/www
rm -rf AquaAlert
git clone https://github.com/chansom63/AquaAlert.git
cd AquaAlert

echo ">>> [4/5] Writing production .env file..."
cat << 'EOF' > .env
VITE_API_BASE_URL=https://znjdsbpuhd.execute-api.ap-south-1.amazonaws.com/default/
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiY2hhbnNvbTE2MyIsImEiOiJjbXZ3OXloZmIwM205MnlxdzYya28zcjUzIn0.MdwxivUiQpnNB6CNVDZdcw
VITE_COGNITO_USER_POOL_ID=ap-south-1_HlHhFkttf
VITE_COGNITO_CLIENT_ID=43egcoomllmis0ebef6pl6qnar
VITE_AWS_REGION=ap-south-1
COGNITO_USER_POOL_ID=ap-south-1_HlHhFkttf
COGNITO_CLIENT_ID=43egcoomllmis0ebef6pl6qnar
EOF

echo ">>> [5/5] Fetching production build or building frontend..."
mkdir -p /var/www/AquaAlert/dist
aws s3 sync s3://waterq-dev-frontend /var/www/AquaAlert/dist --no-sign-request || true

if [ ! -f /var/www/AquaAlert/dist/index.html ]; then
    echo ">>> Building locally from source..."
    npm install
    npm run build
fi

echo ">>> Configuring Nginx for React SPA client-side routing..."
cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/AquaAlert/dist;
    index index.html;

    server_name _;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|mp4|webm)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
EOF

# Open HTTP port in UFW if enabled
ufw allow 'Nginx HTTP' || true

# Restart and enable Nginx
systemctl restart nginx
systemctl enable nginx

echo "=============================================================================="
echo "🎉 AquaAlert successfully deployed and serving on port 80!"
echo "=============================================================================="
