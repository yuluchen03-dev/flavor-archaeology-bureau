FROM node:18-alpine

# 安装系统依赖（python3 用于 PythonBridge，make/g++ 用于 node-gyp 原生模块）
RUN apk add --no-cache python3 make g++

# 设置工作目录
WORKDIR /app/backend

# 复制package文件
COPY backend/package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制后端源代码
COPY backend/ .

# 复制Python服务和数据文件
COPY service /app/service
COPY data /app/backend/data

# 设置Python环境变量
ENV PYTHONIOENCODING=utf-8
ENV PYTHON_BIN=python3
ENV NODE_ENV=production

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 更改文件所有权
RUN chown -R nodejs:nodejs /app/backend && \
    chown -R nodejs:nodejs /app/service

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 3001

# 启动命令：先初始化数据库，再启动服务
CMD ["sh", "-c", "npm run db:init && node src/app.js"]
