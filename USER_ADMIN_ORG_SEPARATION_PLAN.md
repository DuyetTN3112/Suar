# SUAR Platform — User / Admin / Organization Separation Plan

**Generated:** 2026-03-22  
**Author:** AI Assistant  
**Purpose:** Kế hoạch refactor hệ thống để phân tách rõ ràng giữa User, Admin, và Organization

---

## 📋 Tóm tắt Executive Summary

Hệ thống SUAR hiện tại đang có **thiếu sót nghiêm trọng về phân tách vai trò**: User bình thường, System Admin, và Organization đang bị trộn lẫn trong cùng một giao diện và logic. Điều này gây ra:

- **Confusion về phân quyền**: User thường thấy menu/tính năng không phù hợp với vai trò
- **Security risk**: Không có ranh giới rõ ràng cho admin interface
- **Scalability issue**: Khó mở rộng tính năng quản trị hệ thống và quản trị tổ chức
- **UX degradation**: Giao diện lộn xộn, không tối ưu cho từng nhóm người dùng

Kế hoạch này đề xuất **kiến trúc 3-namespace interface** với base structure rõ ràng:
1. **User Interface** - Người dùng cá nhân (`registered_user`)
2. **System Admin Interface** - Quản trị hệ thống (`system_admin`, `superadmin`)
3. **Organization Interface** - Quản trị tổ chức (`org_owner`, `org_admin`)

**Lưu ý phân biệt:**
- **System Superadmin/Admin** ≠ **Organization Owner/Admin**
- System Admin quản lý toàn hệ thống, không cần thuộc org
- Org Owner/Admin chỉ quản lý tổ chức của mình

---

## 🔍 Phân tích Hiện trạng

### 1. Database Schema (PostgreSQL v3)

**Điểm mạnh:**
- ✅ Database đã có phân quyền 3 tầng rõ ràng:
  - **System level:** `users.system_role` (`superadmin`, `system_admin`, `registered_user`)
  - **Organization level:** `organization_users.org_role` (`org_owner`, `org_admin`, `org_member`)
  - **Project level:** `project_members.project_role` (`project_owner`, `project_manager`, `project_member`, `project_viewer`)

- ✅ Có field `users.is_freelancer` để phân biệt freelancer
- ✅ Có `users.current_organization_id` để track org context
- ✅ Có `organizations.plan` để phân biệt loại tổ chức

**Điểm yếu:**
- ❌ Không có cách phân biệt **Organization Account** (tổ chức đăng nhập như một thực thể) vs **User Account** (cá nhân)
- ❌ Không có flag/type để đánh dấu organization là "corporate entity" hay "personal workspace"
- ❌ Thiếu metadata để phân biệt user type (individual, org representative, admin)

### 2. Backend Architecture (Clean Architecture + DDD + CQRS)

**Cấu trúc hiện tại:**

```
app/
├── actions/          ← Application Layer (Commands/Queries)
│   ├── auth/
│   ├── organizations/
│   ├── projects/
│   ├── tasks/
│   ├── users/
│   └── reviews/
├── domain/           ← Domain Layer (Entities, Rules, Interfaces)
│   ├── organizations/
│   ├── projects/
│   ├── tasks/
│   ├── users/
│   └── reviews/
├── infra/            ← Infrastructure Layer (Repositories, ORM)
│   ├── organizations/
│   ├── projects/
│   ├── tasks/
│   ├── users/
│   └── reviews/
├── controllers/      ← HTTP Adapters (Thin)
│   ├── auth/
│   ├── organizations/
│   ├── projects/
│   ├── tasks/
│   ├── users/
│   └── reviews/
├── middleware/
│   ├── auth_middleware.ts
│   ├── authorize_role.ts         ← Kiểm tra system_role
│   ├── organization_resolver_middleware.ts
│   └── require_organization_middleware.ts
├── models/           ← Lucid ORM Models
└── constants/
    ├── permissions.ts            ← Hardcoded permissions
    ├── user_constants.ts
    └── organization_constants.ts
```

**Phân tích:**

✅ **Điểm tốt:**
- Clean Architecture đã được implement đúng chuẩn
- Phân quyền đã được define rõ ràng trong constants
- Middleware `authorize_role` đã support system admin check
- CQRS pattern đã tách biệt read/write operations

❌ **Vấn đề:**
- **Không có namespace riêng cho admin**: Tất cả controllers đang ở chung root level
- **Route không phân tách**: `/users`, `/organizations` dùng chung cho cả user và admin
- **Middleware không phân context**: `authorize_role` chỉ check role, không switch context
- **Controllers không phân loại**: Không có `admin/` hoặc `system/` namespace

### 3. Frontend Structure (Svelte 5 + Inertia.js)

**Cấu trúc hiện tại:**

```
inertia/
├── pages/
│   ├── auth/
│   ├── organizations/
│   ├── projects/
│   ├── tasks/
│   ├── users/              ← Hiện tại dùng chung cho cả admin và user
│   ├── marketplace/
│   ├── profile/
│   ├── reviews/
│   ├── settings/
│   └── notifications/
├── components/
│   ├── layout/
│   │   ├── app_sidebar.svelte
│   │   ├── nav_bar.svelte
│   │   ├── team_switcher.svelte
│   │   └── nav_user.svelte
│   └── navigation.svelte.ts  ← Navigation config
└── lib/
```

**Navigation hiện tại (navigation.svelte.ts):**

```typescript
const navigationData = [
  {
    title: 'Tổng quan',
    items: [
      { title: 'Tasks', url: '/tasks' },
      { title: 'Marketplace', url: '/marketplace/tasks' },
      { title: 'Người dùng', url: '/users' },  // ← Không phân quyền
    ],
  },
  {
    title: 'Tổ chức',
    items: [
      { title: 'Tổ chức', url: '/organizations' },
      { title: 'Dự án', url: '/projects' },
    ],
  },
  // ...
]
```

**Phân tích:**

❌ **Vấn đề nghiêm trọng:**
- **Navigation không phân quyền**: Menu hiện tất cả cho mọi user
- **Không có admin layout riêng**: Đang dùng chung layout cho admin và user
- **Team switcher không phân biệt role**: Không có indicator cho admin context
- **"/users" route**: Hiện cho cả user thường (theo ISSUES.md - cần ẩn)

✅ **Điểm tốt:**
- Layout component đã modular
- Có team_switcher để switch organization
- Inertia.js support multi-layout

### 4. Routes (AdonisJS 7)

**Routes hiện tại:**

```
start/routes/
├── auth.ts           ← OAuth login/logout
├── index.ts          ← Dashboard
├── users.ts          ← User management (KHÔNG PHÂN QUYỀN)
├── organizations.ts
├── projects.ts
├── tasks.ts
├── reviews.ts
├── settings.ts
├── notifications.ts
└── api.ts            ← API routes (có check admin cho /redis)
```

**Phân tích users.ts:**

```typescript
router
  .group(() => {
    router.get('/users', [ListUsersController, 'handle'])           // ← Tất cả user thấy
    router.get('/users/create', [CreateUserController, 'handle'])   // ← Không check permission
    router.put('/users/:id/approve', [ApproveUserController])       // ← Admin action nhưng không guard
    router.put('/users/:id/role', [UpdateUserRoleController])       // ← Admin action nhưng không guard
  })
  .use([middleware.auth(), middleware.requireOrg()])               // ← CHỈ check login, không check admin
```

❌ **Vấn đề:**
- **Không có route prefix `/admin`**: Tất cả route đang ở root level
- **Không apply authorize_role middleware**: Admin actions không được protect
- **Mixed concerns**: User profile và admin user management ở chung route group

---

## 🎯 Định nghĩa lại 3 nhóm người dùng

### 1. **User (Người dùng bình thường)**

**Định nghĩa:**
- Tài khoản cá nhân đăng ký qua OAuth (Google/GitHub)
- `system_role = 'registered_user'`
- Có thể là freelancer (`is_freelancer = true`) hoặc nhân viên trong org
- Thuộc một hoặc nhiều organization với `org_role = 'org_member'`

**Quyền hạn:**
- Xem và làm task được giao
- Ứng tuyển công việc trên Marketplace
- Quản lý hồ sơ cá nhân (profile, skills, spider chart)
- Tham gia review 360°

**Giao diện:**
- Sidebar: Tasks, Marketplace, Profile, Reviews, Settings
- Dashboard: My tasks, Pending reviews, Applications
- Không thấy: User management, Organization settings (trừ khi là org_admin)

---

### 2. **Admin (Quản trị hệ thống)**

**Định nghĩa:**
- Tài khoản quản trị toàn hệ thống
- `system_role = 'system_admin'` hoặc `'superadmin'`
- Không thuộc organization cụ thể (hoặc có org riêng cho admin team)
- Có quyền xem và quản lý toàn bộ dữ liệu hệ thống

**Phân cấp:**
- **Superadmin**: Toàn quyền, bỏ qua mọi kiểm tra (wildcard `*` permission)
- **System Admin**: Quyền quản lý hạn chế theo `SYSTEM_ROLE_PERMISSIONS`

