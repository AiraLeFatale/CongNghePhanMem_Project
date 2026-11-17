# Một image chạy cả hệ thống: API + website công khai (/) + CMS (/admin).
# Build: docker build -t thuyetminh .   (chạy ở gốc repo)

FROM node:24-alpine AS web
WORKDIR /src/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:24-alpine AS cms
WORKDIR /src/cms
COPY cms/package*.json ./
RUN npm ci
COPY cms/ ./
RUN CMS_BASE=/admin/ npm run build

FROM node:24-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
COPY --from=web /src/web/dist /app/web/dist
COPY --from=cms /src/cms/dist /app/cms/dist
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION NODE_ENV=production PORT=4000 DB_FILE=/data/narration.db UPLOAD_DIR=/data/uploads
VOLUME /data
EXPOSE 4000
CMD ["node", "src/server.js"]
