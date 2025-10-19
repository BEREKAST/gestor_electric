FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm i
COPY . .
EXPOSE 3001 3002 3003 3004
CMD ["npm","run","dev"]