**Quyền hạn (theo permissions.ts):**
- `can_manage_users`: CRUD users, approve, suspend, change role
- `can_view_all_organizations`: Xem tất cả org, không cần membership
- `can_view_system_logs`: Audit logs, user activity logs
- `can_view_reports`: Analytics, statistics
- `can_manage_system_settings`: Config hệ thống

**Giao diện đề xuất (Admin Portal):**

```
/admin/
├── dashboard           ← System overview, stats
├── users               ← User management
│   ├── list            ← All users (filter by role, status, org)
│   ├── pending         ← Pending approval (nếu có manual approval)
│   ├── create          ← Manually create user
│   └── :id/edit        ← Edit user, assign role, suspend
├── organizations       ← Organization management
│   ├── list            ← All orgs
│   ├── create          ← Create org
│   └── :id             ← Org details, members, projects
├── subscriptions       ← User subscription management (Pro, Pro Max)
│   ├── list            ← Active subscriptions
│   └── plans           ← Manage subscription plans
├── qr-codes            ← QR Code payment management
│   ├── list            ← Payment QR codes
│   └── create          ← Generate QR for subscription payment
├── audit-logs          ← System audit logs
│   ├── user-activity   ← User login, actions
│   └── data-changes    ← CRUD operations
├── reviews             ← Review management
│   ├── flagged         ← Flagged reviews (fraud detection)
│   └── disputes        ← Disputed review sessions
├── reports             ← Analytics & Reports
│   ├── users           ← User growth, retention
│   ├── tasks           ← Task completion rate
│   └── reviews         ← Review quality, trust score distribution
└── settings            ← System settings
    ├── general         ← Site name, logo, contact
    ├── features        ← Feature flags
    └── integrations    ← OAuth, email, storage
```

**Module cần implement (Base Structure):**

| Module | Priority | Description |
|--------|----------|-------------|
| **Users** | P0 | CRUD users, role management, suspend/activate |
| **Roles & Permissions** | P1 | Assign system_role, view permissions |
| **Organizations** | P1 | View all orgs, create, edit, delete |
| **Subscription Plans** | P1 | Manage Pro/Pro Max plans, pricing |
| **QR Codes** | P2 | Generate QR for payment (VNPay/MoMo style) |
| **Audit Logs** | P1 | View system logs, filter by user/action/date |
| **Flagged Reviews** | P1 | Review fraud detection alerts |
| **Reports** | P2 | Dashboard charts, export CSV/Excel |

---

### 3. **Organization Admin (Quản trị tổ chức)**

**Định nghĩa:**
- User có vai trò quản lý **trong tổ chức**
- `org_role = 'org_owner'` hoặc `'org_admin'`
- `system_role` vẫn là `'registered_user'` (không phải system admin)
- Có quyền quản lý **chỉ trong tổ chức của mình**

**⚠️ PHÂN BIỆT RÕ RÀNG:**
```
Organization Owner/Admin (org_role)
  - Quản lý tổ chức CỦA MÌNH
  - Không thể xem tổ chức khác
  - Không thể quản lý system users
  
System Admin (system_role)
  - Quản lý TẤT CẢ tổ chức
  - Xem được tất cả users
  - Quản lý system settings
```

**Quyền hạn (Organization Level - theo ORG_ROLE_PERMISSIONS):**
- `can_manage_members`: Mời, xóa thành viên
- `can_create_project`: Tạo dự án mới
- `can_manage_settings`: Cài đặt tổ chức
- `can_view_audit_logs`: Audit logs của tổ chức
- `can_manage_billing`: Quản lý thanh toán (org owner only)
- `can_transfer_ownership`: Chuyển quyền sở hữu (org owner only)

**Giao diện (Organization Layout):**
- Sidebar:
  - Organization Dashboard
  - Members (mời, xóa, phân quyền)
  - Projects (tạo, quản lý)
  - Tasks (overview toàn org)
  - Settings (org settings)
  - Billing (nếu là owner)
- Dashboard:
  - Team performance charts
  - Multi-project overview
  - Pending approvals (join requests, invitations)
  - Organization analytics

**Điều kiện dùng Organization Layout:**
- `system_role = 'registered_user'` AND
- `org_role IN ('org_owner', 'org_admin')` AND
- User đang active trong org đó (`current_organization_id`)

---

### 🔄 Context Switching Logic (Chi tiết)

**Khi user chuyển đổi organization:**

```typescript
User A chuyển từ Org B → Org C
  ↓
1. Check org_role trong Org C
   ↓
   IF org_role = 'org_owner' OR 'org_admin'
     → Switch to Organization Layout
     → Load Organization Navigation
     → Dashboard: Organization Dashboard
   
   ELSE IF org_role = 'org_member'
     → Switch to User Layout
     → Load User Navigation
     → Dashboard: My Tasks

2. Update session:
   session.current_organization_id = Org C
   
3. Update database:
   UPDATE users SET current_organization_id = Org C WHERE id = User A
```

**Example scenarios:**

| User | Org A Role | Org B Role | Switched to | Layout |
|------|-----------|-----------|-------------|---------|
| Alice | org_owner | org_member | Org A | Organization Layout |
| Alice | org_owner | org_member | Org B | User Layout |
| Bob | org_admin | org_admin | Org A | Organization Layout |
| Bob | org_admin | org_admin | Org B | Organization Layout |
| Charlie | org_member | org_member | Any | User Layout |

**System Admin override:**
- `system_role = 'superadmin'` OR `'system_admin'`
- Có thể toggle "Admin Mode"
- Khi Admin Mode ON → System Admin Layout (bỏ qua org context)

---

## 🏗️ Kiến trúc đề xuất

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUAR Platform                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐    │
│  │   User UI   │  │  Admin UI   │  │  Organization UI     │    │
│  │  (Default)  │  │  (/admin)   │  │  (Context-based)     │    │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬───────────┘    │
│         │                │                     │                 │
│         └────────────────┼─────────────────────┘                 │
│                          │                                       │
│  ┌──────────────────────▼────────────────────────────┐          │
│  │         HTTP Layer (Controllers)                  │          │
│  │  - UserControllers   - AdminControllers           │          │
│  │  - Auth, Middleware, Routes                       │          │
│  └──────────────────────┬────────────────────────────┘          │
│                         │                                        │
│  ┌──────────────────────▼────────────────────────────┐          │
│  │      Application Layer (Commands/Queries)         │          │
│  │  - users/  - organizations/  - tasks/             │          │
│  │  - admin/  ← NEW: Admin-specific actions          │          │
│  └──────────────────────┬────────────────────────────┘          │
│                         │                                        │
│  ┌──────────────────────▼────────────────────────────┐          │
│  │         Domain Layer (Pure Logic)                 │          │
│  │  - User Entity  - Organization Entity             │          │
│  │  - Policies, Rules (unchanged)                    │          │
│  └──────────────────────┬────────────────────────────┘          │
│                         │                                        │
│  ┌──────────────────────▼────────────────────────────┐          │
│  │   Infrastructure Layer (Repositories)             │          │
│  │  - UserRepository  - OrganizationRepository       │          │
│  │  - ORM Mappers (unchanged)                        │          │
│  └──────────────────────┬────────────────────────────┘          │
│                         │                                        │
│  ┌──────────────────────▼────────────────────────────┐          │
│  │           Database (PostgreSQL + MongoDB)         │          │
│  │  - users (system_role, org_role, project_role)   │          │
│  │  - organizations, projects, tasks                 │          │
│  │  - audit_logs (MongoDB)                          │          │
│  └───────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Context Switching Mechanism (Chi tiết)

```
User Login
    ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Detect system_role                                 │
├─────────────────────────────────────────────────────────────┤
│  IF system_role IN ('superadmin', 'system_admin')           │
│    → Show "Admin Mode" toggle in header                     │
│    → User can manually enable admin mode                    │
│  ELSE                                                        │
│    → system_role = 'registered_user'                        │
│    → No admin mode available                                │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Determine Layout (Priority Order)                  │
├─────────────────────────────────────────────────────────────┤
│  1. IF session.is_admin_mode = true                         │
│     AND system_role IN ('superadmin', 'system_admin')       │
│       → Use System Admin Layout                             │
│       → Route prefix: /admin                                │
│       → Navigation: Admin Navigation                        │
│                                                              │
│  2. ELSE IF current_organization_id IS NOT NULL             │
│     AND org_role IN ('org_owner', 'org_admin')              │
│       → Use Organization Layout                             │
│       → Route prefix: /org                                  │
│       → Navigation: Organization Navigation                 │
│                                                              │
│  3. ELSE                                                     │
│       → Use User Layout (default)                           │
│       → Route prefix: / (root)                              │
│       → Navigation: User Navigation                         │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Organization Switching                             │
├─────────────────────────────────────────────────────────────┤
│  User clicks "Switch Organization" → Select Org C           │
│    ↓                                                         │
│  1. Update database:                                        │
│     UPDATE users SET current_organization_id = Org C        │
│                                                              │
│  2. Update session:                                         │
│     session.current_organization_id = Org C                 │
│                                                              │
│  3. Query org_role in Org C:                                │
│     SELECT org_role FROM organization_users                 │
│     WHERE user_id = current_user AND org_id = Org C         │
│                                                              │
│  4. Determine layout:                                       │
│     IF org_role IN ('org_owner', 'org_admin')               │
│       → Redirect to /org/dashboard                          │
│       → Use Organization Layout                             │
│     ELSE                                                     │
│       → Redirect to /tasks                                  │
│       → Use User Layout                                     │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│  Middleware Flow                                            │
├─────────────────────────────────────────────────────────────┤
│  1. AuthMiddleware → Ensure user logged in                  │
│  2. ContextResolverMiddleware → Determine layout            │
│  3. Route-specific middleware:                              │
│     - /admin/* → RequireSystemAdminMiddleware               │
│     - /org/* → RequireOrgAdminMiddleware                    │
│     - /* → RequireAuthMiddleware (only)                     │
└─────────────────────────────────────────────────────────────┘
```

