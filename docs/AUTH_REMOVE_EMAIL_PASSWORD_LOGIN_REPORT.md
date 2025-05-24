# BÁO CÁO PHÂN TÍCH: LOẠI BỎ ĐĂNG NHẬP EMAIL/PASSWORD# Báo cáo rà soát và hướng dẫn loại bỏ xác thực email/mật khẩu, chỉ giữ lại đăng nhập bên thứ ba (OAuth)



**Ngày tạo:** 21/10/2025  ## 1. Tổng quan hệ thống authentication hiện tại

**Phạm vi:** Loại bỏ hoàn toàn hệ thống password và chỉ giữ lại OAuth authentication

- **Hỗ trợ đăng nhập bằng email & mật khẩu**: Đầy đủ backend (controller, command, DTO, model), frontend (form, trang), database (trường password, email).

---- **Hỗ trợ đăng nhập bên thứ ba (OAuth)**: Đầy đủ backend (controller, model UserOAuthProvider, trường auth_method), frontend (nút Google/GitHub), database (bảng user_oauth_providers).

- **Chức năng quên mật khẩu**: Đã cài đặt đầy đủ (controller, command, DTO, model PasswordResetToken, bảng password_reset_tokens).

## 1. PHÂN TÍCH HIỆN TRẠNG HỆ THỐNG

## 2. Kết luận chức năng hiện tại

### 1.1. Hệ Thống Authentication Hiện Tại

- Hệ thống cho phép đăng nhập bằng cả email/mật khẩu và bên thứ ba (Google, GitHub).

Hệ thống hiện tại hỗ trợ **3 phương thức đăng nhập**:- Chức năng quên mật khẩu đang hoạt động (có đầy đủ luồng, bảng token, giao diện FE).

1. ✅ **Email + Password** (sẽ loại bỏ)

2. ✅ **OAuth Google** (giữ lại)## 3. Hướng dẫn loại bỏ xác thực email/mật khẩu, chỉ giữ lại OAuth

3. ✅ **OAuth GitHub** (giữ lại)

### Backend (BE)

### 1.2. Cấu Trúc Database- Xóa/vô hiệu hóa các file:

  - `app/controllers/auth/register_controller.ts`

#### Users Table (migration: `3_create_users_table.ts`)  - `app/controllers/auth/forgot_password_controller.ts`

```sql  - `app/controllers/auth/reset_password_controller.ts`

- id  - `app/actions/auth/commands/register_user_command.ts`

- first_name  - `app/actions/auth/commands/request_password_reset_command.ts`

- last_name  - `app/actions/auth/commands/reset_password_command.ts`

- username  - `app/actions/auth/dtos/register_user_dto.ts`

- email  - `app/actions/auth/dtos/request_password_reset_dto.ts`

- password ← CẦN XÓA  - `app/actions/auth/dtos/reset_password_dto.ts`

- status_id- Xóa logic xác thực email/password trong `login_controller.ts` hoặc `auth_controller.ts` (chỉ giữ lại OAuth).

- role_id- Xóa các route liên quan trong `start/routes.ts`.

- current_organization_id

- auth_method (enum: 'email', 'google', 'github')### Frontend (FE)

- deleted_at- Xóa các trang:

- created_at  - `inertia/pages/auth/register.tsx`

- updated_at  - `inertia/pages/auth/forgot_password.tsx`

```  - `inertia/pages/auth/reset_password.tsx`

- Xóa form email/password, các link liên quan trong `inertia/pages/auth/login.tsx` (chỉ giữ lại nút đăng nhập Google/GitHub).

#### Password Reset Tokens Table (migration: `30_create_password_reset_tokens_table.ts`)

```sql### Database (DB)

- id- Có thể xóa bảng `password_reset_tokens` nếu không dùng nữa.

- user_id- Có thể cân nhắc xóa trường password trong bảng users nếu không còn xác thực email/password.

- token

- expires_at## 4. Lưu ý

- created_at- Đảm bảo không còn route, link, UI, API nào liên quan đến đăng ký, quên mật khẩu, đăng nhập bằng email/mật khẩu.

← TOÀN BỘ BẢNG SẼ BỊ XÓA- Kiểm tra lại UI/UX để chỉ còn nút đăng nhập bằng bên thứ ba.

```- Đảm bảo OAuth hoạt động ổn định.



