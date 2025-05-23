#!/bin/bash
set -e

# ==============================================
# SCRIPT KHỞI ĐỘNG CHO CONTAINER ADONISJS
# ==============================================
# Script này đảm bảo các service cần thiết (MySQL, Redis) 
# đã sẵn sàng trước khi khởi động ứng dụng.
# Nó cũng sẽ tự động tạo APP_KEY và chạy migration.
# ==============================================

# Đợi cho đến khi MySQL sẵn sàng
# QUAN TRỌNG: Cần đảm bảo MySQL đã hoạt động trước khi chạy migration
echo "Đang chờ MySQL..."
until nc -z database 3306
do
  echo "Đang đợi MySQL khởi động..."
  sleep 2
done
echo "MySQL đã sẵn sàng!"

# Đợi cho đến khi Redis sẵn sàng
# QUAN TRỌNG: Cần đảm bảo Redis đã hoạt động nếu sử dụng Redis cho session
echo "Đang chờ Redis..."
until nc -z redis 6379
do
  echo "Đang đợi Redis khởi động..."
  sleep 2
done
echo "Redis đã sẵn sàng!"

# Tạo APP_KEY nếu chưa có
# QUAN TRỌNG: APP_KEY là khóa mã hóa quan trọng, không được chia sẻ hoặc commit lên git
# Mỗi môi trường nên có APP_KEY riêng
if [ -z "$APP_KEY" ]; then
  echo "Đang tạo APP_KEY..."
  export APP_KEY=$(node ace generate:key)
  echo "APP_KEY=$APP_KEY" >> .env
  echo "Đã tạo APP_KEY mới"
fi

# Chạy migration để cập nhật cấu trúc database
# LƯU Ý: Tùy chọn --force sẽ bỏ qua xác nhận trong môi trường production
# Trong một số trường hợp, bạn có thể muốn chạy thủ công hoặc sử dụng db:seed
echo "Đang chạy migration..."
node ace migration:run --force

# Có thể thêm các bước khác tại đây: seeding, build assets, etc.
# Ví dụ: node ace db:seed --force

# Khởi động ứng dụng
# QUAN TRỌNG: Sử dụng exec để đảm bảo process của Node.js nhận được tín hiệu từ Docker
echo "Khởi động ứng dụng..."
exec node build/bin/server.js 