**Example Flow:**

```
User: Alice (system_role = 'registered_user')
Organizations:
  - Org A: org_role = 'org_owner'
  - Org B: org_role = 'org_member'

Scenario 1: Login → Default to Org A (last used)
  → org_role = 'org_owner'
  → Use Organization Layout
  → Navigate to /org/dashboard

Scenario 2: Switch to Org B
  → org_role = 'org_member'
  → Use User Layout
  → Navigate to /tasks

Scenario 3: Switch back to Org A
  → org_role = 'org_owner'
  → Use Organization Layout
  → Navigate to /org/dashboard
```

```
User: Bob (system_role = 'system_admin')

Scenario 1: Login → Default mode (User/Org mode)
  → Has organizations → Use Org Layout or User Layout

Scenario 2: Toggle "Admin Mode" ON
  → session.is_admin_mode = true
  → Use System Admin Layout
  → Navigate to /admin/dashboard

Scenario 3: Toggle "Admin Mode" OFF
  → session.is_admin_mode = false
  → Back to Org Layout or User Layout
```

---

## 📊 Ảnh hưởng đến từng layer

### 1. Database Changes

#### ⚠️ QUAN TRỌNG: Quy trình cập nhật Database

**2 bước đồng bộ:**
1. **Cập nhật file schema docs** (source of truth):
   - Sửa file: `docs/database/suar_postgresql_v3.sql` (hoặc tương tự)
   - Thêm columns, tables, indexes mới
   - File này là **cấu trúc chuẩn** (không có data)

2. **Tạo migration scripts** (apply lên DB production):
   - Tạo file: `database/migrations/YYYY_MM_DD_HHMMSS_add_user_admin_org_columns.ts`
   - Script này **có data**, apply lên DB đang chạy
   - Phải có rollback logic

**⚠️ Lưu ý:**
- Schema docs = Cấu trúc sạch (no data)
- Migration scripts = Apply lên DB production (có data)
- 2 cái phải đồng bộ 100%

---

#### Additions (KHÔNG sửa existing columns - chỉ ADD)

**File: `docs/database/suar_postgresql_v3.sql`** (hoặc file schema hiện tại)

**Table: `organizations`**
```sql
-- ADD new columns
ALTER TABLE organizations
  ADD COLUMN account_type VARCHAR(20) DEFAULT 'personal'
    CHECK (account_type IN ('personal', 'team', 'business', 'enterprise')),
  ADD COLUMN is_active BOOLEAN DEFAULT true,
  ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN organizations.account_type IS 'Organization type: personal/team/business/enterprise';
COMMENT ON COLUMN organizations.settings IS 'Organization-specific settings (branding, features, etc.)';

-- ADD index
CREATE INDEX idx_organizations_account_type ON organizations(account_type) WHERE deleted_at IS NULL;
```

**Table: `users`**
```sql
-- ADD column to track preferred interface
ALTER TABLE users
  ADD COLUMN preferred_interface VARCHAR(20) DEFAULT 'auto'
    CHECK (preferred_interface IN ('user', 'admin', 'organization', 'auto'));

COMMENT ON COLUMN users.preferred_interface IS 'User preferred interface on login: auto-detect based on role';
```

**Table: `admin_sessions` (NEW)**
```sql
-- Track system admin login sessions for audit
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX idx_admin_sessions_active ON admin_sessions(is_active) WHERE is_active = true;

COMMENT ON TABLE admin_sessions IS 'Audit trail for system admin logins';
```

---

#### Migration Scripts (Apply lên DB production)

**File: `database/migrations/YYYY_MM_DD_001_add_organizations_columns.ts`**
```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('account_type', 20).defaultTo('personal')
        .checkIn(['personal', 'team', 'business', 'enterprise'])
      table.boolean('is_active').defaultTo(true)
      table.jsonb('settings').defaultTo('{}')
    })

    // Add index
    this.schema.raw(`
      CREATE INDEX idx_organizations_account_type 
      ON organizations(account_type) 
      WHERE deleted_at IS NULL
    `)
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('account_type')
      table.dropColumn('is_active')
      table.dropColumn('settings')
    })

    this.schema.raw('DROP INDEX IF EXISTS idx_organizations_account_type')
  }
}
```

**File: `database/migrations/YYYY_MM_DD_002_add_users_preferred_interface.ts`**
```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('preferred_interface', 20).defaultTo('auto')
        .checkIn(['user', 'admin', 'organization', 'auto'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('preferred_interface')
    })
  }
}
```

**File: `database/migrations/YYYY_MM_DD_003_create_admin_sessions.ts`**
```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admin_sessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.timestamp('login_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('logout_at', { useTz: true }).nullable()
      table.string('ip_address', 45).nullable()
      table.text('user_agent').nullable()
      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
    })

    // Add indexes
    this.schema.raw('CREATE INDEX idx_admin_sessions_user_id ON admin_sessions(user_id)')
    this.schema.raw('CREATE INDEX idx_admin_sessions_active ON admin_sessions(is_active) WHERE is_active = true')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

---

#### Migration Priority

- **P0**: None (existing schema sufficient cho MVP)
- **P1**: 
  - `organizations.account_type`, `organizations.settings`
  - `users.preferred_interface`
- **P2**: 
  - `admin_sessions` table (audit trail)

---

#### Testing Migrations

```bash
# Dry run (kiểm tra syntax)
node ace migration:run --dry-run

# Apply to development DB
node ace migration:run

# Rollback if needed
node ace migration:rollback

# Apply to production (sau khi test kỹ)
NODE_ENV=production node ace migration:run
```

### 2. Backend Changes

#### A. Middleware (NEW)

**File: `app/middleware/system_admin_context_middleware.ts`**
```typescript
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * System Admin Context Middleware
 * Detect system admin mode and set context
 */
export default class SystemAdminContextMiddleware {
  async handle({ auth, session, view }: HttpContext, next: NextFn) {
    const isAdminMode = session.get('is_admin_mode', false)
    const isSystemAdmin = auth.user?.system_role === 'superadmin' ||
                          auth.user?.system_role === 'system_admin'

    // Share to view
    view.share({
      isAdminMode: isAdminMode && isSystemAdmin,
      canSwitchToAdmin: isSystemAdmin,
      contextType: 'system_admin', // ← Identify context type
    })

    await next()
  }
}
```

**File: `app/middleware/require_system_admin_middleware.ts`**
```typescript
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Require System Admin Middleware
 * Protect /admin routes - SYSTEM ADMIN ONLY (NOT org admin)
 */
export default class RequireSystemAdminMiddleware {
  async handle({ auth, session, response, request }: HttpContext, next: NextFn) {
    const isSystemAdmin = auth.user?.system_role === 'superadmin' ||
                         auth.user?.system_role === 'system_admin'

    if (!isSystemAdmin) {
      session.flash('error', 'Access denied. System Admin privileges required.')
      return response.redirect().toRoute('home')
    }

    // Log system admin access
    await AuditLog.create({
      user_id: auth.user.id,
      action: 'system_admin_access',
      resource_type: 'system',
      ip_address: request.ip(),
      user_agent: request.header('user-agent'),
    })

    await next()
  }
}
```

**File: `app/middleware/organization_admin_context_middleware.ts`**
```typescript
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import OrganizationUser from '#models/organization_user'

/**
 * Organization Admin Context Middleware
 * Set context for organization admin interface
 */
export default class OrganizationAdminContextMiddleware {
  async handle({ auth, session, view }: HttpContext, next: NextFn) {
    const currentOrgId = auth.user?.current_organization_id

    if (!currentOrgId) {
      view.share({ contextType: 'user', isOrgAdmin: false })
      return await next()
    }

    // Get org role
    const orgUser = await OrganizationUser.query()
      .where('user_id', auth.user.id)
      .where('organization_id', currentOrgId)
      .first()

    const isOrgAdmin = orgUser?.org_role === 'org_owner' || 
                       orgUser?.org_role === 'org_admin'

    // Share to view
    view.share({
      isOrgAdmin,
      orgRole: orgUser?.org_role,
      contextType: isOrgAdmin ? 'organization' : 'user', // ← Key decision
    })

    await next()
  }
}
```

**File: `app/middleware/require_org_admin_middleware.ts`**
```typescript
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import OrganizationUser from '#models/organization_user'