#### User OAuth Providers Table---

```sql

- idNếu cần script tự động hoặc hướng dẫn chi tiết từng bước, vui lòng phản hồi.

- user_id
- provider (google, github, facebook, ...)
- provider_id
- email
- access_token
- refresh_token
- created_at
- updated_at
← GIỮ LẠI VÀ CẬP NHẬT LOGIC
```

### 1.3. Backend Files Cần Xử Lý

#### Controllers (app/controllers/auth/)
- ❌ `login_controller.ts` - Email/Password login
- ❌ `register_controller.ts` - Đăng ký mới
- ❌ `forgot_password_controller.ts` - Quên mật khẩu
- ❌ `reset_password_controller.ts` - Đặt lại mật khẩu
- ✅ `social_auth_controller.ts` - OAuth login (GIỮ LẠI)
- ✅ `logout_controller.ts` - Đăng xuất (GIỮ LẠI)

#### Actions (app/actions/auth/)
**Commands (sẽ xóa):**
- ❌ `register_user_command.ts`
- ❌ `authenticate_user_command.ts`
- ❌ `request_password_reset_command.ts`
- ❌ `reset_password_command.ts`
- ✅ `logout_user_command.ts` (GIỮ LẠI)

**DTOs (sẽ xóa):**
- ❌ `register_user_dto.ts`
- ❌ `authenticate_user_dto.ts`
- ❌ `request_password_reset_dto.ts`
- ❌ `reset_password_dto.ts`
- ✅ `logout_user_dto.ts` (GIỮ LẠI)

#### Validators (app/validators/auth/)
- ❌ `register.ts` - Validator cho đăng ký
- ❌ `password_reset.ts` - Validator cho reset password
- ❌ `index.ts` - Export validators (cập nhật)

#### Models (app/models/)
- 🔧 `user.ts` - XÓA password field, hash hooks, verifyPassword method
- ❌ `password_reset_token.ts` - XÓA TOÀN BỘ
- ✅ `user_oauth_provider.ts` - GIỮ LẠI

#### Routes (start/routes/auth.ts)
```typescript
// SẼ XÓA:
❌ GET  /login
❌ POST /login
❌ GET  /register
❌ POST /register
❌ GET  /forgot-password
❌ POST /forgot-password
❌ GET  /forgot-password/reset/:value
❌ POST /forgot-password/reset

// GIỮ LẠI:
✅ GET  /auth/:provider/redirect
✅ GET  /auth/:provider/callback
✅ POST /logout
✅ GET  /logout
```

### 1.4. Frontend Files Cần Xử Lý

#### Pages (inertia/pages/auth/)
- ❌ `register.tsx` - Trang đăng ký (XÓA HOÀN TOÀN)
- ❌ `forgot_password.tsx` - Quên mật khẩu (XÓA HOÀN TOÀN)
- ❌ `reset_password.tsx` - Đặt lại mật khẩu (XÓA HOÀN TOÀN)
- 🔧 `login.tsx` - CẬP NHẬT: Chỉ hiển thị OAuth buttons

### 1.5. Configuration Files
- 🔧 `config/auth.ts` - Có thể giữ lại config nhưng không sử dụng password guard
- 🔧 `config/hash.ts` - Có thể giữ lại nhưng không import trong code
- 🔧 `app/middleware/auth.ts` - Kiểm tra và đảm bảo chỉ verify session

---

## 2. PHÂN TÍCH LOGIC OAUTH HIỆN TẠI

### 2.1. Flow OAuth Hiện Tại (social_auth_controller.ts)

**✅ ĐIỂM MẠNH:**
```typescript
// Logic ĐÃ CÓ SẴN để link nhiều provider vào 1 user:
1. Tìm user theo email: User.findBy('email', socialUser.email)
2. Nếu user tồn tại → Link provider mới vào user đó
3. Nếu user chưa tồn tại → Tạo user mới
```

