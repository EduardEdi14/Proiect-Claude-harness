# Dockerfile pentru serverul Node.js al Libra Maker.
# Context de build: harness/ (directorul parinte al backend/ si frontend/).
#
# Structura din imagine o repeta pe cea din repo (/app = harness/), pentru ca
# server.js si store.js folosesc cai relative fata de __dirname:
#   ../../frontend/templates-njk   sabloanele Nunjucks
#   ../python/runner.py            runner-ul de sesiune
# Daca aplatizezi backend/node in /app/node, caile ies din /app si serverul
# raspunde cu 500 "template not found".

FROM node:20-slim

# Python 3 pentru runner.py (runner-ul foloseste doar stdlib, fara pip install)
RUN apt-get update && apt-get install -y --no-install-recommends python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

<<<<<<< HEAD
# Copy only package.json first; use `npm install` (not `npm ci`) so that a
# missing or stale package-lock.json is automatically resolved inside the
# image layer — no need to keep the lock file in sync locally.
COPY backend/node/package.json ./backend/node/
RUN cd backend/node && npm install --omit=dev
=======
# Copiem mai intai package.json pentru cache layer
COPY backend/node/package.json backend/node/package-lock.json* ./node/
RUN cd node && npm install --only=production
>>>>>>> 7e11c9ed95b7b496020f9f7214d12ea4e2a34e3a

# Codul Node.js si Python
COPY backend/node/   ./backend/node/
COPY backend/python/ ./backend/python/

# Frontend-ul (sabloanele Nunjucks si fisierele statice)
COPY frontend/ ./frontend/

WORKDIR /app/backend/node

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "server.js"]
