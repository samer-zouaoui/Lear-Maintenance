# ---- Étape 1 : build ----
FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# ---- Étape 2 : image finale ----
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]