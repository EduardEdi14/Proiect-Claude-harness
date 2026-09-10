# Dockerfile pentru serverul Node.js al Libra Maker.
# Context de build: harness/ (directorul parinte al backend/ si frontend/).

FROM node:20-slim

# Python 3 pentru runner.py
RUN apt-get update && apt-get install -y --no-install-recommends python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiem mai intai package.json pentru cache layer
COPY backend/node/package.json backend/node/package-lock.json* ./node/
RUN cd node && npm install --only=production

# Copiem codul Node.js si Python
COPY backend/node/   ./node/
COPY backend/python/ ./python/

# Copiem frontend-ul (template-urile Nunjucks si fisierele statice)
COPY frontend/ ./frontend/

WORKDIR /app/node

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "server.js"]