**📋 FLOW CHI TIẾT:**
```typescript
// Step 1: Tìm OAuth provider record
oauthProvider = await UserOAuthProvider
  .where('provider', provider)
  .where('provider_id', socialUser.id)
  .first()

// Step 2: Nếu có OAuth record → Login user
if (oauthProvider) {
  user = await User.find(oauthProvider.user_id)
  await auth.use('web').login(user)
  return redirect('/tasks')
}

// Step 3: Tìm user theo email (QUAN TRỌNG!)
user = await User.findBy('email', socialUser.email)

// Step 4a: User tồn tại → Link provider mới
if (user) {
  await UserOAuthProvider.create({
    user_id: user.id,
    provider: provider,
    provider_id: socialUser.id,
    email: socialUser.email,
    access_token: socialUser.token.token,
    refresh_token: socialUser.token.refreshToken,
  })
  await auth.use('web').login(user)
  return redirect('/tasks')
}

// Step 4b: User chưa tồn tại → Tạo mới
user = await User.create({
  email: socialUser.email,
  // ... các fields khác
  password: Math.random().toString(36) // ← SẼ XÓA
})
```

### 2.2. Kết Luận Logic OAuth

✅ **HỆ THỐNG ĐÃ CÓ LOGIC LIÊN KẾT OAUTH THEO EMAIL**

**Điểm mạnh của logic hiện tại:**
- Email từ OAuth providers (Google, GitHub) được dùng làm **UNIQUE IDENTIFIER**
- Không cần user nhập email thủ công, OAuth provider tự động cung cấp
- Một user có thể link nhiều OAuth providers nếu **cùng email**

**Ví dụ cụ thể:**

1. **Lần đăng nhập đầu tiên:**
   - User click "Login with Google"
   - Google trả về: `email = "user@example.com"`, `name = "John Doe"`
   - Hệ thống tạo user mới trong bảng `users` với `email = "user@example.com"` (KHÔNG CÓ PASSWORD)
   - Tạo record trong `user_oauth_providers`: `{user_id: 1, provider: 'google', email: 'user@example.com'}`

2. **Lần đăng nhập thứ 2 (cùng email, khác provider):**
   - User click "Login with GitHub"
   - GitHub trả về: `email = "user@example.com"`, `name = "John Doe"`
   - Hệ thống tìm user theo email → Tìm thấy user ID = 1
   - **KHÔNG tạo user mới**, chỉ link provider mới: `{user_id: 1, provider: 'github', email: 'user@example.com'}`

3. **Kết quả:**
   - User có thể login bằng cả Google hoặc GitHub
   - Cả 2 provider đều trỏ về cùng 1 user (user_id = 1)

**Bảng `users`:**
```
id | email             | password | first_name | last_name
---|-------------------|----------|------------|----------
1  | user@example.com  | NULL     | John       | Doe
```

**Bảng `user_oauth_providers`:**
```
id | user_id | provider | provider_id       | email
---|---------|----------|-------------------|------------------
1  | 1       | google   | 123456789         | user@example.com
2  | 1       | github   | github_user_123   | user@example.com
```

### 2.3. Email Vẫn Là Trường Quan Trọng

⚠️ **LƯU Ý QUAN TRỌNG:**
- Email **KHÔNG BỊ XÓA** khỏi bảng `users`
- Email **VẪN LÀ UNIQUE KEY** trong database
- Email từ OAuth providers **TỰ ĐỘNG ĐƯỢC LƯU** vào bảng `users`
- Email là **CƠ SỞ ĐỂ LIÊN KẾT** nhiều OAuth providers vào 1 user

**Chỉ loại bỏ:**
- ❌ Form nhập tay email + password
- ❌ Cột `password` trong database
- ❌ Logic hash/verify password
- ❌ Tính năng forgot password / reset password

---

## 3. KẾ HOẠCH TRIỂN KHAI CHI TIẾT

### 3.1. Phase 1: Phân Tích & Chuẩn Bị (TODO #1-3)
- [x] Phân tích toàn bộ hệ thống auth
- [x] Kiểm tra logic OAuth linking
- [x] Tạo tài liệu phân tích (file này)

