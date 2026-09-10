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

# Copiem intai package.json: `npm install` (nu `npm ci`) rezolva in imagine
# un package-lock lipsa sau desincronizat, fara sa cerem sincronizare locala.
COPY backend/node/package.json ./backend/node/
RUN cd backend/node && npm install --omit=dev

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
