# StudyMate AI

Paste study notes, get an AI-generated summary and a 5-question multiple-choice
quiz, powered by the Claude API.

## Project structure

```
studymate-ai/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── server.js        # entrypoint - serves API + built frontend
│   │   ├── routes/
│   │   │   └── api.routes.js    # POST /api/summarize, POST /api/quiz
│   │   ├── services/
│   │   │   └── claudeService.js # all Claude API calls live here
│   │   └── middleware/
│   │       └── errorHandler.js
│   ├── package.json
│   └── .env.example
├── frontend/                 # React (Vite) app
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── NotesInput.jsx
│   │   │   ├── SummaryPanel.jsx
│   │   │   ├── QuizPanel.jsx
│   │   │   └── Spinner.jsx
│   │   ├── api/client.js     # fetch wrapper (streaming + JSON)
│   │   └── index.css
│   ├── index.html
│   └── package.json
├── Dockerfile                 # multi-stage build → single image
├── .dockerignore
└── README.md
```

## How it works

- **Summary**: `POST /api/summarize` streams Claude's response back to the
  browser as plain text using chunked HTTP responses. The frontend reads the
  stream with `fetch()` + `ReadableStream` and appends each chunk to the UI
  as it arrives, so the summary appears progressively rather than all at once.
- **Quiz**: `POST /api/quiz` calls Claude with a forced tool call
  (`tool_choice`) whose input schema defines exactly 5 questions, 4 options
  each, a correct answer, and an explanation. This makes the response
  reliably structured JSON rather than hoping the model formats free text
  correctly. The server also validates the shape before returning it.
- **Single container**: The Dockerfile builds the React app in one stage,
  then copies the static build output into the Express app's `public/`
  folder in a second stage. One Node process serves both the UI and the API,
  which is what makes this deployable as a single AWS App Runner service.

## Local development

You'll need Node.js 20+ and an Anthropic API key.

```bash
# Backend
cd backend
cp .env.example .env        # then edit .env and add your real ANTHROPIC_API_KEY
npm install
npm run dev                 # runs on http://localhost:8080

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                 # runs on http://localhost:5173, proxies /api to :8080
```

Open `http://localhost:5173` while developing — Vite's dev server proxies
`/api/*` requests to the Express backend on port 8080 (see
`frontend/vite.config.js`).

## Running the production build locally

```bash
# From the project root
docker build -t studymate-ai .
docker run -p 8080:8080 -e ANTHROPIC_API_KEY=sk-ant-your-key-here studymate-ai
```

Then open `http://localhost:8080` — the same container serves both the UI
and the API.

## Deploying to AWS App Runner

App Runner can build and deploy directly from a container image in Amazon
ECR (recommended for a Dockerfile-based app like this one).

1. **Build and push the image to ECR**

   ```bash
   aws ecr create-repository --repository-name studymate-ai

   aws ecr get-login-password --region <your-region> \
     | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<your-region>.amazonaws.com

   docker build -t studymate-ai .
   docker tag studymate-ai:latest <account-id>.dkr.ecr.<your-region>.amazonaws.com/studymate-ai:latest
   docker push <account-id>.dkr.ecr.<your-region>.amazonaws.com/studymate-ai:latest
   ```

2. **Create the App Runner service**

   - Console: App Runner → Create service → Container registry → Amazon ECR
     → select the `studymate-ai` image and tag.
   - Port: `8080` (matches `EXPOSE 8080` / `ENV PORT=8080` in the Dockerfile).
   - Environment variables: add `ANTHROPIC_API_KEY` as a **secret** (App
     Runner supports pulling this from AWS Secrets Manager or Parameter
     Store — don't paste the raw key into a plaintext env var in a shared
     account).
   - Health check: point it at `/health` (already implemented in
     `server.js`).

3. **Auto-deploy on push (optional)**: point App Runner's deployment trigger
   at the ECR image tag, or wire up a CI job that rebuilds and pushes on
   every merge to `main`.

### Environment variables reference

| Variable            | Required | Description                                                                 |
|---------------------|----------|-------------------------------------------------------------------------------|
| `ANTHROPIC_API_KEY`  | Yes      | Your Claude API key. Store as a secret, never commit it.                     |
| `PORT`               | No       | Port the server listens on. App Runner sets this; defaults to `8080`.        |
| `ALLOWED_ORIGINS`    | No       | Comma-separated CORS origins. Only relevant for local dev across two ports.  |

## Notes on the Claude model

The backend is pinned to `claude-sonnet-5` in `backend/src/services/claudeService.js`.
That's the only place the model ID appears, so upgrading later is a one-line change.

## Error handling

- Empty/missing notes → `400` with a clear message, no API call made.
- Notes over 20,000 characters → `400` (adjust `MAX_NOTES_LENGTH` in
  `api.routes.js` if you need a different cap).
- Claude API failures → `502` with a generic user-facing message (details
  are logged server-side, not leaked to the client).
- Malformed JSON body → handled centrally in `errorHandler.js`.
- Basic rate limiting (60 requests / 15 min / IP) protects `/api/*` from
  abuse and runaway API costs — tune in `server.js` as needed.
