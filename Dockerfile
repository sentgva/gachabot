FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY bot ./bot
COPY webapp/js/lib ./webapp/js/lib
COPY webapp/data ./webapp/data
CMD ["node", "bot/index.js"]
