# MeshCore Coverage Map - Self-Hosted

Self-hosted version of the MeshCore Coverage Map, migrated from Cloudflare to Node.js/Express with PostgreSQL.

## Quick Start

```bash
git clone <repository-url>
cd meshcore-coverage-map-1/server
cp .env.example .env
npm run docker:dev
```

The application will be available at `http://localhost:3000`

## Development

```bash
cd server
cp .env.example .env  # Edit with your settings
npm run docker:dev
```

**Useful commands:**
- `npm run docker:dev:detached` - Run in background
- `npm run docker:logs` - View logs
- `npm run docker:down` - Stop containers

## Production

1. **Configure environment:**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Stop any existing containers:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

3. **Start services:**
   ```bash
   npm run docker:prod:detached
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
docker exec meshmap-db psql -U meshmap -d meshmap
```

**Port already in use:**
Change `PORT` in `.env` or stop the process using port 3000.

**Docker permission denied:**
```bash
sudo usermod -aG docker $USER
exit  # Reconnect
```

**Docker Compose "ContainerConfig" error:**
```bash
cd server
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

**View logs:**
```bash
docker-compose logs -f app
docker-compose logs -f db
docker-compose logs -f mqtt-scraper
```

## License

See LICENSE file in the root directory.
