# Dockerfile cho Next.js Dashboard
FROM node:20-slim

# Install MySQL client (real MySQL, not MariaDB) for database initialization
RUN apt-get update && \
    apt-get install -y default-mysql-client bash && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy UI source code
COPY ui/ ./

# Install dependencies — dùng đúng phiên bản trong package-lock.json
# (npm ci), không để npm tự nâng/hạ gói lúc build.
RUN npm ci --legacy-peer-deps --no-audit --no-fund

# Build Next.js
RUN npm run build

# Copy entrypoint script
COPY docker/nextjs/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Chạy bằng user thường (node, uid 1000) thay vì root: nếu tiến trình Next bị
# khai thác, mã độc không có quyền root trong container.
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use entrypoint for auto database initialization
ENTRYPOINT ["/entrypoint.sh"]
