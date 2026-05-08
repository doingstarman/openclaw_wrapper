FROM node:22-alpine AS deps
WORKDIR /app
COPY miniapp/server/package*.json miniapp/server/
COPY miniapp/web/package*.json miniapp/web/
RUN npm ci --prefix miniapp/server && npm ci --prefix miniapp/web

FROM deps AS build
WORKDIR /app
COPY miniapp miniapp
RUN npm run build --prefix miniapp/web

FROM node:22-alpine AS runtime
WORKDIR /app/miniapp/server
ENV NODE_ENV=production \
    PORT=3001 \
    WEB_DIST_PATH=../web/dist
COPY --from=deps /app/miniapp/server/node_modules ./node_modules
COPY --from=build /app/miniapp/server ./
COPY --from=build /app/miniapp/web/dist ../web/dist
EXPOSE 3001
CMD ["node", "src/index.js"]
