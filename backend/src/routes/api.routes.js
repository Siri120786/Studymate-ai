/**
 * api.routes.js
 * -------------
 * The two public endpoints StudyMate AI exposes:
 *   POST /api/summarize - streams a plain-text summary back to the client
 *   POST /api/quiz      - returns a 5-question MCQ quiz as JSON
 */

const express = require('express');
const { streamSummary, generateQuiz } = require('../services/geminiService');

const router = express.Router();

// Reasonable ceiling on pasted notes so we don't send huge payloads to the
// model (and so a malicious client can't send unbounded text). Adjust as needed.
const MAX_NOTES_LENGTH = 20000;

/**
 * Shared input validation for both routes. Returns an error string if
 * invalid, or null if the input is fine.
 */
function validateNotes(notes) {
  if (typeof notes !== 'string' || notes.trim().length === 0) {
    return 'Study notes are required and cannot be empty.';
  }
  if (notes.length > MAX_NOTES_LENGTH) {
    return `Study notes are too long (max ${MAX_NOTES_LENGTH} characters).`;
  }
  return null;
}

const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
function normalizeDifficulty(difficulty) {
  return VALID_DIFFICULTIES.includes(difficulty) ? difficulty : 'intermediate';
}

// POST /api/summarize
router.post('/summarize', async (req, res) => {
  const { notes, difficulty } = req.body || {};
  const level = normalizeDifficulty(difficulty);

  const validationError = validateNotes(notes);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  // We stream the response as plain text using chunked transfer encoding.
  // The frontend reads this with fetch()'s ReadableStream reader.
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  // Disable any intermediate buffering (e.g. nginx) so chunks arrive promptly.
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    await streamSummary(notes, level, (chunk) => {
      res.write(chunk);
    });
    res.end();
  } catch (err) {
    console.error('Error while streaming summary:', err);
    // Headers are likely already sent at this point (streaming started),
    // so we can't send a clean JSON error - end the stream with a notice.
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to generate summary. Please try again.' });
    } else {
      res.write('\n\n[Error: the summary could not be completed. Please try again.]');
      res.end();
    }
  }
});

// POST /api/quiz
router.post('/quiz', async (req, res) => {
 const { notes, difficulty } = req.body || {};
 const level = normalizeDifficulty(difficulty);
  const validationError = validateNotes(notes);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const questions = await generateQuiz(notes, level);
    res.status(200).json({ questions });
  } catch (err) {
    console.error('Error while generating quiz:', err);
    res.status(502).json({ error: 'Failed to generate quiz. Please try again.' });
  }
});

module.exports = router;
