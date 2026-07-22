/**
 * server.js
 * ---------
 * Entry point for the StudyMate AI backend.
 *
 * In production this single Express server does two jobs:
 *   1. Serves the built React app (static files) from /public
 *   2. Serves the /api/* endpoints that talk to Claude
 *
 * This is what lets the whole app ship as one Docker container / one
 * AWS App Runner service, with no separate frontend hosting needed.
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const apiRoutes = require('./routes/api.routes');
const errorHandler = require('./middleware/errorHandler');

// Fail fast if the API key is missing - better to crash on boot with a
// clear message than to fail mysteriously on the first real request.
if (!process.env.GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY environment variable is not set.');
  process.exit(1);
}

const app = express();

// App Runner sets PORT itself; default to 8080 to match its convention
// when running locally / in other environments.
const PORT = process.env.PORT || 8080;

// --- Middleware ---------------------------------------------------------

// Parse JSON bodies (study notes come in as { notes: "..." }).
// A 200kb limit comfortably covers pasted notes while blocking abuse.
app.use(express.json({ limit: '200kb' }));

// CORS is only relevant for local dev, where the Vite dev server runs on
// a different origin/port than the API. In production the frontend is
// served from the same origin, so this is effectively a no-op there.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  })
);

// Basic rate limiting on the AI endpoints to protect against abuse/runaway
// costs. Tune these numbers to your expected traffic.
const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});
app.use('/api', aiRateLimiter);

// --- Routes --------------------------------------------------------------

app.use('/api', apiRoutes);

// Simple health check for App Runner / load balancers.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Serve the built React frontend (see Dockerfile - the frontend build
// output gets copied into backend/public at image build time).
const frontendPath = path.join(__dirname, '..', 'public');
app.use(express.static(frontendPath));

// Any route that isn't /api/* or /health falls through to index.html so
// React Router (if added later) and client-side navigation work correctly.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- Error handling --------------------------------------------------------

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`StudyMate AI backend listening on port ${PORT}`);
});
