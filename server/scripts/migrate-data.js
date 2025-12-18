/**
 * Data migration script to import data from Cloudflare KV into PostgreSQL
 * 
 * This script can be used if you have access to export data from Cloudflare KV,
 * or if you can use the /slurp endpoint to fetch data from the live service.
 * 
 * Usage:
 *   node scripts/migrate-data.js [--from-slurp] [--slurp-url=https://mesh-map.pages.dev]
 */

require('dotenv').config();
const pool = require('../src/config/database');
const { sampleKey, coverageKey, fromTruncatedTime } = require('../src/utils/shared');

async function migrateFromSlurp(slurpUrl = 'https://mesh-map.pages.dev') {
  console.log(`Fetching data from ${slurpUrl}/get-nodes...`);
  
  const response = await fetch(`${slurpUrl}/get-nodes`);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log(`Fetched ${data.samples?.length || 0} samples, ${data.repeaters?.length || 0} repeaters, ${data.coverage?.length || 0} coverage entries`);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Migrate samples
    if (data.samples && data.samples.length > 0) {
      console.log('Migrating samples...');
      for (const sample of data.samples) {
        const time = fromTruncatedTime(sample.time);
        const path = sample.path || [];
        
        await client.query(
          'INSERT INTO samples (geohash, time, path) VALUES ($1, $2, $3) ON CONFLICT (geohash) DO UPDATE SET time = EXCLUDED.time, path = EXCLUDED.path',
          [sample.id, time, path]
        );
      }
      console.log(`Migrated ${data.samples.length} samples`);
    }
    
    // Migrate repeaters
    if (data.repeaters && data.repeaters.length > 0) {
      console.log('Migrating repeaters...');
      for (const repeater of data.repeaters) {
        const time = fromTruncatedTime(repeater.time);
        
        await client.query(
          'INSERT INTO repeaters (id, lat, lon, name, elev, time) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id, lat, lon) DO UPDATE SET name = EXCLUDED.name, elev = EXCLUDED.elev, time = EXCLUDED.time',
          [repeater.id, repeater.lat, repeater.lon, repeater.name, repeater.elev, time]
        );
      }
      console.log(`Migrated ${data.repeaters.length} repeaters`);
    }
    
    // Migrate coverage
    if (data.coverage && data.coverage.length > 0) {
      console.log('Migrating coverage...');
      for (const cov of data.coverage) {
        const lastHeard = fromTruncatedTime(cov.time || 0);
        const hitRepeaters = cov.rptr || [];
        
        // Calculate heard/lost from the coverage data if available
        // Note: The original coverage data structure may vary
        const heard = cov.rcv || 0;
        const lost = cov.lost || 0;
        
        await client.query(
          'INSERT INTO coverage (geohash, heard, lost, last_heard, hit_repeaters) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (geohash) DO UPDATE SET heard = EXCLUDED.heard, lost = EXCLUDED.lost, last_heard = EXCLUDED.last_heard, hit_repeaters = EXCLUDED.hit_repeaters',
          [cov.id, heard, lost, lastHeard, hitRepeaters]
        );
      }
      console.log(`Migrated ${data.coverage.length} coverage entries`);
    }
    
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function migrateFromExport(exportData) {
  // This function would be used if you have a direct export from Cloudflare KV
  // Implementation depends on the export format
  console.log('Direct export migration not yet implemented');
  console.log('Use --from-slurp to migrate from live service');
}

async function main() {
  const args = process.argv.slice(2);
  const fromSlurp = args.includes('--from-slurp');
  const slurpUrlArg = args.find(arg => arg.startsWith('--slurp-url='));
  const slurpUrl = slurpUrlArg ? slurpUrlArg.split('=')[1] : 'https://mesh-map.pages.dev';
  
  try {
    if (fromSlurp) {
      await migrateFromSlurp(slurpUrl);
    } else {
      console.log('Usage: node scripts/migrate-data.js [--from-slurp] [--slurp-url=URL]');
      console.log('  --from-slurp: Fetch data from live Cloudflare service');
      console.log('  --slurp-url: URL of the service to fetch from (default: https://mesh-map.pages.dev)');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { migrateFromSlurp, migrateFromExport };