/**
 * Require Organization Admin Middleware
 * Protect /org routes - ORG ADMIN ONLY (org_owner or org_admin)
 * NOT system admin
 */
export default class RequireOrgAdminMiddleware {
  async handle({ auth, session, response }: HttpContext, next: NextFn) {
    const currentOrgId = auth.user?.current_organization_id

    if (!currentOrgId) {
      session.flash('error', 'Please select an organization first.')
      return response.redirect().toRoute('organizations.index')
    }

    // Check org role
    const orgUser = await OrganizationUser.query()
      .where('user_id', auth.user.id)
      .where('organization_id', currentOrgId)
      .first()

    const isOrgAdmin = orgUser?.org_role === 'org_owner' || 
                       orgUser?.org_role === 'org_admin'

    if (!isOrgAdmin) {
      session.flash('error', 'Access denied. Organization Admin role required.')
      return response.redirect().toRoute('home')
    }

    await next()
  }
}
```

**File: `app/middleware/require_org_owner_middleware.ts`**
```typescript
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import OrganizationUser from '#models/organization_user'

/**
 * Require Organization Owner Middleware
 * For sensitive operations like billing, transfer ownership
 */
export default class RequireOrgOwnerMiddleware {
  async handle({ auth, session, response }: HttpContext, next: NextFn) {
    const currentOrgId = auth.user?.current_organization_id

    const orgUser = await OrganizationUser.query()
      .where('user_id', auth.user.id)
      .where('organization_id', currentOrgId)
      .first()

    if (orgUser?.org_role !== 'org_owner') {
      session.flash('error', 'Access denied. Organization Owner role required.')
      return response.redirect().toRoute('org.dashboard')
    }

    await next()
  }
}
```

#### B. Controllers (NEW namespaces)

**Structure:**
```
app/controllers/
├── admin/                    ← NEW: System Admin Controllers
│   ├── dashboard_controller.ts
│   ├── users/
│   │   ├── list_users_controller.ts
│   │   ├── create_user_controller.ts
│   │   ├── update_user_role_controller.ts
│   │   └── suspend_user_controller.ts
│   ├── organizations/
│   │   ├── list_organizations_controller.ts
│   │   └── view_organization_controller.ts
│   ├── subscriptions/
│   │   ├── list_subscriptions_controller.ts
│   │   └── manage_plans_controller.ts
│   ├── qr_codes/
│   │   └── generate_qr_controller.ts
│   ├── audit_logs/
│   │   └── list_audit_logs_controller.ts
│   └── reviews/
│       ├── list_flagged_reviews_controller.ts
│       └── resolve_dispute_controller.ts
│
├── organization/             ← NEW: Organization Admin Controllers
│   ├── dashboard_controller.ts
│   ├── settings/
│   │   ├── show_settings_controller.ts
│   │   └── update_settings_controller.ts
│   ├── members/
│   │   ├── list_members_controller.ts
│   │   ├── invite_member_controller.ts
│   │   ├── remove_member_controller.ts
│   │   └── update_member_role_controller.ts
│   ├── invitations/
│   │   ├── list_invitations_controller.ts
│   │   └── approve_join_request_controller.ts
│   ├── projects/
│   │   ├── list_projects_controller.ts
│   │   └── create_project_controller.ts
│   ├── workflow/
│   │   ├── list_task_statuses_controller.ts
│   │   └── customize_workflow_controller.ts
│   └── billing/
│       ├── show_billing_controller.ts
│       └── update_plan_controller.ts
│
├── users/                    ← KEEP (for regular users)
│   ├── show_profile_controller.ts
│   ├── edit_profile_controller.ts
│   └── ...
└── ... (existing)
```

**Example: `app/controllers/admin/users/list_users_controller.ts`**
```typescript
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import ListUsersQuery from '#actions/admin/users/queries/list_users_query'

@inject()
export default class ListUsersController {
  constructor(private listUsersQuery: ListUsersQuery) {}

  async handle({ inertia, request }: HttpContext) {
    const page = request.input('page', 1)
    const search = request.input('search', '')
    const role = request.input('role', null)

    const result = await this.listUsersQuery.execute({
      page,
      perPage: 50,
      search,
      role,
    })

    return inertia.render('admin/users/index', {
      users: result.data,
      pagination: result.meta,
      filters: { search, role },
    })
  }
}
```

#### C. Actions Layer (NEW namespaces)

**Structure:**
```
app/actions/
├── admin/                    ← NEW: System Admin Actions
│   ├── users/
│   │   ├── queries/
│   │   │   ├── list_users_query.ts
│   │   │   └── get_user_stats_query.ts
│   │   └── commands/
│   │       ├── create_user_command.ts
│   │       ├── update_user_role_command.ts
│   │       └── suspend_user_command.ts
│   ├── organizations/
│   │   └── queries/
│   │       └── list_all_organizations_query.ts
│   └── audit_logs/
│       └── queries/
│           └── list_audit_logs_query.ts
│
├── organization/             ← NEW: Organization Admin Actions
│   ├── members/
│   │   ├── queries/
│   │   │   ├── list_organization_members_query.ts
│   │   │   └── get_pending_join_requests_query.ts
│   │   └── commands/
│   │       ├── invite_member_command.ts
│   │       ├── remove_member_command.ts
│   │       └── update_member_role_command.ts
│   ├── settings/
│   │   ├── queries/
│   │   │   └── get_organization_settings_query.ts
│   │   └── commands/
│   │       └── update_organization_settings_command.ts
│   ├── projects/
│   │   ├── queries/
│   │   │   └── list_organization_projects_query.ts
│   │   └── commands/
│   │       └── create_project_command.ts
│   └── workflow/
│       ├── queries/
│       │   └── list_task_statuses_query.ts
│       └── commands/
│           └── customize_workflow_command.ts
│
└── ... (existing)
```

**Example: `app/actions/admin/users/queries/list_users_query.ts`**
```typescript
import { inject } from '@adonisjs/core'
import UserRepository from '#repositories/user_repository'
import type { ListUsersDTO } from '../dtos/request/list_users_dto'

@inject()
export default class ListUsersQuery {
  constructor(private userRepository: UserRepository) {}

  async execute(dto: ListUsersDTO) {
    const query = this.userRepository.query()

    // Apply filters
    if (dto.search) {
      query.where((q) => {
        q.where('username', 'ilike', `%${dto.search}%`)
          .orWhere('email', 'ilike', `%${dto.search}%`)
      })
    }

    if (dto.role) {
      query.where('system_role', dto.role)
    }

    // Pagination
    const result = await query.paginate(dto.page, dto.perPage)

    return {
      data: result.all(),
      meta: result.getMeta(),
    }
  }
}
```

#### D. Routes (NEW files)

**File: `start/routes/admin.ts`** (System Admin Routes)
```typescript
import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Lazy-loaded system admin controllers
const AdminDashboardController = () => import('#controllers/admin/dashboard_controller')
const ListUsersController = () => import('#controllers/admin/users/list_users_controller')
const CreateUserController = () => import('#controllers/admin/users/create_user_controller')
// ... more controllers

router
  .group(() => {
    // Dashboard
    router.get('/', [AdminDashboardController, 'handle']).as('admin.dashboard')

    // Users management
    router.group(() => {
      router.get('/', [ListUsersController, 'handle']).as('admin.users.index')
      router.get('/create', [CreateUserController, 'handle']).as('admin.users.create')
      router.post('/', [StoreUserController, 'handle']).as('admin.users.store')
      router.put('/:id/role', [UpdateUserRoleController, 'handle']).as('admin.users.updateRole')
      router.put('/:id/suspend', [SuspendUserController, 'handle']).as('admin.users.suspend')
    }).prefix('/users')

    // Organizations management
    router.group(() => {
      router.get('/', [ListOrganizationsController, 'handle']).as('admin.orgs.index')
      router.get('/:id', [ViewOrganizationController, 'handle']).as('admin.orgs.show')
    }).prefix('/organizations')

    // Audit logs
    router.get('/audit-logs', [ListAuditLogsController, 'handle']).as('admin.auditLogs')

    // Flagged reviews
    router.get('/reviews/flagged', [ListFlaggedReviewsController, 'handle'])
      .as('admin.reviews.flagged')

    // QR Codes
    router.get('/qr-codes', [ListQRCodesController, 'handle']).as('admin.qrCodes.index')
    router.post('/qr-codes', [GenerateQRCodeController, 'handle']).as('admin.qrCodes.create')
  })
  .prefix('/admin')
  .use([
    middleware.auth(),
    middleware.requireSystemAdmin(),  // ← System Admin only
    middleware.systemAdminContext(),  // ← Set admin context
  ])
