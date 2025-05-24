# Báo cáo chi tiết về Password trong hệ thống ShadcnAdmin

## 1. Vị trí và vai trò của password trong hệ thống

- **Model:**
  - Trường `password` tồn tại trong model `User` (`app/models/user.ts`).
  - Trường này dùng cho xác thực đăng nhập bằng email/mật khẩu.
  - Có các phương thức validate, hash password khi tạo/sửa user.
- **Database:**
  - Trường `password` trong bảng `users`.
  - Có thể có các migration tạo trường này.
  - Có bảng `password_reset_tokens` dùng cho chức năng quên mật khẩu.
- **Luồng xử lý:**
  - Khi đăng ký, mật khẩu được validate và hash trước khi lưu.
  - Khi đăng nhập, mật khẩu được so sánh với hash trong DB.
  - Khi quên mật khẩu, hệ thống tạo token, gửi email, cho phép đặt lại mật khẩu mới.

## 2. Các file liên quan đến password

### Backend (BE)
- `app/models/user.ts`: Khai báo trường password, validate, hash.
- `app/models/password_reset_token.ts`: Model cho token reset password.
- `app/controllers/auth/login_controller.ts`: Xác thực password khi login.
- `app/controllers/auth/register_controller.ts`: Validate và lưu password khi đăng ký.
- `app/controllers/auth/forgot_password_controller.ts`, `reset_password_controller.ts`: Xử lý quên mật khẩu, đặt lại mật khẩu.
- `app/actions/auth/commands/register_user_command.ts`, `reset_password_command.ts`, `request_password_reset_command.ts`: Command xử lý logic liên quan password.
- `app/actions/auth/dtos/register_user_dto.ts`, `reset_password_dto.ts`, `request_password_reset_dto.ts`: DTO validate dữ liệu password.

### Frontend (FE)
- `inertia/pages/auth/register.tsx`: Form nhập password khi đăng ký.
- `inertia/pages/auth/login.tsx`: Form nhập password khi đăng nhập.
- `inertia/pages/auth/forgot_password.tsx`, `reset_password.tsx`: Form nhập password mới khi reset.

### Database (DB)
- Trường `password` trong bảng `users`.
- Bảng `password_reset_tokens` lưu token reset password.
- Migration tạo/sửa các trường này.

## 3. Quy trình bảo mật password

- Password luôn được hash trước khi lưu vào DB (không lưu plain text).
- Khi reset password, token xác thực được gửi qua email, chỉ cho phép đặt lại mật khẩu khi token hợp lệ.
- Password phải đáp ứng các tiêu chí độ mạnh (validate ở cả BE và FE).

## 4. Ảnh hưởng khi loại bỏ password

- Nếu loại bỏ xác thực email/mật khẩu:
  - Có thể xóa trường password trong model, migration, DB.
  - Xóa toàn bộ logic validate, hash, so sánh password ở BE.
  - Xóa các form nhập password ở FE.
  - Xóa bảng `password_reset_tokens` nếu không còn dùng.

## 5. Đề xuất

- Nếu chỉ dùng OAuth, nên xóa hoàn toàn các thành phần liên quan password để tránh nhầm lẫn và tăng bảo mật.
- Nếu vẫn giữ xác thực email/mật khẩu, cần đảm bảo các quy trình hash, validate, reset password luôn an toàn.

---

Báo cáo này giúp bạn rà soát và kiểm soát toàn bộ các thành phần liên quan đến password trong hệ thống.
