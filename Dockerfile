FROM node:20

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Cài đặt các phụ thuộc hệ thống
# netcat: cần thiết để kiểm tra kết nối đến database và redis
RUN apt-get update && apt-get install -y \
    netcat-openbsd \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# QUAN TRỌNG: Copy package.json và package-lock.json trước
# Điều này tận dụng Docker cache khi không có thay đổi ở dependencies
COPY package*.json ./

# Copy scripts thư mục
COPY scripts ./scripts

# Làm cho scripts có quyền thực thi
RUN chmod +x ./scripts/*.js

# Chuẩn bị package.json cho Docker (loại bỏ các dependencies Windows)
RUN node ./scripts/prepare-package-json.js

# Cài đặt các phụ thuộc Node.js cho Linux
RUN npm install --no-package-lock

# Copy toàn bộ source code vào container
# QUAN TRỌNG: Đảm bảo .dockerignore đã loại trừ các file nhạy cảm như .env
COPY . .

# Build ứng dụng
# LƯU Ý: Thực hiện build trong quá trình tạo image để tăng hiệu suất
RUN npm run build

# Mở cổng 3333 cho ứng dụng
# LƯU Ý: Đảm bảo cổng này khớp với PORT trong file .env và docker-compose.yml
EXPOSE 3333

# Cấu hình script khởi động
# QUAN TRỌNG: Script này sẽ kiểm tra kết nối database và tạo APP_KEY
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Khởi động ứng dụng
# Script docker-entrypoint.sh sẽ đợi database, tạo APP_KEY và chạy migration
CMD ["/usr/local/bin/docker-entrypoint.sh"] 