```

**File: `start/routes/organization.ts`** (Organization Admin Routes)
```typescript
import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Lazy-loaded organization admin controllers
const OrgDashboardController = () => import('#controllers/organization/dashboard_controller')
const ListMembersController = () => import('#controllers/organization/members/list_members_controller')
const InviteMemberController = () => import('#controllers/organization/members/invite_member_controller')
// ... more controllers

router
  .group(() => {
    // Dashboard
    router.get('/', [OrgDashboardController, 'handle']).as('org.dashboard')

    // Members management
    router.group(() => {
      router.get('/', [ListMembersController, 'handle']).as('org.members.index')
      router.post('/invite', [InviteMemberController, 'handle']).as('org.members.invite')
      router.delete('/:id', [RemoveMemberController, 'handle']).as('org.members.remove')
      router.put('/:id/role', [UpdateMemberRoleController, 'handle']).as('org.members.updateRole')
    }).prefix('/members')

    // Join requests & invitations
    router.group(() => {
      router.get('/requests', [ListJoinRequestsController, 'handle']).as('org.requests.index')
      router.put('/requests/:id/approve', [ApproveJoinRequestController, 'handle']).as('org.requests.approve')
      router.get('/invitations', [ListInvitationsController, 'handle']).as('org.invitations.index')
    }).prefix('/invitations')

    // Settings
    router.group(() => {
      router.get('/', [ShowSettingsController, 'handle']).as('org.settings.show')
      router.put('/', [UpdateSettingsController, 'handle']).as('org.settings.update')
    }).prefix('/settings')

    // Projects (organization-level)
    router.group(() => {
      router.get('/', [ListProjectsController, 'handle']).as('org.projects.index')
      router.post('/', [CreateProjectController, 'handle']).as('org.projects.create')
    }).prefix('/projects')

    // Workflow customization
    router.group(() => {
      router.get('/statuses', [ListTaskStatusesController, 'handle']).as('org.workflow.statuses')
      router.post('/statuses', [CreateTaskStatusController, 'handle']).as('org.workflow.createStatus')
    }).prefix('/workflow')

    // Billing (org_owner only)
    router.group(() => {
      router.get('/', [ShowBillingController, 'handle']).as('org.billing.show')
      router.put('/plan', [UpdatePlanController, 'handle']).as('org.billing.updatePlan')
    }).prefix('/billing').use(middleware.requireOrgOwner())
  })
  .prefix('/org')
  .use([
    middleware.auth(),
    middleware.requireOrg(),          // ← Must have current_organization_id
    middleware.requireOrgAdmin(),     // ← Must be org_owner or org_admin
    middleware.orgAdminContext(),     // ← Set org admin context
  ])
```

**File: `start/routes/index.ts` (update)**
```typescript
// Import specialized routes
import './admin.js'        // ← System Admin routes
import './organization.js' // ← Organization Admin routes

// Existing routes...
import './auth.js'
import './users.ts'
import './tasks.ts'
// ...
```

### 3. Frontend Changes

#### A. Layout Components (NEW)

**File: `inertia/components/layout/system_admin_layout.svelte`**
```svelte
<script lang="ts">
  import SystemAdminSidebar from './system_admin_sidebar.svelte'
  import SystemAdminNavBar from './system_admin_nav_bar.svelte'

  interface Props {
    children: any
  }

  let { children }: Props = $props()
</script>

<div class="system-admin-layout">
  <SystemAdminSidebar />
  <div class="admin-main">
    <SystemAdminNavBar />
    <main class="admin-content">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .system-admin-layout {
    display: flex;
    min-height: 100vh;
    background: var(--system-admin-bg);
    /* Dark theme for system admin */
  }
</style>
```

**File: `inertia/components/layout/organization_layout.svelte`**
```svelte
<script lang="ts">
  import OrganizationSidebar from './organization_sidebar.svelte'
  import OrganizationNavBar from './organization_nav_bar.svelte'

  interface Props {
    children: any
    organization: {
      id: string
      name: string
      logo: string | null
      plan: string
    }
  }

  let { children, organization }: Props = $props()
</script>

<div class="organization-layout">
  <OrganizationSidebar {organization} />
  <div class="org-main">
    <OrganizationNavBar {organization} />
    <main class="org-content">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .organization-layout {
    display: flex;
    min-height: 100vh;
    background: var(--org-bg);
    /* Professional theme for organization */
  }
</style>
```

**File: `inertia/components/layout/user_layout.svelte`** (existing, no change)
```svelte
<!-- Existing user layout -->
<!-- Used for regular users and org members -->
```

**File: `inertia/components/layout/system_admin_sidebar.svelte`**
```svelte
<script lang="ts">
  import { systemAdminNavigation } from '../system_admin_navigation.svelte.ts'
  import NavGroup from './nav_group.svelte'
</script>

<aside class="system-admin-sidebar">
  <div class="admin-logo">
    <h2>SUAR System Admin</h2>
  </div>

  <nav>
    {#each systemAdminNavigation as group}
      <NavGroup {group} />
    {/each}
  </nav>
</aside>

<style>
  .system-admin-sidebar {
    width: 280px;
    background: var(--system-admin-sidebar-bg);
    border-right: 1px solid var(--admin-border);
  }
</style>
```

**File: `inertia/components/layout/organization_sidebar.svelte`**
```svelte
<script lang="ts">
  import { organizationNavigation } from '../organization_navigation.svelte.ts'
  import NavGroup from './nav_group.svelte'

  interface Props {
    organization: {
      id: string
      name: string
      logo: string | null
      plan: string
    }
  }

  let { organization }: Props = $props()
</script>

<aside class="organization-sidebar">
  <div class="org-header">
    <img src={organization.logo || '/default-org-logo.png'} alt={organization.name} />
    <h2>{organization.name}</h2>
    <span class="plan-badge">{organization.plan}</span>
  </div>

  <nav>
    {#each organizationNavigation as group}
      <NavGroup {group} />
    {/each}
  </nav>
</aside>

<style>
  .organization-sidebar {
    width: 280px;
    background: var(--org-sidebar-bg);
    border-right: 1px solid var(--org-border);
  }
</style>
```

**File: `inertia/components/system_admin_navigation.svelte.ts`**
```typescript
import * as LucideIcons from 'lucide-svelte'
import type { NavGroup } from './navigation.svelte.ts'

export const systemAdminNavigation: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'System Dashboard',
        url: '/admin',
        icon: LucideIcons.LayoutDashboard,
      },
    ],
  },
  {
    title: 'Management',
    items: [
      {
        title: 'Users',
        url: '/admin/users',
        icon: LucideIcons.Users,
      },
      {
        title: 'Organizations',
        url: '/admin/organizations',
        icon: LucideIcons.Building,
      },
      {
        title: 'Subscriptions',
        url: '/admin/subscriptions',
        icon: LucideIcons.CreditCard,
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        title: 'Audit Logs',
        url: '/admin/audit-logs',
        icon: LucideIcons.FileText,
      },
      {
        title: 'Flagged Reviews',
        url: '/admin/reviews/flagged',
        icon: LucideIcons.AlertTriangle,
        badge: '3',
      },
      {
        title: 'QR Codes',
        url: '/admin/qr-codes',
        icon: LucideIcons.QrCode,
      },
    ],
  },
  {
    title: 'Settings',
    items: [
      {
        title: 'System Settings',
        url: '/admin/settings',
        icon: LucideIcons.Settings,
      },
    ],
  },
]
```

**File: `inertia/components/organization_navigation.svelte.ts`**
```typescript
import * as LucideIcons from 'lucide-svelte'
import type { NavGroup } from './navigation.svelte.ts'

