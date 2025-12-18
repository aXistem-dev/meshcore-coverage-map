const express = require('express');
const router = express.Router();
const samplesModel = require('../models/samples');
const { parseLocation, sampleKey } = require('../utils/shared');

// GET /get-samples?p=<prefix>
router.get('/get-samples', async (req, res, next) => {
  try {
    const prefix = req.query.p || null;
    const samples = await samplesModel.getByPrefix(prefix);
    res.json(samples);
  } catch (error) {
    next(error);
  }
});

// POST /put-sample
router.post('/put-sample', express.json(), async (req, res, next) => {
  try {
    const { lat, lon, path } = req.body;
    const [parsedLat, parsedLon] = parseLocation(lat, lon);
    const time = Date.now();
    const normalizedPath = (path ?? []).map(p => p.toLowerCase());
    const geohash = sampleKey(parsedLat, parsedLon);
    
    // Upsert - the database will handle merging paths atomically
    await samplesModel.upsert(geohash, time, normalizedPath);
    
    res.send('OK');
  } catch (error) {
    next(error);
  }
});

module.exports = router;

