# Hướng dẫn Database Migrations (AdonisJS / Lucid)

Để giữ cho repository gọn gàng và tránh xung đột khi làm việc nhóm, các tệp migration sau khi đã được áp dụng lên các môi trường (Development, Test, Production) thành công có thể được loại bỏ khỏi repo. File `database/schema.ts` đóng vai trò là snapshot cấu trúc của các Lucid models.

## Các lệnh cơ bản

### 1. Tạo migration mới
Sử dụng lệnh sau để tạo một file migration mới:
```bash
node ace make:migration <ten_migration>
```
*Ví dụ:*
```bash
node ace make:migration create_users_table
```
File mới sẽ được tạo trong thư mục `database/migrations/` với tiền tố là timestamp hiện tại.

### 2. Thực hiện migration (Chạy cập nhật DB)
Để áp dụng các file migration mới nhất lên database phát triển (`suar`):
```bash
node ace migration:run
```

Để áp dụng các migration lên database test (`suar_test`) trước khi chạy test tích hợp:
```bash
pnpm run db:test:migrate
```

### 3. Kiểm tra trạng thái migration
Kiểm tra xem file nào đã được chạy và trạng thái của DB:
```bash
node ace migration:status
```
*(Các file đã bị xóa khỏi đĩa nhưng đã được áp dụng trước đó sẽ hiển thị trạng thái `corrupt` / `missing on filesystem` - đây là hành vi bình thường).*

### 4. Rollback (Hạ cấp / Quay lui)
Quay lui lượt chạy migration gần nhất (chỉ áp dụng được đối với các tệp migration còn nằm trên filesystem):
```bash
node ace migration:rollback
```

## Sử dụng File Mẫu
Bạn có thể tham khảo tệp [00000000000000_template_migration.ts.example](./00000000000000_template_migration.ts.example) để xem cách cấu trúc các hàm `up()` và `down()` cho việc tạo bảng, thay đổi bảng, hoặc chạy raw query trong PostgreSQL.
