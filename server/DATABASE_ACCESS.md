# Database Access Guide

## Connecting to PostgreSQL

### Via Docker (Recommended)

If you're using Docker Compose, connect to the database container:

```bash
docker exec -it meshmap-db psql -U meshmap -d meshmap
```

This will open an interactive PostgreSQL session.

### From Host Machine

If PostgreSQL is running on your host machine:

```bash
psql -h localhost -p 5432 -U meshmap -d meshmap
```

Password: `meshmap_dev` (for development)

## Basic PostgreSQL Commands

Once connected, you can use these commands:

### List all tables

```sql
\dt
```

### Describe a table structure

```sql
\d samples
\d repeaters
\d coverage
\d coverage_samples
\d archive
```

### View all data in a table

```sql
-- View all samples
SELECT * FROM samples LIMIT 10;

-- View all repeaters
SELECT * FROM repeaters;

-- View all coverage
SELECT * FROM coverage LIMIT 10;
```

### Count records

```sql
SELECT COUNT(*) FROM samples;
SELECT COUNT(*) FROM repeaters;
SELECT COUNT(*) FROM coverage;
```

### Useful Queries

#### Recent samples (last 24 hours)
```sql
SELECT geohash, time, path, updated_at 
FROM samples 
WHERE time > EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000
ORDER BY time DESC
LIMIT 20;
```

#### Repeaters by ID
```sql
SELECT id, name, lat, lon, elev, time
FROM repeaters
WHERE id = '86'
ORDER BY time DESC;
```

#### Coverage with most samples
```sql
SELECT geohash, heard, lost, last_heard, hit_repeaters
FROM coverage
ORDER BY (heard + lost) DESC
LIMIT 20;
```

#### Samples for a specific geohash prefix
```sql
SELECT geohash, time, path
FROM samples
WHERE geohash LIKE 'c2%'
ORDER BY time DESC;
```

#### Repeaters in a geographic area
```sql
SELECT id, name, lat, lon, elev
FROM repeaters
WHERE lat BETWEEN 37.0 AND 38.0
  AND lon BETWEEN -122.0 AND -121.0
ORDER BY id;
```

### Exit psql

```sql
\q
```

## Quick One-Line Queries

You can also run queries directly without entering interactive mode:

```bash
# Count samples
docker exec -i meshmap-db psql -U meshmap -d meshmap -c "SELECT COUNT(*) FROM samples;"

# View recent repeaters
docker exec -i meshmap-db psql -U meshmap -d meshmap -c "SELECT id, name, lat, lon FROM repeaters ORDER BY time DESC LIMIT 5;"

# View coverage stats
docker exec -i meshmap-db psql -U meshmap -d meshmap -c "SELECT geohash, heard, lost FROM coverage ORDER BY (heard + lost) DESC LIMIT 10;"
```

## Export Data

### Export to CSV

```bash
docker exec -i meshmap-db psql -U meshmap -d meshmap -c "COPY (SELECT * FROM samples) TO STDOUT WITH CSV HEADER" > samples.csv
```

### Export entire database

```bash
docker exec meshmap-db pg_dump -U meshmap meshmap > backup.sql
```

## Import Data

```bash
docker exec -i meshmap-db psql -U meshmap -d meshmap < backup.sql
```

## Useful psql Meta-Commands

- `\l` - List all databases
- `\c database_name` - Connect to a different database
- `\dt` - List all tables
- `\d table_name` - Describe a table
- `\du` - List all users
- `\timing` - Toggle query timing
- `\x` - Toggle expanded display (useful for wide tables)
- `\?` - Show help for psql commands
- `\h` - Show help for SQL commands

## Troubleshooting

### Connection refused

Make sure the database container is running:

```bash
docker ps | grep meshmap-db
```

### Authentication failed

Check the credentials in your `docker-compose.yml`:
- User: `meshmap`
- Password: `meshmap_dev`
- Database: `meshmap`

### Permission denied

If you get permission errors, you might need to connect as the postgres superuser:

```bash
docker exec -it meshmap-db psql -U postgres -d meshmap
```

