# MeshCore Coverage Map - Self-Hosted

Self-hosted version of the MeshCore Coverage Map, migrated from Cloudflare to Node.js/Express with PostgreSQL.

## Quick Start (Docker)

```bash
git clone <repository-url>
cd meshcore-coverage-map-1/server
cp .env.example .env
npm run docker:dev
```

The application will be available at `http://localhost:3000`

## Development Setup

### With Docker (Recommended)

```bash
cd server
cp .env.example .env  # Edit with your settings
npm run docker:dev
```

**Useful commands:**
- `npm run docker:dev:detached` - Run in background
- `npm run docker:logs` - View logs
- `npm run docker:down` - Stop containers

### Without Docker

```bash
cd server
npm install
createdb meshmap  # Create PostgreSQL database
npm run migrate   # Run database migrations
cp .env.example .env
npm run dev
```

## Production Deployment

### With Docker

1. **Configure environment:**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Start services:**
   ```bash
   npm run docker:prod:detached
   ```

3. **Set up Nginx and SSL** (see AWS EC2 section below)

### Without Docker (Ubuntu)

1. **Install dependencies:**
   ```bash
   # Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # PostgreSQL
   sudo apt install -y postgresql postgresql-contrib
   ```

2. **Set up database:**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE meshmap;
   CREATE USER meshmap WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE meshmap TO meshmap;
   \q
   ```

3. **Configure and run:**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with database credentials
   npm install
   npm run migrate
   NODE_ENV=production npm start
   ```

4. **Use PM2 for process management:**
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name mesh-map
   pm2 save
   pm2 startup
   ```

## AWS EC2 Deployment

### Initial Server Setup

1. **Connect and update:**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Docker (for Docker deployment):**
   ```bash
   sudo apt install -y docker.io docker-compose
   sudo systemctl enable docker
   sudo systemctl start docker
   sudo usermod -aG docker $USER
   exit  # Reconnect for group changes
   ```

   **Or install Node.js/PostgreSQL (for vanilla deployment):**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs postgresql postgresql-contrib
   ```

3. **Install Nginx and Certbot:**
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```

4. **Configure firewall:**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

5. **Configure AWS Security Group:**
   - Allow ports 22, 80, 443 from appropriate sources

6. **Clone repository:**
   ```bash
   git clone <your-repo-url> meshcore-coverage-map
   cd meshcore-coverage-map/server
   ```

### SSL Certificate Setup

1. **Obtain certificate:**
   ```bash
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

2. **Configure Nginx:**
   ```bash
   sudo cp server/nginx/meshmap.conf /etc/nginx/sites-available/meshmap
   sudo nano /etc/nginx/sites-available/meshmap  # Edit server_name
   sudo ln -s /etc/nginx/sites-available/meshmap /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Deploy Application

Follow the "Production Deployment" section above (Docker or vanilla), then verify:

```bash
# Check Nginx
sudo systemctl status nginx

# Check application (Docker)
docker-compose logs -f app

# Check application (PM2)
pm2 logs mesh-map

# Test HTTPS
curl https://your-domain.com
```

## Configuration

Edit `server/.env` (copy from `.env.example`):

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=meshmap
DB_USER=meshmap
DB_PASSWORD=your_password

# Server
PORT=3000
NODE_ENV=production

# Location validation (optional)
CENTER_POS=37.3382,-121.8863
MAX_DISTANCE_MILES=0  # 0 = no limit

# Automated maintenance
CONSOLIDATE_ENABLED=true
CONSOLIDATE_SCHEDULE=0 2 * * *  # Daily at 2 AM
CONSOLIDATE_MAX_AGE_DAYS=14
CLEANUP_ENABLED=true
CLEANUP_SCHEDULE=0 3 * * 0  # Weekly Sunday at 3 AM
```

## MQTT Scraper (Optional)

For automatic data collection from MQTT feeds:

1. **Configure:**
   ```bash
   cd mqtt-scraper
   cp config.json.example config.json
   # Edit config.json with MQTT credentials
   ```

2. **Start with Docker:**
   ```bash
   cd ../server
   docker-compose up -d mqtt-scraper
   docker-compose logs -f mqtt-scraper
   ```

3. **Or run manually:**
   ```bash
   pip install paho-mqtt requests haversine cryptography
   python wardrive-mqtt.py
   ```

**Configuration example:**
```json
{
  "mqtt_mode": "public",
  "mqtt_host": "mqtt-us-v1.letsmesh.net",
  "mqtt_port": 443,
  "mqtt_use_websockets": true,
  "mqtt_use_tls": true,
  "mqtt_username": "YOUR_USERNAME",
  "mqtt_password": "YOUR_PASSWORD",
  "mqtt_topics": ["meshcore/SFO/+/packets"],
  "service_host": "http://app:3000",
  "watched_observers": ["OHMC Repeater"]
}
```

## API Endpoints

- `GET /get-nodes` - Get all coverage, samples, and repeaters
- `GET /get-coverage` - Get coverage data
- `GET /get-samples?p=<prefix>` - Get samples (filtered by geohash prefix)
- `GET /get-repeaters` - Get all repeaters
- `POST /put-sample` - Add/update a sample
- `POST /put-repeater` - Add/update a repeater
- `POST /consolidate?maxAge=<days>` - Consolidate old samples
- `POST /clean-up?op=repeaters` - Clean up stale repeaters

## Frontend

Access the map and tools at:
- `http://localhost:3000/` - Main coverage map
- `http://localhost:3000/addSample.html` - Add sample
- `http://localhost:3000/addRepeater.html` - Add repeater
- `http://localhost:3000/wardrive.html` - Wardrive app

## Troubleshooting

**Database connection issues:**
```bash
psql -h localhost -U meshmap -d meshmap
```

**Port already in use:**
Change `PORT` in `.env` or stop the process using port 3000.

**Docker permission denied:**
```bash
sudo usermod -aG docker $USER
exit  # Reconnect via SSH
```

**Nginx not working:**
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/meshmap_error.log
```

## License

See LICENSE file in the root directory.