### 3.2. Phase 2: Backend - Routes & Controllers (TODO #4-5)

#### 3.2.1. Xóa Routes (start/routes/auth.ts)
```typescript
// XÓA các routes sau:
router.get('/login', [LoginController, 'show'])
router.post('/login', [LoginController, 'store'])
router.get('/register', [RegisterController, 'show'])
router.post('/register', [RegisterController, 'store'])
router.group(() => {
  router.get('/', [ForgotPasswordController, 'index'])
  router.post('/', [ForgotPasswordController, 'send'])
  router.get('/reset/:value', [ForgotPasswordController, 'reset'])
  router.post('/reset', [ForgotPasswordController, 'update'])
}).prefix('/forgot-password')

// GIỮ LẠI:
router.get('/auth/:provider/redirect', [SocialAuthController, 'redirect'])
router.get('/auth/:provider/callback', [SocialAuthController, 'callback'])
router.post('/logout', [LogoutController, 'handle'])
router.get('/logout', [LogoutController, 'handle'])
```

#### 3.2.2. Xóa Controllers
```bash
# Xóa các file:
app/controllers/auth/login_controller.ts
app/controllers/auth/register_controller.ts
app/controllers/auth/forgot_password_controller.ts
app/controllers/auth/reset_password_controller.ts
```

### 3.3. Phase 3: Backend - Actions & DTOs (TODO #6)

#### 3.3.1. Xóa Commands
```bash
# Xóa các file:
app/actions/auth/commands/register_user_command.ts
app/actions/auth/commands/authenticate_user_command.ts
app/actions/auth/commands/request_password_reset_command.ts
app/actions/auth/commands/reset_password_command.ts
```

#### 3.3.2. Xóa DTOs
```bash
# Xóa các file:
app/actions/auth/dtos/register_user_dto.ts
app/actions/auth/dtos/authenticate_user_dto.ts
app/actions/auth/dtos/request_password_reset_dto.ts
app/actions/auth/dtos/reset_password_dto.ts
```

#### 3.3.3. Cập nhật Index
```typescript
// app/actions/auth/dtos/index.ts
// Chỉ export:
export { default as LogoutUserDTO } from './logout_user_dto.js'
```

### 3.4. Phase 4: Backend - Validators (TODO #7)

```bash
# Xóa các file:
app/validators/auth/register.ts
app/validators/auth/password_reset.ts

# Cập nhật:
app/validators/auth/index.ts (nếu cần)
```

### 3.5. Phase 5: Backend - Models (TODO #8)

#### 3.5.1. Cập nhật User Model (app/models/user.ts)

**XÓA:**
```typescript
// XÓA import hash
import hash from '@adonisjs/core/services/hash'

// XÓA withAuthFinder mixin
const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email', 'username'],
  passwordColumnName: 'password',
})
export default class User extends compose(BaseModel, AuthFinder)

// XÓA password column
@column({ serializeAs: null })
declare password: string

// XÓA relationship với PasswordResetToken
@hasMany(() => PasswordResetToken, {
  foreignKey: 'user_id',
})
declare passwordResetTokens: HasMany<typeof PasswordResetToken>
```

**THAY BẰNG:**
```typescript
// Chỉ extend BaseModel
export default class User extends BaseModel {
  // Không có password column
  // Không có passwordResetTokens relationship
}
```

#### 3.5.2. Xóa Model (app/models/password_reset_token.ts)
```bash
# Xóa toàn bộ file
rm app/models/password_reset_token.ts
```

### 3.6. Phase 6: Database Migration (TODO #9)

#### 3.6.1. Tạo Migration Mới
```bash
node ace make:migration remove_password_fields_from_users
```

#### 3.6.2. Nội dung Migration
```typescript
// database/migrations/XXX_remove_password_fields_from_users.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('password')
    })
    
    // Xóa bảng password_reset_tokens
    this.schema.dropTableIfExists('password_reset_tokens')
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('password', 255).nullable()
    })
    
    // Khôi phục bảng password_reset_tokens
    this.schema.createTable('password_reset_tokens', (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable()
      table.string('token', 255).notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
    })
  }
}
```

