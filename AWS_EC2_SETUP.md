# AWS EC2 Initial Setup Guide (Ubuntu)

This guide will get you from a **fresh Ubuntu EC2 instance** to the point where you can follow the main [README.md](README.md) for application setup.

## Prerequisites

- Fresh Ubuntu 22.04 LTS EC2 instance
- SSH access to the instance
- Domain name (optional, but recommended for SSL)

## Step 1: Connect to Your EC2 Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

## Step 2: Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

## Step 3: Install Essential Tools

```bash
# Install basic utilities
sudo apt install -y curl wget git build-essential

# Install Docker and Docker Compose
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# Log out and back in for Docker group changes to take effect
exit
```

**Reconnect via SSH** after logging out.

## Step 4: Install Node.js (if not using Docker)

If you plan to run the application without Docker, install Node.js:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Verify installation (should show v20.x.x)
```

## Step 5: Install PostgreSQL (if not using Docker)

If you plan to run PostgreSQL directly on the host (not in Docker):

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

## Step 6: Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## Step 7: Install Certbot (for SSL certificates)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

## Step 8: Configure Firewall

```bash
# Install UFW if not already installed
sudo apt install -y ufw

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

## Step 9: Configure AWS Security Group

In the AWS Console, configure your EC2 Security Group:

**Inbound Rules:**
- SSH (22) - from your IP or 0.0.0.0/0 (less secure)
- HTTP (80) - from 0.0.0.0/0
- HTTPS (443) - from 0.0.0.0/0

**Outbound Rules:**
- All traffic - to 0.0.0.0/0 (default)

## Step 10: Clone the Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone <your-repo-url> meshcore-coverage-map
cd meshcore-coverage-map

# Or if you have a bundle file:
# git clone /path/to/meshcore-coverage-map.bundle meshcore-coverage-map
# cd meshcore-coverage-map
```

## Step 11: Verify Installation

Check that everything is installed correctly:

```bash
# Check Docker
docker --version
docker-compose --version

# Check Node.js (if installed)
node --version
npm --version

# Check PostgreSQL (if installed)
psql --version

# Check Nginx
nginx -v

# Check Certbot
certbot --version
```

## Step 12: You're Ready!

At this point, you have all the dependencies installed. Continue with the main [README.md](README.md) to:

1. Configure the application (`.env` file)
2. Set up SSL certificates (if you have a domain)
3. Configure Nginx
4. Deploy the application

## Quick Reference: What's Installed

- ✅ **Docker** - Container runtime
- ✅ **Docker Compose** - Multi-container orchestration
- ✅ **Node.js** (optional) - JavaScript runtime (if not using Docker)
- ✅ **PostgreSQL** (optional) - Database (if not using Docker)
- ✅ **Nginx** - Reverse proxy and web server
- ✅ **Certbot** - SSL certificate management
- ✅ **UFW** - Firewall
- ✅ **Git** - Version control

## Troubleshooting

**Docker permission denied:**
```bash
# Make sure you're in the docker group
groups | grep docker
# If not, add yourself and reconnect
sudo usermod -aG docker $USER
exit
# Reconnect via SSH
```

**Can't connect to EC2:**
- Check AWS Security Group allows SSH (port 22) from your IP
- Verify the instance is running
- Check your key file permissions: `chmod 400 your-key.pem`

**Nginx not starting:**
```bash
sudo systemctl status nginx
sudo nginx -t  # Test configuration
```

## Next Steps

Proceed to the main [README.md](README.md) for:
- Application configuration
- Database setup
- SSL certificate installation
- Nginx configuration
- Application deployment

