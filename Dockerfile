# Build stage
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist

# Đảm bảo các biến môi trường được truyền vào khi chạy container
ENV JIRA_DOMAIN=""
ENV JIRA_EMAIL=""
ENV JIRA_API_TOKEN=""
ENV PORT=3000

EXPOSE 3000

# MCP servers giao tiếp qua stdio, nên chúng ta chạy trực tiếp file index.js
ENTRYPOINT ["node", "dist/index.js", "--sse"]
