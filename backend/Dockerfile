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

# 创建非root用户
RUN addgroup -g 1001 -S nodejs

RUN adduser -S nodejs -u 1001

# 更改文件所有权
RUN chown -R nodejs:nodejs /app/backend

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["node", "src/app.js"]
