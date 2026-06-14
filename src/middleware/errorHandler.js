function errorHandler(err, req, res, next) {
  console.error(err);

  // Multer file size / type errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large (max 10 MB)' });
  }

  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = errorHandler;
