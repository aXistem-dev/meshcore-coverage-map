# Docker Setup Guide

This guide explains how to use Docker for development and production deployment.

## Quick Start (Development)

```bash
cd server
npm run docker:dev
```

This starts:
- PostgreSQL database on port 5432
- Node.js application on port 3000
- Automatic database migrations
- Hot-reload for code changes

Access the application at: http://localhost:3000

## Docker Compose Services

### Development (`docker-compose.yml`)

- **db**: PostgreSQL 15 database
  - Port: 5432
  - User: meshmap
  - Password: meshmap_dev
  - Database: meshmap
  - Data persisted in `postgres_data` volume

- **app**: Node.js Express application
  - Port: 3000
  - Development mode with nodemon
  - Hot-reload enabled
  - Code mounted as volume for live changes

### Production (`docker-compose.prod.yml`)

- Same services but optimized for production
- No code volumes (code baked into image)
- Restart policies enabled
- Uses environment variables from `.env` file

## Common Commands

### Development

```bash
# Start services (foreground)
npm run docker:dev

# Start services (background)
npm run docker:dev:detached

# View logs
npm run docker:logs

# Stop services
npm run docker:down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Production

```bash
# Build and start production containers
npm run docker:prod:detached

# Or manually
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop
docker-compose -f docker-compose.prod.yml down
```

## Database Access

### From Host Machine

```bash
# Connect to database
psql -h localhost -p 5432 -U meshmap -d meshmap
# Password: meshmap_dev
```

### From Inside Container

```bash
# Connect to app container
docker exec -it meshmap-app sh

# Connect to db container
docker exec -it meshmap-db psql -U meshmap -d meshmap
```

## Running Migrations

Migrations are automatically run when the database container starts (via `/docker-entrypoint-initdb.d`).

To run migrations manually:

```bash
# From host
docker exec -i meshmap-db psql -U meshmap -d meshmap < migrations/001_initial_schema.sql

# Or from app container
docker exec -it meshmap-app npm run migrate
```

## Data Persistence

Database data is stored in Docker volumes:
- Development: `meshmap_postgres_data`
- Production: `meshmap_postgres_data_prod`

To backup data:

```bash
docker exec meshmap-db pg_dump -U meshmap meshmap > backup.sql
```

To restore:

```bash
docker exec -i meshmap-db psql -U meshmap meshmap < backup.sql
```

## Troubleshooting

### Port Already in Use

If port 3000 or 5432 is already in use, modify the ports in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Use 3001 on host instead
```

### Database Connection Issues

1. Check if database is healthy:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs db
   ```

3. Verify environment variables:
   ```bash
   docker-compose exec app env | grep DB_
   ```

### Reset Everything

To start fresh (removes all data):

```bash
docker-compose down -v
docker-compose up --build
```

### View Container Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db
```

## Environment Variables

Development uses default values in `docker-compose.yml`. For production, create a `.env` file:

```bash
DB_PASSWORD=your_secure_password
DB_USER=meshmap
DB_NAME=meshmap
PORT=3000
```

Then use:
```bash
docker-compose -f docker-compose.prod.yml --env-file .env up -d
```

## Building Images

Build images manually:

```bash
# Development
docker build -f Dockerfile.dev -t meshmap:dev .

# Production
docker build -f Dockerfile -t meshmap:prod .
```

## Network

All services are on the `meshmap-network` bridge network. Services can communicate using service names:
- App connects to database using hostname `db`
- Database is accessible from host on `localhost:5432`

