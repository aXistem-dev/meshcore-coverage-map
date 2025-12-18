const pool = require('../config/database');

async function getAll() {
  const result = await pool.query(`
    SELECT 
      c.geohash,
      c.heard,
      c.lost,
      c.last_heard,
      c.hit_repeaters,
      COALESCE(
        json_agg(
          json_build_object('time', cs.sample_time, 'path', cs.sample_path)
          ORDER BY cs.sample_time
        ) FILTER (WHERE cs.sample_time IS NOT NULL),
        '[]'::json
      ) as values
    FROM coverage c
    LEFT JOIN coverage_samples cs ON c.geohash = cs.coverage_geohash
    GROUP BY c.geohash, c.heard, c.lost, c.last_heard, c.hit_repeaters
    ORDER BY c.geohash
  `);
  
  return result.rows.map(row => ({
    hash: row.geohash,
    heard: row.heard ?? 0,
    lost: row.lost ?? 0,
    lastHeard: row.last_heard ?? 0,
    hitRepeaters: row.hit_repeaters ?? [],
    values: Array.isArray(row.values) ? row.values : []
  }));
}

async function getByGeohash(geohash) {
  const result = await pool.query(`
    SELECT 
      c.geohash,
      c.heard,
      c.lost,
      c.last_heard,
      c.hit_repeaters,
      COALESCE(
        json_agg(
          json_build_object('time', cs.sample_time, 'path', cs.sample_path)
          ORDER BY cs.sample_time
        ) FILTER (WHERE cs.sample_time IS NOT NULL),
        '[]'::json
      ) as values
    FROM coverage c
    LEFT JOIN coverage_samples cs ON c.geohash = cs.coverage_geohash
    WHERE c.geohash = $1
    GROUP BY c.geohash, c.heard, c.lost, c.last_heard, c.hit_repeaters
  `, [geohash]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    hash: row.geohash,
    heard: row.heard || 0,
    lost: row.lost || 0,
    lastHeard: row.last_heard || 0,
    hitRepeaters: row.hit_repeaters || [],
    values: row.values || []
  };
}

async function mergeCoverage(geohash, samples) {
  // Start a transaction
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get existing coverage entry
    const existing = await client.query(
      'SELECT heard, lost, last_heard, hit_repeaters FROM coverage WHERE geohash = $1',
      [geohash]
    );
    
    let heard = 0;
    let lost = 0;
    let lastHeard = 0;
    const hitRepeatersSet = new Set();
    
    // Initialize from existing if present
    if (existing.rows.length > 0) {
      heard = existing.rows[0].heard || 0;
      lost = existing.rows[0].lost || 0;
      lastHeard = existing.rows[0].last_heard || 0;
      (existing.rows[0].hit_repeaters || []).forEach(r => hitRepeatersSet.add(r.toLowerCase()));
    }
    
    // Process new samples
    for (const sample of samples) {
      const hasPath = sample.path && sample.path.length > 0;
      if (hasPath) {
        heard++;
      } else {
        lost++;
      }
      lastHeard = Math.max(lastHeard, sample.time);
      
      // Add to hit repeaters set
      if (sample.path) {
        sample.path.forEach(p => hitRepeatersSet.add(p.toLowerCase()));
      }
      
      // Insert or update coverage_samples
      await client.query(`
        INSERT INTO coverage_samples (coverage_geohash, sample_time, sample_path)
        VALUES ($1, $2, $3)
        ON CONFLICT (coverage_geohash, sample_time)
        DO NOTHING
      `, [geohash, sample.time, sample.path || []]);
    }
    
    // Update or insert coverage
    await client.query(`
      INSERT INTO coverage (geohash, heard, lost, last_heard, hit_repeaters)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (geohash)
      DO UPDATE SET
        heard = coverage.heard + EXCLUDED.heard,
        lost = coverage.lost + EXCLUDED.lost,
        last_heard = GREATEST(coverage.last_heard, EXCLUDED.last_heard),
        hit_repeaters = (
          SELECT ARRAY(
            SELECT DISTINCT unnest(ARRAY_CAT(coverage.hit_repeaters, EXCLUDED.hit_repeaters))
            ORDER BY 1
          )
        ),
        updated_at = CURRENT_TIMESTAMP
    `, [geohash, heard, lost, lastHeard, Array.from(hitRepeatersSet)]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getRecentGeohashes(lookBackDays) {
  const cutoffTime = Date.now() - (lookBackDays * 24 * 60 * 60 * 1000);
  
  // Get from coverage table
  const coverageResult = await pool.query(
    'SELECT geohash FROM coverage WHERE last_heard >= $1',
    [cutoffTime]
  );
  
  const geohashes = new Set(coverageResult.rows.map(r => r.geohash));
  
  // Also get from samples (all samples are considered recent)
  const samplesResult = await pool.query(
    'SELECT DISTINCT LEFT(geohash, 6) as geohash FROM samples'
  );
  
  samplesResult.rows.forEach(r => geohashes.add(r.geohash));
  
  return Array.from(geohashes);
}

async function deleteByGeohash(geohash) {
  await pool.query('DELETE FROM coverage WHERE geohash = $1', [geohash]);
}

async function deduplicateValues(geohash) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get all samples for this coverage
    const samplesResult = await client.query(
      'SELECT sample_time, sample_path FROM coverage_samples WHERE coverage_geohash = $1 ORDER BY sample_time',
      [geohash]
    );
    
    // Group by time and take first path for each time
    const grouped = new Map();
    samplesResult.rows.forEach(row => {
      if (!grouped.has(row.sample_time)) {
        grouped.set(row.sample_time, row.sample_path);
      }
    });
    
    // Delete all and reinsert deduplicated
    await client.query(
      'DELETE FROM coverage_samples WHERE coverage_geohash = $1',
      [geohash]
    );
    
    for (const [time, path] of grouped.entries()) {
      await client.query(
        'INSERT INTO coverage_samples (coverage_geohash, sample_time, sample_path) VALUES ($1, $2, $3)',
        [geohash, time, path]
      );
    }
    
    // Recalculate metadata
    let heard = 0;
    let lost = 0;
    let lastHeard = 0;
    const hitRepeatersSet = new Set();
    
    for (const [time, path] of grouped.entries()) {
      const hasPath = path && path.length > 0;
      if (hasPath) {
        heard++;
      } else {
        lost++;
      }
      lastHeard = Math.max(lastHeard, time);
      if (path) {
        path.forEach(p => hitRepeatersSet.add(p.toLowerCase()));
      }
    }
    
    await client.query(
      'UPDATE coverage SET heard = $1, lost = $2, last_heard = $3, hit_repeaters = $4 WHERE geohash = $5',
      [heard, lost, lastHeard, Array.from(hitRepeatersSet), geohash]
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getAll,
  getByGeohash,
  mergeCoverage,
  getRecentGeohashes,
  deleteByGeohash,
  deduplicateValues,
};

