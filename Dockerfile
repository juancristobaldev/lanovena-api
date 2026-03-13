# Fase 1: Construcción
FROM node:20-slim AS builder
WORKDIR /app

# Instalar OpenSSL para compilar Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

# Generar Prisma y compilar NestJS
RUN npx prisma generate
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build

# Fase 2: Ejecución
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Instalar dependencias necesarias para Prisma en producción
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copiar archivos compilados y módulos
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 3000

# Usamos la ruta correcta y habilitamos alias de tsconfig
CMD ["node", "-r", "tsconfig-paths/register", "dist/src/main"]