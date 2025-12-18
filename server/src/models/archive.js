const pool = require('../config/database');

async function insert(geohash, time, path) {
  await pool.query(
    'INSERT INTO archive (geohash, time, path) VALUES ($1, $2, $3) ON CONFLICT (geohash) DO NOTHING',
    [geohash, time, path]
  );
}

async function getAll() {
  const result = await pool.query('SELECT geohash, time, path FROM archive ORDER BY geohash');
  return result.rows;
}

module.exports = {
  insert,
  getAll,
};

