FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package.json package-lock.json ./
COPY back/package.json back/package.json
COPY front/package.json front/package.json
COPY movil/package.json movil/package.json
RUN npm ci
COPY back back
RUN npm run build -w back

# Instala desde el lockfile únicamente dependencias de producción del backend.
# Expo, Metro, Next y las herramientas de pruebas no entran en esta etapa.
FROM node:22-alpine AS dependencias-produccion
WORKDIR /app
COPY package.json package-lock.json ./
COPY back/package.json back/package.json
COPY front/package.json front/package.json
COPY movil/package.json movil/package.json
COPY back/prisma back/prisma
RUN npm ci --omit=dev --workspace @nexo/back --include-workspace-root=false --no-audit --no-fund \
  && npm cache clean --force

FROM node:22-alpine AS ejecucion
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node --from=dependencias-produccion /app/node_modules node_modules
COPY --chown=node:node --from=compilacion /app/node_modules/.prisma node_modules/.prisma
COPY --chown=node:node --from=compilacion /app/back/dist back/dist
COPY --chown=node:node --from=compilacion /app/back/prisma back/prisma
USER node
EXPOSE 4000
CMD ["node", "back/dist/servidor.js"]
