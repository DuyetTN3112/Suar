# SUAR Platform — User / Admin / Organization Separation Plan

**Generated:** 2026-03-22  
**Author:** AI Assistant  
**Purpose:** Kế hoạch refactor hệ thống để phân tách rõ ràng giữa User, Admin, và Organization

---

## 📋 Tóm tắt Executive Summary

Hệ thống SUAR hiện tại đang có **thiếu sót nghiêm trọng về phân tách vai trò**: User bình thường, Admin hệ thống, và Organization đang bị trộn lẫn trong cùng một giao diện và logic. Điều này gây ra:

- **Confusion về phân quyền**: User thường thấy menu/tính năng không phù hợp với vai trò
- **Security risk**: Không có ranh giới rõ ràng cho admin interface
- **Scalability issue**: Khó mở rộng tính năng quản trị hệ thống
- **UX degradation**: Giao diện lộn xộn, không tối ưu cho từng nhóm người dùng

Kế hoạch này đề xuất **kiến trúc 3-tier interface** với base structure rõ ràng, có thể mở rộng dần theo thời gian.

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
- Nhắn tin (nếu có messaging - hiện đã loại bỏ)

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

### 3. **Organization (Tổ chức)**

**Định nghĩa hiện tại:**
- Không phải một "user type" riêng
- Chỉ là một **entity** mà users tham gia
- Không có tài khoản đăng nhập riêng

**Vấn đề:**
- Hiện tại không có cách để "organization login as entity"
- Organization chỉ được đại diện bởi `org_owner` hoặc `org_admin`
- Không có giao diện tối ưu cho "organization dashboard"

**Đề xuất Phase 1:**
- **Tạm thời sử dụng giao diện giống User**
- Khi user có `org_role = 'org_owner'` hoặc `'org_admin'`:
  - Navigation thêm: Organization settings, Members, Billing
  - Dashboard focus: Organization tasks, Team performance
  - Team switcher highlight org context

**Đề xuất Phase 2 (Future):**
- Implement **Organization Account**:
  - `organizations.account_type` ENUM: `'personal'`, `'team'`, `'business'`, `'enterprise'`
  - `organizations.login_email`: Tài khoản email login riêng cho org
  - `organizations.owner_user_id`: User sở hữu org
  - OAuth support cho org login (Google Workspace, GitHub Org)
- Customize layout:
  - Org-branded dashboard
  - Multi-project kanban view
  - Team analytics

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

### Context Switching Mechanism

```
User Login
    ↓
┌───────────────────────────────────────┐
│  Detect: auth.user.system_role        │
├───────────────────────────────────────┤
│  IF system_role = 'superadmin'        │
│  OR system_role = 'system_admin'      │
│    → Show "Switch to Admin" toggle    │
│    → Store in session: is_admin_mode  │
│  ELSE                                 │
│    → Normal user mode                 │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│  Middleware: AdminContextMiddleware   │
├───────────────────────────────────────┤
│  Check session.is_admin_mode          │
│  IF true:                             │
│    → Set ctx.isAdminMode = true       │
│    → Load admin navigation            │
│    → Use AdminLayout                  │
│  ELSE:                                │
│    → Check current_organization_id    │
│    → Load org navigation              │
│    → Use UserLayout                   │
└───────────────────────────────────────┘
```

---

## 📊 Ảnh hưởng đến từng layer

### 1. Database Changes

#### Additions (NOT modifications - chỉ thêm)

**Table: `organizations`**
```sql
-- ADD new columns (không sửa existing columns)
ALTER TABLE organizations
  ADD COLUMN account_type VARCHAR(20) DEFAULT 'personal'
    CHECK (account_type IN ('personal', 'team', 'business', 'enterprise')),
  ADD COLUMN is_active BOOLEAN DEFAULT true,
  ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;

-- ADD index
CREATE INDEX idx_organizations_account_type ON organizations(account_type) WHERE deleted_at IS NULL;
```

**Table: `users`**
```sql
-- ADD column to track admin mode preference
ALTER TABLE users
  ADD COLUMN preferred_interface VARCHAR(20) DEFAULT 'user'
    CHECK (preferred_interface IN ('user', 'admin', 'auto'));
```

**Table: `admin_sessions` (NEW)**
```sql
-- Track admin login sessions for audit
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
```

**Migration Priority:**
- P0: None (existing schema sufficient for base implementation)
- P1: `organizations.account_type`, `users.preferred_interface`
- P2: `admin_sessions` table

### 2. Backend Changes

#### A. Middleware (NEW)

**File: `app/middleware/admin_context_middleware.ts`**
```typescript
// Detect admin mode from session and set context
export default class AdminContextMiddleware {
  async handle({ auth, session, view }: HttpContext, next: NextFn) {
    const isAdminMode = session.get('is_admin_mode', false)
    const canAccessAdmin = auth.user?.system_role === 'superadmin' ||
                          auth.user?.system_role === 'system_admin'

    // Share to view
    view.share({
      isAdminMode: isAdminMode && canAccessAdmin,
      canSwitchToAdmin: canAccessAdmin,
    })

    await next()
  }
}
```

