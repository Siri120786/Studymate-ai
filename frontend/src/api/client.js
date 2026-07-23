/**
 * client.js
 * ---------
 * Thin wrapper around fetch() for talking to the backend. Kept separate
 * from components so the streaming/parsing logic isn't tangled up with UI code.
 */

/**
 * Streams a summary for the given notes, invoking onChunk for every piece
 * of text as it arrives from the server.
 *
 * @param {string} notes
 * @param {(chunk: string) => void} onChunk
 * @param {AbortSignal} [signal]
 */
export async function streamSummary(notes, difficulty, onChunk, signal) {
  const response = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes, difficulty }),
    signal,
  });

  if (!response.ok) {
    const body = await safeJson(response);
    throw new Error(body?.error || `Request failed with status ${response.status}`);
  }

  // Read the streamed response body chunk by chunk as it arrives.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

/**
 * Requests a 5-question multiple-choice quiz for the given notes.
 *
 * @param {string} notes
 * @returns {Promise<Array<{question: string, options: string[], correctAnswer: string, explanation: string}>>}
 */
export async function fetchQuiz(notes, difficulty) {
  const response = await fetch('/api/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes, difficulty }),
  });

  const body = await safeJson(response);

  if (!response.ok) {
    throw new Error(body?.error || `Request failed with status ${response.status}`);
  }

  return body.questions;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
