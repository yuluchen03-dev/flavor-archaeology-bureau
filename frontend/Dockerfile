FROM node:22-alpine AS build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

WORKDIR /app
COPY frontend ./frontend

# 离线评审资源生成器（package.json 的 build:offline:assets 通过 ../scripts 引用）
COPY scripts/build_offline_assets.mjs /app/scripts/build_offline_assets.mjs

WORKDIR /app/frontend

ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