### 3.7. Phase 7: OAuth Logic Update (TODO #10-11)

#### 3.7.1. Cập nhật social_auth_controller.ts

**THAY ĐỔI CẦN THIẾT:**

1. **Xóa random password khi tạo user:**
```typescript
// TRƯỚC (dòng 223):
const userData = {
  email: socialUser.email,
  // ...
  password: Math.random().toString(36).substring(2, 15), // ← XÓA
}

// SAU:
const userData = {
  email: socialUser.email,
  // ... (không có password)
}
```

2. **Auto approve user mới (không cần chờ admin duyệt):**
```typescript
// Đảm bảo status = 'active' ngay khi tạo
const defaultStatusId = await db
  .from('user_status')
  .where('name', 'active') // ← Đảm bảo là 'active'
  .select('id')
  .first()
```

3. **Logic liên kết OAuth đã OK, GIỮ NGUYÊN:**
```typescript
// Logic này ĐÃ ĐÚNG, không cần sửa:
let user = await User.findBy('email', socialUser.email)
if (user) {
  // Link provider mới vào user cũ
  await UserOAuthProvider.create({
    user_id: user.id,
    provider: provider,
    // ...
  })
}
```

### 3.8. Phase 8: Frontend Update (TODO #12-13)

#### 3.8.1. Xóa Pages
```bash
# Xóa các file:
inertia/pages/auth/register.tsx
inertia/pages/auth/forgot_password.tsx
inertia/pages/auth/reset_password.tsx
```

#### 3.8.2. Cập nhật Login Page (inertia/pages/auth/login.tsx)

**TRƯỚC:**
```tsx
<form> {/* Email/Password form */} </form>
<div> {/* OAuth buttons */} </div>
```

**SAU:**
```tsx
{/* CHỈ hiển thị OAuth buttons */}
<div className="space-y-4">
  <h1>Đăng nhập vào ShadcnAdmin</h1>
  <p>Chọn phương thức đăng nhập:</p>
  
  <Button 
    onClick={() => window.location.href = '/auth/google/redirect'}
    className="w-full"
  >
    <GoogleIcon /> Đăng nhập với Google
  </Button>
  
  <Button 
    onClick={() => window.location.href = '/auth/github/redirect'}
    className="w-full"
  >
    <GithubIcon /> Đăng nhập với GitHub
  </Button>
</div>
```

### 3.9. Phase 9: Config & Middleware (TODO #14-15)

#### 3.9.1. Config Files
```typescript
// config/auth.ts
// Có thể GIỮ LẠI cấu hình, nhưng chỉ sử dụng session guard
// KHÔNG sử dụng password hashing

// config/hash.ts
// Có thể GIỮ LẠI file nhưng không import trong code
```

#### 3.9.2. Middleware
```typescript
// app/middleware/auth.ts
// Kiểm tra: CHỈ verify session-based authentication
// KHÔNG có logic kiểm tra password
```

### 3.10. Phase 10: Seeders & Test Data (TODO #16)

```typescript
// database/seeders/user_seeder.ts
// XÓA: password fields
// THÊM: OAuth provider records cho test users

await User.create({
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  username: 'admin',
  // KHÔNG CÓ password
  status_id: activeStatus.id,
  role_id: adminRole.id,
  auth_method: 'google',
})

// Tạo OAuth provider record cho test user
await UserOAuthProvider.create({
  user_id: user.id,
  provider: 'google',
  provider_id: 'google_test_123',
  email: 'admin@example.com',
})
```

---

## 4. RỦI RO & CÁCH XỬ LÝ

### 4.1. Rủi Ro Kỹ Thuật

| Rủi Ro | Mức Độ | Giải Pháp |
|--------|--------|-----------|
| **User hiện tại chỉ có password không có OAuth** | 🔴 CAO | Migration script: Tạo OAuth provider record giả hoặc yêu cầu user link OAuth |
| **Session hiện tại của user sẽ bị logout** | 🟡 TRUNG BÌNH | Thông báo trước cho users về maintenance |
| **Không thể khôi phục password cũ** | 🟢 THẤP | Backup database trước khi migration |
| **Dependency với RememberMeTokens** | 🟡 TRUNG BÌNH | Kiểm tra RememberMeTokens provider có sử dụng password không |

