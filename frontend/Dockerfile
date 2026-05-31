# ── Stage 1: сборка ──────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: раздача статики через nginx ──────
FROM nginx:alpine

# Конфиг nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Собранный React-приложение
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
