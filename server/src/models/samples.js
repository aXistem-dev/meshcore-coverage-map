const pool = require('../config/database');
const { sampleKey, coverageKey } = require('../utils/shared');

async function getByPrefix(prefix) {
  const query = prefix
    ? 'SELECT geohash, time, path FROM samples WHERE geohash LIKE $1 ORDER BY geohash'
    : 'SELECT geohash, time, path FROM samples ORDER BY geohash';
  
  const params = prefix ? [`${prefix}%`] : [];
  const result = await pool.query(query, params);
  
  return {
    keys: result.rows.map(row => ({
      name: row.geohash,
      metadata: {
        time: row.time,
        path: row.path || []
      }
    }))
  };
}

async function getAll() {
  const result = await pool.query('SELECT geohash, time, path FROM samples ORDER BY geohash');
  return {
    keys: result.rows.map(row => ({
      name: row.geohash,
      metadata: {
        time: row.time,
        path: row.path || []
      }
    }))
  };
}

async function getWithMetadata(geohash) {
  const result = await pool.query(
    'SELECT geohash, time, path FROM samples WHERE geohash = $1',
    [geohash]
  );
  
  if (result.rows.length === 0) {
    return { value: null, metadata: null };
  }
  
  const row = result.rows[0];
  return {
    value: '',
    metadata: {
      time: row.time,
      path: row.path || []
    }
  };
}

async function upsert(geohash, time, path) {
  // Use INSERT ... ON CONFLICT to handle concurrent writes atomically
  // Merge paths by combining arrays and removing duplicates
  const query = `
    INSERT INTO samples (geohash, time, path)
    VALUES ($1, $2, $3)
    ON CONFLICT (geohash) 
    DO UPDATE SET 
      time = GREATEST(samples.time, EXCLUDED.time),
      path = (
        SELECT ARRAY(
          SELECT DISTINCT unnest(ARRAY_CAT(COALESCE(samples.path, '{}'), EXCLUDED.path))
          ORDER BY 1
        )
      ),
      updated_at = CURRENT_TIMESTAMP
  `;
  
  await pool.query(query, [geohash, time, path]);
}

async function deleteByGeohash(geohash) {
  await pool.query('DELETE FROM samples WHERE geohash = $1', [geohash]);
}

async function getOlderThan(maxAgeDays) {
  const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
  const result = await pool.query(
    'SELECT geohash, time, path FROM samples WHERE time < $1 ORDER BY geohash',
    [cutoffTime]
  );
  return result.rows;
}

async function deleteByTimeRange(startTime, endTime) {
  const result = await pool.query(
    'DELETE FROM samples WHERE time >= $1 AND time <= $2 RETURNING geohash',
    [startTime, endTime]
  );
  return result.rows.length;
}

module.exports = {
  getByPrefix,
  getAll,
  getWithMetadata,
  upsert,
  deleteByGeohash,
  getOlderThan,
  deleteByTimeRange,
};

