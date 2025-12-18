const pool = require('../config/database');

async function getAll() {
  const result = await pool.query(
    'SELECT id, lat, lon, name, elev, time FROM repeaters ORDER BY id, time DESC'
  );
  
  return {
    keys: result.rows.map(row => ({
      name: `${row.id}|${parseFloat(row.lat)}|${parseFloat(row.lon)}`,
      metadata: {
        time: row.time,
        id: row.id,
        name: row.name,
        lat: parseFloat(row.lat),
        lon: parseFloat(row.lon),
        elev: row.elev
      }
    }))
  };
}

async function getById(id) {
  const result = await pool.query(
    'SELECT id, lat, lon, name, elev, time FROM repeaters WHERE id = $1 ORDER BY time DESC',
    [id]
  );
  return result.rows;
}

async function getByLocation(id, lat, lon) {
  const result = await pool.query(
    'SELECT id, lat, lon, name, elev, time FROM repeaters WHERE id = $1 AND lat = $2 AND lon = $3',
    [id, lat, lon]
  );
  return result.rows[0] || null;
}

async function upsert(id, lat, lon, name, elev, time) {
  const query = `
    INSERT INTO repeaters (id, lat, lon, name, elev, time)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id, lat, lon)
    DO UPDATE SET
      name = EXCLUDED.name,
      elev = COALESCE(EXCLUDED.elev, repeaters.elev),
      time = EXCLUDED.time,
      updated_at = CURRENT_TIMESTAMP
  `;
  
  // Ensure elev is null or a valid number (can be decimal)
  const elevValue = elev !== null && elev !== undefined ? parseFloat(elev) : null;
  
  await pool.query(query, [id, lat, lon, name, elevValue, time]);
}

async function deleteStale(maxAgeDays) {
  const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
  const result = await pool.query(
    'DELETE FROM repeaters WHERE time < $1 RETURNING id',
    [cutoffTime]
  );
  return result.rows.length;
}

async function deleteByIdLatLon(id, lat, lon) {
  await pool.query(
    'DELETE FROM repeaters WHERE id = $1 AND lat = $2 AND lon = $3',
    [id, lat, lon]
  );
}

module.exports = {
  getAll,
  getById,
  getByLocation,
  upsert,
  deleteStale,
  deleteByIdLatLon,
};

