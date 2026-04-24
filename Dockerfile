# 第一阶段：构建 (Build)
FROM node:20-alpine AS builder
WORKDIR /app

# 只有 package-lock.json 存在，安装才最稳定
COPY package.json package-lock.json ./
RUN npm install

# 复制所有文件并构建
COPY . .
# 注入构建时的环境变量（如果需要静态导出）
ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE

RUN npm run build

# 第二阶段：运行 (Runner)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 从 builder 阶段只拷贝必要的文件，减少镜像体积
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]