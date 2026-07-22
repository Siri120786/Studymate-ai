# =========================================================================
# StudyMate AI - single-container build
#
# Stage 1 builds the React frontend into static files.
# Stage 2 installs the backend's production deps and copies the built
# frontend into backend/public, so one Express server serves both the
# UI and the /api/* routes. This keeps the whole app as one image,
# which is what AWS App Runner expects for a container-based service.
# =========================================================================

# ---- Stage 1: build the frontend ----------------------------------------
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build
# Output lands in /app/frontend/dist

# ---- Stage 2: backend + built frontend -----------------------------------
FROM node:20-alpine AS runtime

# Run as a non-root user for better container security.
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

# Bring in the built frontend from stage 1. server.js serves static files
# from ../public relative to src/, i.e. /app/public.
COPY --from=frontend-build /app/frontend/dist ./public

# App Runner defaults to routing traffic to port 8080 unless configured
# otherwise; server.js also reads PORT from the environment if App Runner
# supplies a different value.
ENV PORT=8080
EXPOSE 8080

USER nodeusr

# Basic container-level healthcheck hitting the Express /health route.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||8080)+'/health').then(r=>{if(r.ok)process.exit(0);process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
