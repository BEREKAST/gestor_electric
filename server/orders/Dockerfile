FROM node:20-alpine
WORKDIR /app

# OpenSSL para runtime de Prisma en Alpine
RUN apk add --no-cache openssl

# Copiamos package.json y prisma/ ANTES de npm i (porque tu postinstall corre prisma generate)
COPY package.json ./
COPY prisma ./prisma

# Instala dependencias (postinstall ya verá prisma/schema.prisma)
RUN npm i

# Copiamos el resto del código
COPY . .

# (Opcional) fuerza una generación adicional por si cambió algo
RUN npx prisma generate

EXPOSE 3004
CMD ["node","server.js"]  # o ["npm","run","dev"] si prefieres nodemon
