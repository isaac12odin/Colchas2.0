FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package.json package-lock.json ./
COPY back/package.json back/package.json
COPY front/package.json front/package.json
COPY movil/package.json movil/package.json
RUN npm ci
COPY front front
ARG INTERNAL_API_URL=http://back:4000
ENV INTERNAL_API_URL=$INTERNAL_API_URL
RUN npm run build -w front

FROM node:22-alpine AS ejecucion
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=compilacion /app/front/.next/standalone ./
COPY --from=compilacion /app/front/.next/static ./front/.next/static
COPY --from=compilacion /app/front/public ./front/public
USER node
EXPOSE 3000
CMD ["node", "front/server.js"]
