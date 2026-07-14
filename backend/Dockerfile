FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 \
  && ln -s /usr/bin/python3 /usr/bin/python \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend ./backend
COPY service ./service
COPY data ./data

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3001
ENV PYTHONIOENCODING=utf-8
ENV PYTHON_BIN=python3

EXPOSE 3001

CMD ["sh", "-c", "npm run db:init && npm start"]
