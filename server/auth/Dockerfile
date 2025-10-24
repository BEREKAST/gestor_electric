# server/auth/Dockerfile
FROM node:20-bullseye-slim

# 1) Dependencias del sistema (openssl 3 ya viene en bullseye/bookworm,
#    pero instalamos herramientas básicas de red y certs)
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends ca-certificates openssl curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2) Copiamos package.json primero para cache de npm ci
COPY package*.json ./

# 3) Instalar deps de prod
RUN npm ci

# 4) Copiar el resto del código
COPY . .

# 5) Generar cliente Prisma (detecta binarios correctos para Debian)
RUN npx prisma generate

# 6) Exponer puerto
EXPOSE 3001

# 7) Arranque
CMD ["node", "server.js"]
