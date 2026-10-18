FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV NODE_ENV=production PORT=4000 DB_FILE=/data/narration.db UPLOAD_DIR=/data/uploads
VOLUME /data
EXPOSE 4000
CMD ["node", "src/server.js"]