**File: `app/middleware/require_admin_middleware.ts`**
```typescript
// Protect /admin routes
export default class RequireAdminMiddleware {
  async handle({ auth, session, response }: HttpContext, next: NextFn) {
    const isSystemAdmin = auth.user?.system_role === 'superadmin' ||
                         auth.user?.system_role === 'system_admin'

    if (!isSystemAdmin) {
      session.flash('error', 'Access denied. Admin privileges required.')
      return response.redirect().toRoute('home')
    }

    // Log admin access
    await AuditLog.create({
      user_id: auth.user.id,
      action: 'admin_access',
      ip_address: request.ip(),
      // ...
    })

    await next()
  }
}
```

#### B. Controllers (NEW namespace)

**Structure:**
```
app/controllers/
├── admin/                    ← NEW
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

#### C. Actions Layer (NEW namespace)

**Structure:**
```
app/actions/
├── admin/                    ← NEW
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

#### D. Routes (NEW file)

**File: `start/routes/admin.ts`**
```typescript
import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Lazy-loaded admin controllers
const AdminDashboardController = () => import('#controllers/admin/dashboard_controller')
const ListUsersController = () => import('#controllers/admin/users/list_users_controller')
const CreateUserController = () => import('#controllers/admin/users/create_user_controller')
// ... more controllers

router
  .group(() => {
    // Dashboard
    router.get('/admin', [AdminDashboardController, 'handle']).as('admin.dashboard')

    // Users management
    router.group(() => {
      router.get('/users', [ListUsersController, 'handle']).as('admin.users.index')
      router.get('/users/create', [CreateUserController, 'handle']).as('admin.users.create')
      router.post('/users', [StoreUserController, 'handle']).as('admin.users.store')
      router.put('/users/:id/role', [UpdateUserRoleController, 'handle']).as('admin.users.updateRole')
      router.put('/users/:id/suspend', [SuspendUserController, 'handle']).as('admin.users.suspend')
    }).prefix('/admin')

    // Organizations management
    router.group(() => {
      router.get('/organizations', [ListOrganizationsController, 'handle']).as('admin.orgs.index')
      router.get('/organizations/:id', [ViewOrganizationController, 'handle']).as('admin.orgs.show')
    }).prefix('/admin')

    // Audit logs
    router.get('/admin/audit-logs', [ListAuditLogsController, 'handle']).as('admin.auditLogs')

    // Flagged reviews
    router.get('/admin/reviews/flagged', [ListFlaggedReviewsController, 'handle'])
      .as('admin.reviews.flagged')

    // QR Codes
    router.get('/admin/qr-codes', [ListQRCodesController, 'handle']).as('admin.qrCodes.index')
    router.post('/admin/qr-codes', [GenerateQRCodeController, 'handle']).as('admin.qrCodes.create')
  })
  .use([
    middleware.auth(),
    middleware.requireAdmin(),    // ← NEW middleware
    middleware.adminContext(),    // ← NEW middleware
  ])

export default router
```

**File: `start/routes/index.ts` (update)**
```typescript
// Import admin routes
import './admin.js'  // ← ADD this

// Existing routes...
```

### 3. Frontend Changes

#### A. Layout Components (NEW)

**File: `inertia/components/layout/admin_layout.svelte`**
```svelte
<script lang="ts">
  import { inertia } from '@inertiajs/svelte'
  import AdminSidebar from './admin_sidebar.svelte'
  import AdminNavBar from './admin_nav_bar.svelte'

  interface Props {
    children: any
  }

  let { children }: Props = $props()
</script>

<div class="admin-layout">
  <AdminSidebar />
  <div class="admin-main">
    <AdminNavBar />
    <main class="admin-content">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .admin-layout {
    display: flex;
    min-height: 100vh;
    background: var(--admin-bg);
  }
  /* Add admin-specific styling */
</style>
```

**File: `inertia/components/layout/admin_sidebar.svelte`**
```svelte
<script lang="ts">
  import { adminNavigation } from '../admin_navigation.svelte.ts'
  import NavGroup from './nav_group.svelte'
</script>

<aside class="admin-sidebar">
  <div class="admin-logo">
    <h2>SUAR Admin</h2>
  </div>

  <nav>
    {#each adminNavigation as group}
      <NavGroup {group} />
    {/each}
  </nav>
</aside>

<style>
  .admin-sidebar {
    width: 280px;
    background: var(--admin-sidebar-bg);
    border-right: 1px solid var(--admin-border);
  }
</style>
```

**File: `inertia/components/admin_navigation.svelte.ts`**
```typescript
import * as LucideIcons from 'lucide-svelte'
import type { NavGroup } from './navigation.svelte.ts'

export const adminNavigation: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
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
        badge: '3', // Example: show count
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

#### B. Pages (NEW)

**Structure:**
```
inertia/pages/
├── admin/                    ← NEW
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
├── users/                    ← KEEP (for regular users, remove admin features)
└── ... (existing)
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

