# ---- build ----
FROM node:20-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm i --frozen-lockfile
COPY . .
RUN pnpm build

# ---- runtime ----
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/server/public ./server/public
EXPOSE 5000
CMD ["node", "dist/index.js"]
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD node -e "fetch('http://localhost:5000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"