export const organizationNavigation: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Organization Dashboard',
        url: '/org',
        icon: LucideIcons.LayoutDashboard,
      },
    ],
  },
  {
    title: 'Organization',
    items: [
      {
        title: 'Members',
        url: '/org/members',
        icon: LucideIcons.Users,
      },
      {
        title: 'Invitations',
        url: '/org/invitations',
        icon: LucideIcons.UserPlus,
      },
      {
        title: 'Settings',
        url: '/org/settings',
        icon: LucideIcons.Settings,
      },
    ],
  },
  {
    title: 'Projects & Tasks',
    items: [
      {
        title: 'Projects',
        url: '/org/projects',
        icon: LucideIcons.Briefcase,
      },
      {
        title: 'All Tasks',
        url: '/tasks', // Shared with user layout
        icon: LucideIcons.CheckSquare,
      },
    ],
  },
  {
    title: 'Workflow',
    items: [
      {
        title: 'Task Statuses',
        url: '/org/workflow/statuses',
        icon: LucideIcons.GitBranch,
      },
    ],
  },
  {
    title: 'Billing',
    items: [
      {
        title: 'Subscription',
        url: '/org/billing',
        icon: LucideIcons.CreditCard,
      },
    ],
  },
]
```

#### B. Pages (NEW)

**Structure:**
```
inertia/pages/
├── admin/                    ← NEW: System Admin Pages
│   ├── dashboard.svelte
│   ├── users/
│   │   ├── index.svelte
│   │   ├── create.svelte
│   │   └── edit.svelte
│   ├── organizations/
│   │   ├── index.svelte
│   │   └── show.svelte
│   ├── subscriptions/
│   │   └── index.svelte
│   ├── qr_codes/
│   │   └── index.svelte
│   └── audit_logs/
│       └── index.svelte
│
├── org/                      ← NEW: Organization Admin Pages
│   ├── dashboard.svelte
│   ├── members/
│   │   ├── index.svelte
│   │   └── invite.svelte
│   ├── invitations/
│   │   ├── index.svelte
│   │   └── requests.svelte
│   ├── settings/
│   │   ├── general.svelte
│   │   └── workflow.svelte
│   ├── projects/
│   │   ├── index.svelte
│   │   └── create.svelte
│   └── billing/
│       └── index.svelte
│
├── users/                    ← KEEP (for regular users)
│   ├── show_profile.svelte
│   └── edit_profile.svelte
│
└── ... (existing: tasks, marketplace, reviews, etc.)
```

**File: `inertia/pages/admin/users/index.svelte`**
```svelte
<script lang="ts">
  import { inertia } from '@inertiajs/svelte'
  import AdminLayout from '@/components/layout/admin_layout.svelte'
  import DataTable from '@/components/ui/data_table.svelte'
  import Badge from '@/components/ui/badge.svelte'

  interface Props {
    users: Array<{
      id: string
      username: string
      email: string
      system_role: string
      status: string
      created_at: string
    }>
    pagination: any
    filters: { search?: string; role?: string }
  }

  let { users, pagination, filters }: Props = $props()

  const columns = [
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email' },
    { key: 'system_role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions' },
  ]
</script>

<AdminLayout>
  <div class="admin-page">
    <header class="page-header">
      <h1>User Management</h1>
      <a href="/admin/users/create" use:inertia class="btn btn-primary">
        Create User
      </a>
    </header>

    <div class="filters">
      <input
        type="search"
        placeholder="Search users..."
        value={filters.search || ''}
        oninput={(e) => {
          inertia.get('/admin/users', {
            search: e.currentTarget.value,
            role: filters.role,
          })
        }}
      />
      {/* Add role filter dropdown */}
    </div>

    <DataTable data={users} {columns} {pagination} />
  </div>
</AdminLayout>
```

#### C. User Navigation Update (MODIFY)

**File: `inertia/components/navigation.svelte.ts`** (update)
```typescript
// REMOVE "Người dùng" from regular user navigation
const navigationData = [
  {
    title: 'Tổng quan',
    items: [
      {
        title: 'Tasks',
        url: '/tasks',
        iconName: 'CheckSquare',
      },
      {
        title: 'Marketplace',
        url: '/marketplace/tasks',
        iconName: 'Store',
      },
      // REMOVED: Người dùng (users) - only for admin
    ],
  },
  // ... rest unchanged
]
```

#### D. Admin Toggle Component (NEW)

**File: `inertia/components/layout/admin_toggle.svelte`**
```svelte
<script lang="ts">
  import { inertia } from '@inertiajs/svelte'
  import { Switch } from '@/components/ui/switch'

  interface Props {
    isAdminMode: boolean
    canSwitchToAdmin: boolean
  }

  let { isAdminMode, canSwitchToAdmin }: Props = $props()

  function toggleAdminMode() {
    inertia.post('/admin/toggle', {
      is_admin_mode: !isAdminMode,
    })
  }
</script>

