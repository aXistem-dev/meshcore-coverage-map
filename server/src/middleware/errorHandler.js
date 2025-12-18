function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  // Validation errors
  if (err.message && err.message.includes('Invalid location')) {
    return res.status(400).json({ error: err.message });
  }
  
  if (err.message && err.message.includes('exceeds max distance')) {
    return res.status(400).json({ error: err.message });
  }
  
  // Database errors
  if (err.code && err.code.startsWith('23')) {
    return res.status(400).json({ error: 'Database constraint violation' });
  }
  
  // Default error
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

module.exports = errorHandler;

