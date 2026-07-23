/**
 * geminiService.js
 * ------------------
 * Single place where we talk to the Gemini API. Keeping all Google Gen AI
 * SDK usage here means the routes stay thin, and if the model or SDK
 * version ever changes, there's exactly one file to update.
 */

const { GoogleGenAI, Type } = require('@google/genai');

// The SDK reads GEMINI_API_KEY from the environment automatically,
// but we pass it explicitly so a missing key fails fast and loudly.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Pinned model ID.
const MODEL = 'gemini-flash-latest';

/**
 * Streams a concise summary of the given study notes.
 *
 * @param {string} notes - raw study notes pasted by the user
 * @param {(chunk: string) => void} onChunk - called with each text delta as it arrives
 * @returns {Promise<void>} resolves once the stream has finished
 */
async function streamSummary(notes, difficulty, onChunk) {
   const difficultyInstructions = {
     beginner:
       'Write for a beginner: use simple, plain language, explain any technical terms, and favor short sentences.',
     intermediate:
       'Write for a student with some background in the topic: clear and concise, technical terms are fine without extra explanation.',
     advanced:
       'Write for an advanced student: be precise and technical, and you may reference nuanced relationships between concepts without over-simplifying.',
   };
  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents: notes,
    config: {
      maxOutputTokens: 2048,
      systemInstruction:
        'You are a study assistant. Summarize the study notes the user gives you ' +
        'into a clear, concise summary a student could use to review before an exam. ' +
        'Use short paragraphs and/or bullet points. Do not add information that is not ' +
        'in the notes. Do not include any preamble like "Here is a summary" - just give the summary. ' +
        (difficultyInstructions[difficulty] || difficultyInstructions.intermediate),
    },
  });

  // The SDK yields one chunk per incremental text delta, which is exactly
  // what we want to forward to the client.
  for await (const chunk of stream) {
    if (chunk.text) {
      onChunk(chunk.text);
    }
  }
}

/**
 * Generates exactly 5 multiple-choice questions from the given study notes.
 *
 * Instead of Claude's forced tool-use, we use Gemini's native structured
 * output (responseMimeType + responseSchema), which guarantees the response
 * body is JSON matching our schema rather than relying on prose formatting.
 *
 * @param {string} notes - raw study notes pasted by the user
 * @returns {Promise<Array<{question: string, options: string[], correctAnswer: string, explanation: string}>>}
 */
async function generateQuiz(notes, difficulty) {
   const difficultyInstructions = {
     beginner:
       'Keep questions at a beginner level: test basic recall of definitions and facts stated directly in the notes, using simple wording.',
     intermediate:
       'Keep questions at an intermediate level: cover the most important concepts, with some questions requiring light inference beyond direct recall.',
     advanced:
       'Keep questions at an advanced level: require synthesis across multiple concepts, application to new scenarios, or distinguishing between closely related ideas. Avoid simple recall questions.',
   };
  const quizSchema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        minItems: 5,
        maxItems: 5,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              minItems: 4,
              maxItems: 4,
              items: { type: Type.STRING },
            },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ['question', 'options', 'correctAnswer', 'explanation'],
        },
      },
    },
    required: ['questions'],
  };

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Create a 5-question multiple-choice quiz from these study notes:\n\n${notes}`,
    config: {
      maxOutputTokens: 2048,
      systemInstruction:
        'You are a study assistant that writes exam-style multiple-choice questions ' +
        'strictly based on the study notes provided. Questions should cover the most ' +
        'important concepts. Options should be plausible but unambiguous - exactly one ' +
        'correct answer per question. ' +
         (difficultyInstructions[difficulty] || difficultyInstructions.intermediate),
      responseMimeType: 'application/json',
      responseSchema: quizSchema,
    },
  });

  const rawText = response.text || "";

console.log("\n========== GEMINI RAW RESPONSE ==========");
console.log(rawText);
console.log("=========================================\n");

let parsed;

try {
  parsed = JSON.parse(rawText);
} catch (err) {
  console.error("JSON Parse Error:", err.message);
  throw new Error("Gemini did not return a valid JSON quiz response.");
}

  const { questions } = parsed;

  // Defensive validation - even with a forced schema, don't blindly trust
  // external output. Better to fail clearly than serve a malformed quiz.
  if (!Array.isArray(questions) || questions.length !== 5) {
    throw new Error('Quiz response did not contain exactly 5 questions.');
  }
  for (const q of questions) {
    if (
      !q.question ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      !q.correctAnswer ||
      !q.options.includes(q.correctAnswer)
    ) {
      throw new Error('Quiz response contained a malformed question.');
    }
  }

  return questions;
}

module.exports = { streamSummary, generateQuiz, MODEL };