{#if canSwitchToAdmin}
  <div class="admin-toggle">
    <label>
      <span>Admin Mode</span>
      <Switch checked={isAdminMode} onCheckedChange={toggleAdminMode} />
    </label>
  </div>
{/if}
```

**Integrate vào `nav_user.svelte`:**
```svelte
<script lang="ts">
  import AdminToggle from './admin_toggle.svelte'

  interface Props {
    isAdminMode?: boolean
    canSwitchToAdmin?: boolean
  }

  let { isAdminMode = false, canSwitchToAdmin = false }: Props = $props()
</script>

<DropdownMenu>
  <!-- Existing user menu items -->

  {#if canSwitchToAdmin}
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <AdminToggle {isAdminMode} {canSwitchToAdmin} />
    </DropdownMenuItem>
  {/if}
</DropdownMenu>
```

### 4. Organization-specific Changes

**Phase 1: Minimal changes**

- Update navigation conditional rendering:
  - IF `org_role = 'org_owner'` OR `org_role = 'org_admin'`:
    - Show "Organization Settings" in sidebar
    - Show "Members" submenu
    - Show "Billing" (if applicable)

**Phase 2: Dedicated org dashboard (future)**

- Create `inertia/pages/organization/dashboard.svelte`
- Multi-project overview
- Team performance charts
- Pending approvals summary

---

## 🗓️ Kế hoạch Refactor (Step-by-Step)

### **Phase 0: Preparation** (1 day)

**Goal:** Phân tích và chuẩn bị codebase

- [ ] **Review existing permissions**: Audit `constants/permissions.ts`
- [ ] **Review existing middleware**: Check `authorize_role.ts`, `organization_resolver_middleware.ts`
- [ ] **Document current routes**: List all routes và xác định admin routes
- [ ] **Create branch**: `refactor/user-admin-org-separation`

---

### **Phase 1: Backend Foundation** (4-5 days)

**Goal:** Tạo base structure cho System Admin + Organization Admin backend

#### Step 1.1: Middleware (Day 1-2)

**System Admin Middleware:**
- [ ] **Create**: `app/middleware/require_system_admin_middleware.ts`
  - Check `system_role IN ('superadmin', 'system_admin')`
  - Log to audit log
  - Redirect if not system admin

- [ ] **Create**: `app/middleware/system_admin_context_middleware.ts`
  - Detect `session.is_admin_mode`
  - Share `isAdminMode`, `contextType = 'system_admin'`

**Organization Admin Middleware:**
- [ ] **Create**: `app/middleware/require_org_admin_middleware.ts`
  - Check `org_role IN ('org_owner', 'org_admin')`
  - Query `organization_users` table
  - Redirect if not org admin

- [ ] **Create**: `app/middleware/require_org_owner_middleware.ts`
  - Check `org_role = 'org_owner'` (stricter than org_admin)
  - For billing, transfer ownership

- [ ] **Create**: `app/middleware/organization_admin_context_middleware.ts`
  - Detect org role in current organization
  - Share `isOrgAdmin`, `orgRole`, `contextType`

**Context Resolver:**
- [ ] **Create**: `app/middleware/context_resolver_middleware.ts`
  - Priority: System Admin Mode → Org Admin → User
  - Determine layout to use
  - Share to view: `contextType`, `layoutToUse`

- [ ] **Update**: `start/kernel.ts`
  - Register all new middleware

#### Step 1.2: Routes (Day 2-3)

**System Admin Routes:**
- [ ] **Create**: `start/routes/admin.ts`
  - Prefix: `/admin`
  - Middleware: `auth()`, `requireSystemAdmin()`, `systemAdminContext()`
  - Routes: dashboard, users, organizations, audit-logs, flagged reviews, QR codes

**Organization Admin Routes:**
- [ ] **Create**: `start/routes/organization.ts`
  - Prefix: `/org`
  - Middleware: `auth()`, `requireOrg()`, `requireOrgAdmin()`, `orgAdminContext()`
  - Routes: dashboard, members, invitations, settings, projects, workflow, billing

**User Routes Update:**
- [ ] **Update**: `start/routes/users.ts`
  - REMOVE admin actions (approve, update_role)
  - MOVE to `start/routes/admin.ts`

**Toggle Endpoints:**
- [ ] **Create**: POST `/admin/toggle` → toggle `session.is_admin_mode`
- [ ] **Create**: POST `/switch-org/:id` → switch organization context

**Import in index:**
- [ ] **Update**: `start/routes/index.ts`
  - Import `./admin.js`
  - Import `./organization.js`

#### Step 1.3: Controllers (Day 3-4)

**System Admin Controllers:**
- [ ] **Create directory**: `app/controllers/admin/`
- [ ] **Implement**:
  - `admin/dashboard_controller.ts` → System dashboard
  - `admin/users/list_users_controller.ts` → List all users
  - `admin/users/update_user_role_controller.ts` → Update system_role
  - `admin/organizations/list_organizations_controller.ts` → List all orgs
  - `admin/audit_logs/list_audit_logs_controller.ts` → Audit logs

**Organization Admin Controllers:**
- [ ] **Create directory**: `app/controllers/organization/`
- [ ] **Implement**:
  - `organization/dashboard_controller.ts` → Org dashboard
  - `organization/members/list_members_controller.ts` → List org members
  - `organization/members/invite_member_controller.ts` → Invite to org
  - `organization/members/remove_member_controller.ts` → Remove member
  - `organization/settings/show_settings_controller.ts` → Org settings
  - `organization/settings/update_settings_controller.ts` → Update org settings

#### Step 1.4: Actions (Day 4-5)

**System Admin Actions:**
- [ ] **Create directory**: `app/actions/admin/`
- [ ] **Implement queries**:
  - `admin/users/queries/list_users_query.ts`
  - `admin/users/queries/get_user_stats_query.ts`
  - `admin/organizations/queries/list_all_organizations_query.ts`
  - `admin/audit_logs/queries/list_audit_logs_query.ts`

- [ ] **Implement commands**:
  - `admin/users/commands/update_user_role_command.ts`
  - `admin/users/commands/suspend_user_command.ts`

**Organization Admin Actions:**
- [ ] **Create directory**: `app/actions/organization/`
- [ ] **Implement queries**:
  - `organization/members/queries/list_organization_members_query.ts`
  - `organization/members/queries/get_pending_join_requests_query.ts`
  - `organization/settings/queries/get_organization_settings_query.ts`

- [ ] **Implement commands**:
  - `organization/members/commands/invite_member_command.ts`
  - `organization/members/commands/remove_member_command.ts`
  - `organization/members/commands/update_member_role_command.ts`
  - `organization/settings/commands/update_organization_settings_command.ts`

---

### **Phase 2: Frontend Foundation** (4-5 days)

**Goal:** Tạo System Admin + Organization Admin UI

#### Step 2.1: Layouts (Day 6-7)

**System Admin Layout:**
- [ ] **Create**: `inertia/components/layout/system_admin_layout.svelte`
  - Two-column (sidebar + main)
  - Dark theme

- [ ] **Create**: `inertia/components/layout/system_admin_sidebar.svelte`
  - Logo: "SUAR System Admin"
  - System admin navigation

- [ ] **Create**: `inertia/components/layout/system_admin_nav_bar.svelte`
  - Breadcrumbs
  - "Exit Admin Mode" button

**Organization Layout:**
- [ ] **Create**: `inertia/components/layout/organization_layout.svelte`
  - Two-column (sidebar + main)
  - Professional theme

- [ ] **Create**: `inertia/components/layout/organization_sidebar.svelte`
  - Org logo, name, plan
  - Organization navigation

- [ ] **Create**: `inertia/components/layout/organization_nav_bar.svelte`
  - Breadcrumbs
  - Org switcher dropdown

#### Step 2.2: Navigation Configs (Day 7)

- [ ] **Create**: `inertia/components/system_admin_navigation.svelte.ts`
  - System Admin menu structure

- [ ] **Create**: `inertia/components/organization_navigation.svelte.ts`
  - Organization Admin menu structure

- [ ] **Update**: `inertia/components/navigation.svelte.ts`
  - User navigation (remove "Users" menu)

#### Step 2.3: Pages (Day 8-9)

**System Admin Pages:**
- [ ] **Create directory**: `inertia/pages/admin/`
- [ ] **Implement**:
  - `admin/dashboard.svelte` → System stats
  - `admin/users/index.svelte` → User management table
  - `admin/users/edit.svelte` → Edit user system_role
  - `admin/organizations/index.svelte` → All organizations list
  - `admin/audit_logs/index.svelte` → Audit log viewer

**Organization Admin Pages:**
- [ ] **Create directory**: `inertia/pages/org/`
- [ ] **Implement**:
  - `org/dashboard.svelte` → Org overview (team performance, pending tasks)
  - `org/members/index.svelte` → Member management
  - `org/members/invite.svelte` → Invite member form
  - `org/settings/general.svelte` → Org settings
  - `org/billing/index.svelte` → Billing & subscription

#### Step 2.4: Context Switching Components (Day 9-10)

**Admin Mode Toggle:**
- [ ] **Create**: `inertia/components/layout/admin_mode_toggle.svelte`
  - Switch: "Admin Mode" (ON/OFF)
  - POST to `/admin/toggle`
  - Show if `system_role IN ('superadmin', 'system_admin')`

**Organization Switcher:**
- [ ] **Update**: `inertia/components/layout/team_switcher.svelte`
  - Show all user's organizations
  - POST to `/switch-org/:id`
  - Highlight current organization
  - Show role badge (Owner/Admin/Member)

**Integration:**
- [ ] **Integrate**: Add Admin Toggle to `nav_user.svelte`
- [ ] **Integrate**: Improve Team Switcher logic
  - Detect org_role after switch
  - Redirect to `/org/dashboard` if org_owner/org_admin
  - Redirect to `/tasks` if org_member

#### Step 2.5: User Navigation Update (Day 10)

- [ ] **Update**: `inertia/components/navigation.svelte.ts`
  - REMOVE "Người dùng" (Users) menu
  - Keep only: Tasks, Marketplace, Profile, Reviews, Settings

---

### **Phase 3: Module Implementation** (5-7 days)

**Goal:** Implement admin modules one by one

#### Module Priority Order

| Priority | Module | Days | Description |
|----------|--------|------|-------------|
| **P0** | Users | 1.5 | List, edit role, suspend |
| **P1** | Audit Logs | 1 | View system logs, filter |
| **P1** | Organizations | 1 | List all orgs, view details |
| **P1** | Flagged Reviews | 1 | List flagged, resolve |
| **P2** | Subscriptions | 1.5 | List plans, manage pricing |
| **P2** | QR Codes | 1 | Generate payment QR |
| **P3** | Reports | 2 | Analytics dashboard |

#### Step 3.1: Users Module (Day 9-10)

- [ ] **Backend**:
  - List users with filters (role, status, search)
  - Update user role (system_role)
  - Suspend/activate user
  - View user details (profile, orgs, tasks)

- [ ] **Frontend**:
  - DataTable with filters
  - Edit role modal
  - Suspend confirmation dialog

#### Step 3.2: Audit Logs Module (Day 11)

- [ ] **Backend**:
  - Query MongoDB `audit_logs` collection
  - Filter by user, action, date range
  - Pagination

- [ ] **Frontend**:
  - Log viewer table
  - Filter panel
  - Export CSV button (future)

#### Step 3.3: Organizations Module (Day 12)

- [ ] **Backend**:
  - List all organizations (admin bypass membership check)
  - View organization details, members, projects
  - Delete organization (soft delete)

- [ ] **Frontend**:
  - Org table with search
  - Org detail page (members, projects, settings)

#### Step 3.4: Flagged Reviews Module (Day 13)

- [ ] **Backend**:
  - List flagged reviews from existing `flagged_reviews` table
  - Resolve action (dismiss/confirm)

- [ ] **Frontend**:
  - Flagged review list with severity badges
  - Resolve modal with actions

#### Step 3.5: Subscriptions Module (Day 14-15)

- [ ] **Backend**:
  - List subscription plans (from constants or DB)
  - CRUD subscription plans (future)
  - View active subscriptions

- [ ] **Frontend**:
  - Plan list table
  - Edit plan modal (pricing, features)

#### Step 3.6: QR Codes Module (Day 16)

- [ ] **Backend**:
  - Generate QR code for payment (VNPay/MoMo style)
  - Store QR metadata (plan, amount, user)

- [ ] **Frontend**:
  - QR code generator form
  - Display generated QR with download button

---

### **Phase 4: Testing & Refinement** (2-3 days)

**Goal:** Test toàn bộ flow, fix bugs, polish UX

#### Step 4.1: Permission Testing (Day 17)

- [ ] Test admin access:
  - Regular user CANNOT access `/admin/*`
  - System admin CAN access `/admin/*`
  - Superadmin CAN access all

- [ ] Test role updates:
  - Admin can change user system_role
  - Changes reflect immediately

#### Step 4.2: UI/UX Polish (Day 18)

- [ ] Admin layout styling (dark theme, professional look)
- [ ] Responsive design (mobile admin - basic support)
- [ ] Loading states, error handling
- [ ] Breadcrumbs, back buttons

#### Step 4.3: Documentation (Day 19)

- [ ] Update README with admin portal section
- [ ] Document admin routes in API docs
- [ ] Create admin user guide (internal doc)

---

### **Phase 5: Organization Enhancements** (Future - 2-3 days)

**Goal:** Improve organization UX (not admin-specific)

- [ ] **Conditional navigation**:
  - IF `org_role = 'org_owner' OR 'org_admin'`:
    - Show "Organization Settings" in sidebar
    - Show "Members" submenu

- [ ] **Organization dashboard**:
  - Create `inertia/pages/organization/dashboard.svelte`
  - Multi-project kanban view
  - Team performance charts

- [ ] **Database changes** (Phase 2):
  - ADD `organizations.account_type`
  - ADD `organizations.login_email`
  - Implement organization login (separate OAuth flow)

---

## 🧪 Testing Strategy

### 1. Unit Tests

**Backend:**
- [ ] `RequireAdminMiddleware` → reject non-admin users
- [ ] `AdminContextMiddleware` → set context correctly
- [ ] `ListUsersQuery` → filters work correctly
- [ ] `UpdateUserRoleCommand` → role updates correctly

**Frontend:**
- [ ] AdminToggle component → toggle state works
- [ ] Admin navigation → renders correct menu

### 2. Integration Tests

- [ ] Admin routes → protected by middleware
- [ ] Admin pages → render correct layout
- [ ] User navigation → does NOT show admin items
- [ ] Context switching → session persists

### 3. E2E Tests

- [ ] Login as system_admin → see "Switch to Admin" toggle
- [ ] Toggle admin mode → redirect to `/admin` dashboard
- [ ] List users → see all users with filters
- [ ] Update user role → role changes in DB
- [ ] Logout → admin mode clears

### 4. Permission Tests

- [ ] Regular user → CANNOT access `/admin/*`
- [ ] System admin → CAN access `/admin/*`
- [ ] Superadmin → CAN access all
- [ ] Org admin → CANNOT access `/admin/*` (system admin only)

---

## 📈 Success Metrics

### Immediate (After Phase 1-2)

- [ ] Admin routes are protected by middleware
- [ ] Admin UI is accessible only to system admins
- [ ] Regular users do NOT see admin menu items
- [ ] Context switching works (toggle admin mode)

### Mid-term (After Phase 3)

- [ ] All admin modules implemented (Users, Orgs, Audit Logs, etc.)
- [ ] Admin can manage users and organizations
- [ ] Audit logs are viewable and filterable
- [ ] No permission bugs (tested with different roles)

### Long-term (After Phase 5)

- [ ] Organization dashboard is optimized for org owners
- [ ] Organization account type is implemented
- [ ] User/Admin/Org contexts are 100% separated
- [ ] System is scalable for future admin features

---

## ⚠️ Risks & Mitigation

### Risk 1: Breaking Existing Features

**Mitigation:**
- Implement admin routes in PARALLEL (không sửa existing routes)
- Use feature flags để enable admin portal từ từ
- Rollback plan: Keep old routes intact, only add new `/admin` routes

### Risk 2: Permission Confusion

**Mitigation:**
- Document permission matrix clearly
- Add unit tests cho mọi permission check
- UI show clear indicators (badges, colors) cho role

### Risk 3: Frontend Performance

**Mitigation:**
- Lazy load admin layout và pages
- Pagination cho mọi danh sách
- Cache navigation config

### Risk 4: Database Changes

**Mitigation:**
- Phase 1 KHÔNG cần DB migration (dùng existing schema)
- Phase 2 migrations là additive (ADD columns, không ALTER)
- Rollback scripts sẵn sàng

---

## 🚀 Deployment Plan

### Pre-deployment

- [ ] Merge to `develop` branch
- [ ] Run full test suite (unit + integration + E2E)
- [ ] Code review by team lead
- [ ] Create rollback plan

### Deployment Steps

1. **Database migrations** (if any - Phase 2):
   ```bash
   node ace migration:run
   ```

2. **Deploy backend**:
   ```bash
   git pull origin main
   npm run build
   pm2 restart suar
   ```

3. **Deploy frontend** (if separate):
   ```bash
   npm run build
   # Deploy static assets to CDN
   ```

4. **Verify**:
   - [ ] Login as superadmin → see admin toggle
   - [ ] Access `/admin` → see dashboard
   - [ ] Login as regular user → cannot access `/admin`

### Post-deployment

- [ ] Monitor error logs (first 24h)
- [ ] Collect feedback from admins
- [ ] Fix critical bugs (hotfix if needed)

---

## 📚 Documentation Updates

### Files to Update

- [ ] **README.md**:
  - Add "Admin Portal" section
  - Document admin routes
  - Add screenshots

- [ ] **docs/architecture.md** (create if not exists):
  - Document 3-tier architecture
  - Permission matrix
  - Context switching mechanism

- [ ] **docs/admin-guide.md** (NEW):
  - How to access admin portal
  - Admin module documentation
  - User management guide

- [ ] **API documentation**:
  - Document `/admin/*` endpoints
  - Permission requirements
  - Request/response examples

---

## 🎯 Thứ tự ưu tiên triển khai

### **Immediate (Week 1-2)**: Phase 1 + Phase 2

Focus: Base structure + foundation

- Backend: Middleware, routes, controllers, actions
- Frontend: Admin layout, navigation, basic pages
- Goal: Admin portal accessible, even if empty

### **Short-term (Week 3)**: Phase 3 (P0-P1 modules)

Focus: Core admin modules

- Users management (P0)
- Audit logs (P1)
- Organizations (P1)
- Flagged reviews (P1)

### **Mid-term (Week 4)**: Phase 3 (P2 modules) + Phase 4

Focus: Additional modules + testing

- Subscriptions (P2)
- QR Codes (P2)
- Full testing suite
- Bug fixes, UI polish

### **Long-term (Month 2+)**: Phase 5 + Future

Focus: Organization enhancements

- Organization dashboard
- Organization account type
- Organization login (OAuth)
- Advanced analytics

---

## 🔄 Iterative Approach

**Principle:** Ship incrementally, gather feedback, iterate

### Iteration 1: MVP Admin Portal (Week 1-2)

- Admin layout + navigation
- Users list (read-only)
- Audit logs (read-only)
- **Deploy to staging** → gather admin feedback

### Iteration 2: User Management (Week 3)

- Users CRUD
- Role management
- Suspend/activate
- **Deploy to staging** → test with real data

### Iteration 3: Full Admin Suite (Week 4)

- All P0-P1 modules
- Testing + bug fixes
- **Deploy to production**

### Iteration 4: Advanced Features (Month 2+)

- P2-P3 modules
- Organization enhancements
- Reports & analytics

---

## ✅ Checklist Summary

### Pre-implementation

- [x] Phân tích hiện trạng (database, backend, frontend, routes)
- [x] Định nghĩa 3 nhóm người dùng (User, Admin, Org)
- [x] Thiết kế kiến trúc (3-tier interface, context switching)
- [x] Xác định ảnh hưởng (database, backend, frontend, docs)
- [x] Lập kế hoạch refactor từng bước (Phase 1-5)

### Implementation (Theo Phase Plan)

- [ ] Phase 0: Preparation (1 day)
- [ ] Phase 1: Backend Foundation - System + Org Admin (4-5 days)
- [ ] Phase 2: Frontend Foundation - System + Org UI (4-5 days)
- [ ] Phase 3: Module Implementation (6-8 days)
  - [ ] System Admin modules (Users, Orgs, Audit Logs)
  - [ ] Organization Admin modules (Members, Settings, Workflow)
- [ ] Phase 4: Testing & Refinement (2-3 days)
- [ ] Phase 5: Advanced Features (Future)

### Post-implementation

- [ ] Testing (unit, integration, E2E)
- [ ] Documentation updates
- [ ] Deployment
- [ ] Monitoring & feedback

---

## 📝 Notes

- **Không sửa code hiện tại**: Tất cả changes đều là ADDITIVE (thêm mới, không sửa)
- **Backward compatible**: Existing features vẫn hoạt động bình thường
- **Incremental deployment**: Ship từng phase, không all-at-once
- **Feature flags**: Có thể dùng để enable/disable admin portal

---

## 🔑 Key Takeaways

### ⚠️ PHÂN BIỆT RÕ RÀNG

```
┌─────────────────────────────────────────────────────────────┐
│  System Admin (system_role)                                 │
│  - Quản lý TOÀN HỆ THỐNG                                    │
│  - Namespace: /admin                                        │
│  - Không cần thuộc org                                      │
│  - Middleware: requireSystemAdmin()                         │
└─────────────────────────────────────────────────────────────┘
                            ≠
┌─────────────────────────────────────────────────────────────┐
│  Organization Admin (org_role)                              │
│  - Quản lý CHỈ ORG CỦA MÌNH                                 │
│  - Namespace: /org                                          │
│  - Phải thuộc org (org_owner hoặc org_admin)                │
│  - Middleware: requireOrgAdmin()                            │
└─────────────────────────────────────────────────────────────┘
                            ≠
┌─────────────────────────────────────────────────────────────┐
│  Regular User (org_member hoặc no org)                      │
│  - Làm task, ứng tuyển, quản lý profile                     │
│  - Namespace: / (root)                                      │
│  - Layout: User Layout                                      │
└─────────────────────────────────────────────────────────────┘
```

### 🔄 Context Switching

- User có thể thuộc **nhiều organizations**
- Khi switch org → Check org_role:
  - `org_owner/org_admin` → Organization Layout + `/org` routes
  - `org_member` → User Layout + `/` routes
- System Admin có thể toggle "Admin Mode" bất kỳ lúc nào

### 💾 Database Updates

- **2 bước đồng bộ**:
  1. Sửa schema docs (source of truth)
  2. Tạo migration scripts (apply lên production)
- **Chỉ ADD columns**, không ALTER existing
- Migration có rollback logic

---

## 🤝 Contributors

- **AI Assistant**: Phân tích và lập kế hoạch
- **Team Lead**: Review và approve
- **Backend Engineer**: Implement Phase 1 (System + Org backend)
- **Frontend Engineer**: Implement Phase 2 (System + Org UI)
- **Full-stack Engineer**: Implement Phase 3 (modules)

---

**End of Document**