### 4.2. Giải Pháp Xử Lý User Hiện Tại

#### Option 1: Migration Script - Force OAuth Linking
```typescript
// database/seeders/migrate_existing_users_to_oauth.ts
import User from '#models/user'
import UserOAuthProvider from '#models/user_oauth_provider'

export default class MigrateExistingUsersToOAuthSeeder {
  async run() {
    // Tìm tất cả users chưa có OAuth provider
    const users = await User.query()
      .whereDoesntHave('oauth_providers')
      .exec()

    for (const user of users) {
      // Tạo OAuth provider giả (yêu cầu user phải link lại)
      await UserOAuthProvider.create({
        user_id: user.id,
        provider: 'pending', // Đánh dấu cần link
        provider_id: `pending_${user.id}`,
        email: user.email,
        access_token: null,
        refresh_token: null,
      })
      
      console.log(`Migrated user ${user.email} - needs OAuth linking`)
    }
  }
}
```

#### Option 2: Yêu Cầu User Link OAuth
```typescript
// Thêm middleware kiểm tra:
if (user.oauth_providers.length === 0) {
  return response.redirect('/setup-oauth')
}
```

### 4.3. Backup & Rollback Plan

```bash
# 1. Backup database trước khi migration
mysqldump -u user -p shadcn_admin > backup_before_remove_password.sql

# 2. Nếu cần rollback:
mysql -u user -p shadcn_admin < backup_before_remove_password.sql
node ace migration:rollback --batch=1
```

---

## 5. TESTING PLAN (TODO #17)

### 5.1. Test Cases

#### Test Case 1: Đăng nhập lần đầu với Google
```
GIVEN: User chưa tồn tại trong hệ thống
WHEN: User click "Login with Google" và authorize
THEN:
  ✓ User mới được tạo với status = 'active'
  ✓ OAuth provider record được tạo (provider = 'google')
  ✓ User được redirect đến /organizations (tạo org mới)
  ✓ Session được tạo thành công
```

#### Test Case 2: Đăng nhập lần 2 với GitHub (cùng email)
```
GIVEN: User đã tồn tại (đã đăng nhập lần đầu bằng Google)
WHEN: User click "Login with GitHub" với cùng email
THEN:
  ✓ KHÔNG tạo user mới
  ✓ OAuth provider record mới được tạo (provider = 'github')
  ✓ user_id của GitHub provider === user_id của Google provider
  ✓ User được redirect đến /tasks
```

#### Test Case 3: Đăng nhập lần 3 với Google
```
GIVEN: User đã có Google OAuth linked
WHEN: User click "Login with Google" lần nữa
THEN:
  ✓ Tìm thấy OAuth provider record cũ
  ✓ Cập nhật access_token và refresh_token
  ✓ Đăng nhập thành công
  ✓ User được redirect đến /tasks
```

#### Test Case 4: Kiểm tra user có thể switch giữa các provider
```
GIVEN: User có cả Google và GitHub linked
WHEN: User logout và login lại bằng bất kỳ provider nào
THEN:
  ✓ Login thành công với cả 2 providers
  ✓ Cùng user_id, cùng session
```

#### Test Case 5: Không thể truy cập routes cũ
```
GIVEN: Hệ thống đã xóa email/password login
WHEN: User cố gắng truy cập /login (POST) hoặc /register
THEN:
  ✓ Route không tồn tại (404)
  ✓ Hoặc redirect về trang login OAuth
```

### 5.2. Database Validation

```sql
-- Kiểm tra user không có password
SELECT id, email, password FROM users LIMIT 10;
-- Expected: password column = NULL hoặc không tồn tại

-- Kiểm tra user có nhiều OAuth providers
SELECT 
  u.id, 
  u.email, 
  GROUP_CONCAT(uop.provider) as providers
FROM users u
LEFT JOIN user_oauth_providers uop ON u.id = uop.user_id
GROUP BY u.id
HAVING COUNT(uop.id) > 1;
-- Expected: Có users với nhiều providers (google,github)

-- Kiểm tra bảng password_reset_tokens đã bị xóa
SHOW TABLES LIKE 'password_reset_tokens';
-- Expected: Empty set
```

