const express = require('express');
const router = express.Router();
const coverageModel = require('../models/coverage');

// GET /get-coverage
router.get('/get-coverage', async (req, res, next) => {
  try {
    const coverage = await coverageModel.getAll();
    res.json(coverage);
  } catch (error) {
    next(error);
  }
});

// GET /get-wardrive-coverage
router.get('/get-wardrive-coverage', async (req, res, next) => {
  try {
    const LOOK_BACK_DAYS = 3;
    const geohashes = await coverageModel.getRecentGeohashes(LOOK_BACK_DAYS);
    res.json(geohashes);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

