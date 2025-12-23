const express = require('express');
const router = express.Router();
const { getCenterPos, getMaxDistanceMiles } = require('../utils/shared');

// GET /config - Get frontend configuration
router.get('/config', (req, res) => {
  const centerPos = getCenterPos();
  const maxDistanceMiles = getMaxDistanceMiles();
  
  res.json({
    centerPos: centerPos,
    maxDistanceMiles: maxDistanceMiles
  });
});

module.exports = router;