---

## 6. TIMELINE DỰ KIẾN

| Phase | Thời gian | Mô tả |
|-------|-----------|-------|
| Phase 1 | ✅ Hoàn thành | Phân tích & tài liệu |
| Phase 2-3 | 1-2 giờ | Xóa routes, controllers, actions |
| Phase 4-5 | 30 phút | Xóa validators, cập nhật models |
| Phase 6 | 30 phút | Tạo migration |
| Phase 7 | 1 giờ | Cập nhật OAuth logic |
| Phase 8 | 1 giờ | Cập nhật frontend |
| Phase 9-10 | 30 phút | Config, middleware, seeders |
| **Testing** | 2 giờ | Test toàn bộ flow |
| **Tổng cộng** | **~7 giờ** | Kể cả testing và debug |

---

## 7. CHECKLIST TRIỂN KHAI

### 7.1. Pre-deployment
- [ ] Backup database
- [ ] Review toàn bộ code changes
- [ ] Test trên local environment
- [ ] Thông báo users về maintenance

### 7.2. Deployment
- [ ] Run migration: `node ace migration:run`
- [ ] Deploy backend code
- [ ] Deploy frontend code
- [ ] Clear cache: `node ace cache:clear`
- [ ] Restart server

### 7.3. Post-deployment
- [ ] Verify OAuth login works (Google)
- [ ] Verify OAuth login works (GitHub)
- [ ] Verify email linking works
- [ ] Check database: no password column
- [ ] Check logs: no errors
- [ ] Monitor user login rate

### 7.4. Rollback Plan (nếu cần)
- [ ] Restore database backup
- [ ] Rollback migration: `node ace migration:rollback`
- [ ] Deploy previous code version
- [ ] Restart server

---

## 8. TÀI LIỆU THAM KHẢO

### 8.1. Files Liên Quan
- `app/controllers/auth/social_auth_controller.ts` - OAuth logic
- `app/models/user.ts` - User model
- `app/models/user_oauth_provider.ts` - OAuth provider model
- `start/routes/auth.ts` - Auth routes
- `inertia/pages/auth/login.tsx` - Login page

### 8.2. Migration Files
- `database/migrations/3_create_users_table.ts` - Users table
- `database/migrations/30_create_password_reset_tokens_table.ts` - Password reset

### 8.3. Config Files
- `config/auth.ts` - Auth configuration
- `config/hash.ts` - Password hashing
- `config/ally.ts` - OAuth providers

---

## 9. KẾT LUẬN

### 9.1. Lợi Ích
✅ **Đơn giản hóa authentication** - Chỉ 1 flow duy nhất (OAuth)  
✅ **Bảo mật cao hơn** - Không lưu password, không lo hash/salt  
✅ **UX tốt hơn** - Không cần nhớ password, chỉ cần click 1 nút  
✅ **Giảm code maintenance** - Loại bỏ ~30% code liên quan auth  
✅ **Logic linking email đã có sẵn** - Không cần implement mới  
✅ **Email vẫn được giữ lại** - OAuth providers tự động cung cấp email  
✅ **Liên kết nhiều providers** - 1 user có thể login bằng nhiều cách (Google, GitHub, ...)  

### 9.2. Rủi Ro Đã Được Giải Quyết
✅ **Logic OAuth linking** - Đã có sẵn trong code  
✅ **User migration** - Có plan xử lý users hiện tại  
✅ **Rollback** - Có backup và migration rollback  
✅ **Testing** - Có test cases chi tiết  

### 9.3. Khuyến Nghị
1. **Thực hiện trong giờ thấp điểm** để ít ảnh hưởng users
2. **Thông báo trước 24-48h** về maintenance
3. **Monitor logs** sau khi deploy để catch errors sớm
4. **Giữ backup database** ít nhất 7 ngày

---

**Next Steps:**  
Sau khi review tài liệu này, tiến hành triển khai theo từng Phase trong TODO list.