### **Phase 1: Backend Foundation** (3-4 days)

**Goal:** Tạo base structure cho admin backend

#### Step 1.1: Middleware (Day 1)

- [ ] **Create**: `app/middleware/require_admin_middleware.ts`
  - Check `system_role = 'superadmin' OR 'system_admin'`
  - Log admin access to audit log
  - Redirect to home if not admin

- [ ] **Create**: `app/middleware/admin_context_middleware.ts`
  - Detect `session.is_admin_mode`
  - Share `isAdminMode`, `canSwitchToAdmin` to view

- [ ] **Update**: `start/kernel.ts`
  - Register new middleware

#### Step 1.2: Routes (Day 1-2)

- [ ] **Create**: `start/routes/admin.ts`
  - Group all admin routes under `/admin` prefix
  - Apply middleware: `auth()`, `requireAdmin()`, `adminContext()`
  - Placeholder routes: dashboard, users, organizations, audit-logs

- [ ] **Update**: `start/routes/users.ts`
  - REMOVE admin actions (approve, update_role) from user routes
  - MOVE to admin routes

- [ ] **Create**: Admin toggle endpoint
  - POST `/admin/toggle` → toggle `session.is_admin_mode`

#### Step 1.3: Controllers (Day 2-3)

- [ ] **Create directory**: `app/controllers/admin/`
- [ ] **Implement**:
  - `admin/dashboard_controller.ts` → Render admin dashboard
  - `admin/users/list_users_controller.ts` → List all users
  - `admin/users/update_user_role_controller.ts` → Update system_role
  - `admin/organizations/list_organizations_controller.ts` → List all orgs
  - `admin/audit_logs/list_audit_logs_controller.ts` → List audit logs

#### Step 1.4: Actions (Day 3-4)

- [ ] **Create directory**: `app/actions/admin/`
- [ ] **Implement queries**:
  - `admin/users/queries/list_users_query.ts`
  - `admin/users/queries/get_user_stats_query.ts`
  - `admin/organizations/queries/list_all_organizations_query.ts`
  - `admin/audit_logs/queries/list_audit_logs_query.ts`

- [ ] **Implement commands**:
  - `admin/users/commands/update_user_role_command.ts`
  - `admin/users/commands/suspend_user_command.ts`

---

### **Phase 2: Frontend Foundation** (3-4 days)

**Goal:** Tạo admin UI layout và navigation

#### Step 2.1: Admin Layout (Day 5)

- [ ] **Create**: `inertia/components/layout/admin_layout.svelte`
  - Two-column layout (sidebar + main)
  - Use different color scheme (e.g., darker theme)

- [ ] **Create**: `inertia/components/layout/admin_sidebar.svelte`
  - Admin navigation menu
  - Logo: "SUAR Admin"

- [ ] **Create**: `inertia/components/layout/admin_nav_bar.svelte`
  - Breadcrumbs
  - User menu (with "Exit Admin Mode" option)

#### Step 2.2: Admin Navigation (Day 5)

- [ ] **Create**: `inertia/components/admin_navigation.svelte.ts`
  - Define admin navigation groups:
    - Overview: Dashboard
    - Management: Users, Organizations, Subscriptions
    - System: Audit Logs, Flagged Reviews, QR Codes
    - Settings: System Settings

#### Step 2.3: Admin Pages (Day 6-7)

- [ ] **Create**:
  - `inertia/pages/admin/dashboard.svelte` → Stats overview
  - `inertia/pages/admin/users/index.svelte` → User list table
  - `inertia/pages/admin/users/edit.svelte` → Edit user role
  - `inertia/pages/admin/organizations/index.svelte` → Org list
  - `inertia/pages/admin/audit_logs/index.svelte` → Audit log viewer

#### Step 2.4: Admin Toggle (Day 7-8)

- [ ] **Create**: `inertia/components/layout/admin_toggle.svelte`
  - Switch component (ON/OFF)
  - POST to `/admin/toggle`

- [ ] **Integrate**: Add to `nav_user.svelte`
  - Show toggle if `canSwitchToAdmin = true`

#### Step 2.5: User Navigation Update (Day 8)

- [ ] **Update**: `inertia/components/navigation.svelte.ts`
  - REMOVE "Người dùng" menu item from regular user navigation
  - Only show in admin navigation

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
- [ ] Phase 1: Backend Foundation (3-4 days)
- [ ] Phase 2: Frontend Foundation (3-4 days)
- [ ] Phase 3: Module Implementation (5-7 days)
- [ ] Phase 4: Testing & Refinement (2-3 days)
- [ ] Phase 5: Organization Enhancements (Future)

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

## 🤝 Contributors

- **AI Assistant**: Phân tích và lập kế hoạch
- **Team Lead**: Review và approve
- **Backend Engineer**: Implement Phase 1
- **Frontend Engineer**: Implement Phase 2
- **Full-stack Engineer**: Implement Phase 3

---

**End of Document**
