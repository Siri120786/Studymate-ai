/**
 * errorHandler.js
 * ---------------
 * Catch-all error handler. Handles things like malformed JSON bodies
 * (express.json() throws before our route handlers ever run) and any
 * unexpected error that bubbles up without being caught elsewhere.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('Unhandled error:', err);

  if (res.headersSent) {
    return next(err);
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON in request body.' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }

  res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
}

module.exports = errorHandler;
