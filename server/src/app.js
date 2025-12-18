const express = require('express');
const path = require('path');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const samplesRoutes = require('./routes/samples');
const repeatersRoutes = require('./routes/repeaters');
const coverageRoutes = require('./routes/coverage');
const nodesRoutes = require('./routes/nodes');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/', samplesRoutes);
app.use('/', repeatersRoutes);
app.use('/', coverageRoutes);
app.use('/', nodesRoutes);
app.use('/', adminRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;

