FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001
CMD ["node","server.js"]
