# 🔍 SUAR Frontend Audit — AdonisJS v7 + Inertia + Svelte 5

> Tài liệu kiểm tra toàn bộ frontend so với backend, liệt kê lỗi, thiếu sót, và công việc cần làm.
> Ngày tạo: 2026-03-15

---

## 📋 Tổng quan

| Thống kê | Số lượng |
|----------|----------|
| Backend routes | 91 |
| Backend controllers | 110 |
| Frontend pages (`.svelte`) | 40 |
| Frontend components | 145 |
| UI components (shadcn) | 125 |
| Sidebar nav items | 6 |

**Kết luận: Frontend đang rất thiếu so với backend — thiếu 12+ pages, sidebar chỉ có 6 mục trong khi backend hỗ trợ 10+ modules.**

---

## 🚨 Lỗi Runtime Đã Fix

### ✅ 1. `ListUsersController` — Container DI Error
- **Lỗi**: `Cannot call "ListUsersController.handle" method. Container is not able to resolve its dependencies.`
- **Nguyên nhân**: 10 controllers trong `app/controllers/users/` dùng DI params trong `handle()` mà không có `@inject()` decorator
- **Fix**: Refactored tất cả 10 controllers sang pattern `new Query(ctx)` trực tiếp

### ✅ 2. `get_projects_list_query.js.js` — Double Extension
- **Lỗi**: `Cannot find module '...get_projects_list_query.js.js'`
- **Nguyên nhân**: Import dùng `#actions/xxx.js'` — khi resolve sẽ thành `.js.js`
- **Fix**: Removed `.js` suffix từ tất cả subpath imports trong controllers

### ✅ 3. `favicon.ico` — Missing Static File
- **Lỗi**: `Cannot GET:/favicon.ico`
- **Fix**: Tạo `public/favicon.ico` (cần thay bằng logo thực sau)

---

## 🔴 Frontend Pages THIẾU (Backend render nhưng Frontend chưa có)

| Page | Backend Controller | Mô tả |
|------|-------------------|-------|
| `tasks/create` | `CreateTaskController` | Form tạo task mới |
| `tasks/show` | `ShowTaskController` | Chi tiết 1 task |
| `tasks/edit` | `EditTaskController` | Form sửa task |
| `tasks/applications` | `ListTaskApplicationsController` | DS đơn ứng tuyển task |
| `users/create` | `CreateUserController` | Form tạo user |
| `users/show` | `ShowUserController` | Chi tiết 1 user |
| `users/edit` | `EditUserController` | Form sửa user |
| `organizations/create` | `CreateOrganizationController` | Form tạo org |
| `organizations/all` | `AllOrganizationsController` | Tất cả org (admin) |
| `notifications/index` | `ListNotificationsController` | Trang DS thông báo |
| `applications/my-applications` | `MyApplicationsController` | DS đơn ứng tuyển của tôi |
| `conversations/error` | — | Trang lỗi chat |

**→ Cần tạo 12 pages mới.**

---

## 🟡 Sidebar Navigation — Thiếu nhiều mục

### Hiện tại (6 mục):
```
Tổng quan:
  - Nhiệm vụ (/tasks)
  - Tin nhắn (/conversations)
  - Người dùng (/users)
Tổ chức:
  - Tổ chức (/organizations)
  - Dự án (/projects)
Cài đặt:
  - Cài đặt (/settings)
```

### Cần thêm:
```
Tổng quan:
  - Dashboard (/) ← Trang chính, hiện chỉ có /test
  - Nhiệm vụ (/tasks)
  - Tin nhắn (/conversations)
  + 🔔 Thông báo (/notifications) ← THIẾU
  + 📋 Đơn ứng tuyển (/my-applications) ← THIẾU

Tổ chức:
  - Tổ chức (/organizations)
  - Dự án (/projects)
  + 👥 Người dùng (/users) ← Nên nằm trong Tổ chức

Đánh giá:
  + ⭐ Đánh giá chờ (/reviews/pending) ← THIẾU
  + 📊 Đánh giá của tôi (/my-reviews) ← THIẾU

Marketplace:
  + 🏪 Marketplace (/marketplace/tasks) ← THIẾU

Cài đặt:
  - Cài đặt (/settings)
  + 👤 Hồ sơ (/profile) ← THIẾU
```

---

## 🟡 Frontend Pages CÓ nhưng THIẾU tính năng

### 1. `tasks/index.svelte`
- ✅ List view, Kanban view, Gantt view
- ❌ Không có nút "Tạo task" hoạt động (cần `tasks/create.svelte`)
- ❌ Click task không mở chi tiết (cần `tasks/show.svelte`)
- ❌ Không có task detail modal hoạt động

### 2. `profile/show.svelte`
- ❌ Lỗi khi ấn vào profile (cần kiểm tra data shape từ backend)
- Có components: `profile_header`, `profile_stats`, `skills_section`, `trust_score_badge`
- Cần verify: Backend trả đúng format mà frontend expect

### 3. `organizations/index.svelte`
- ✅ List organizations
- ❌ Không có form tạo org (cần `organizations/create.svelte`)
- ❌ Chưa có trang all organizations cho admin

### 4. `conversations/index.svelte`
- ✅ List conversations, show conversation
- ✅ Send message, recall message
- ❓ Cần test với seed data

### 5. `settings/index.svelte`
- ✅ Có nhiều tabs: account, appearance, display, notifications, profile
- ❓ Cần verify backend API cho từng tab

### 6. `reviews/*`
- ✅ Có flagged, my-reviews, pending, show, user-reviews
- ❓ Cần test flow hoàn chỉnh

---

## 🔴 Backend API Endpoints CHƯA CÓ Frontend

### Tasks API (14 routes)
| Route | Frontend | Status |
|-------|----------|--------|
| `GET /tasks` | `tasks/index.svelte` | ✅ |
| `GET /tasks/create` | — | ❌ THIẾU |
| `POST /tasks` | — | ❌ THIẾU |
| `GET /tasks/:id` | — | ❌ THIẾU |
| `GET /tasks/:id/edit` | — | ❌ THIẾU |
| `PUT /tasks/:id` | — | ❌ THIẾU |
| `DELETE /tasks/:id` | — | ❌ THIẾU |
| `PATCH /tasks/:id/time` | — | ❌ THIẾU |
| `POST /tasks/:taskId/apply` | — | ❌ THIẾU |
| `GET /my-applications` | — | ❌ THIẾU |
| `GET /api/tasks/grouped` | tasks/index (partial) | 🟡 |
| `GET /api/workflow` | — | ❌ THIẾU |
| `PUT /api/workflow` | — | ❌ THIẾU |
| `GET /marketplace/tasks` | `marketplace/tasks.svelte` | ✅ |

### Users API (13 routes)
| Route | Frontend | Status |
|-------|----------|--------|
| `GET /users` | `users/index.svelte` | ✅ |
| `GET /users/create` | — | ❌ THIẾU |
| `POST /users` | — | ❌ THIẾU |
| `GET /users/:id` | — | ❌ THIẾU |
| `GET /users/:id/edit` | — | ❌ THIẾU |
| `PUT /users/:id` | — | ❌ THIẾU |
| `DELETE /users/:id` | — | ❌ THIẾU |
| `GET /users/pending-approval` | `users/pending_approval.svelte` | ✅ |
| `GET /profile` | `profile/show.svelte` | 🟡 LỖI |
| `GET /profile/edit` | `profile/edit.svelte` | 🟡 |
| `PUT /profile/details` | — | ❌ THIẾU form submit |
| `POST /profile/skills` | — | ❌ THIẾU |
| `GET /users/:id/profile` | `profile/view.svelte` | ✅ |

### Organizations API (12 routes)
| Route | Frontend | Status |
|-------|----------|--------|
| `GET /organizations` | `organizations/index.svelte` | ✅ |
| `POST /organizations` | — | ❌ THIẾU form |
| `GET /organizations/:id` | `organizations/show.svelte` | ✅ |
| `GET /organizations/:id/members` | `organizations/members/index.svelte` | ✅ |
| `POST /organizations/:id/members` | — | ❌ THIẾU form |
| `DELETE /organizations/:id/members/:userId` | — | ❌ THIẾU |
| `PUT /organizations/:id/members/:userId/role` | — | ❌ THIẾU |
| `GET /all-organizations` | — | ❌ THIẾU |
| `POST /organizations/:id/join` | — | ❌ THIẾU |
| `GET /organizations/:id/pending-requests` | `organizations/members/pending_requests.svelte` | ✅ |

### Notifications API (6 routes)
| Route | Frontend | Status |
|-------|----------|--------|
| `GET /notifications` | — | ❌ THIẾU page |
| `GET /notifications/latest` | header dropdown (partial) | 🟡 |
| `POST /notifications/:id/mark-as-read` | — | ❌ THIẾU |
| `POST /notifications/mark-all-as-read` | — | ❌ THIẾU |
| `DELETE /notifications/:id` | — | ❌ THIẾU |
| `DELETE /notifications` | — | ❌ THIẾU |

### Reviews API (6 routes)
| Route | Frontend | Status |
|-------|----------|--------|
| `GET /reviews/pending` | `reviews/pending.svelte` | ✅ |
| `GET /reviews/:id` | `reviews/show.svelte` | ✅ |
| `POST /reviews/:id/submit` | — | ❌ THIẾU form submit |
| `POST /reviews/:id/confirm` | — | ❌ THIẾU |
| `GET /my-reviews` | `reviews/my-reviews.svelte` | ✅ |
| `GET /users/:id/reviews` | `reviews/user-reviews.svelte` | ✅ |

---

## 🔧 Công việc cần làm (Ưu tiên)

### Ưu tiên CAO 🔴
1. **Tạo `tasks/create.svelte`** — Form tạo task (có modal hoặc page riêng)
2. **Tạo `tasks/show.svelte`** — Chi tiết task
3. **Tạo `tasks/edit.svelte`** — Form sửa task
4. **Fix `profile/show.svelte`** — Đang lỗi khi click
5. **Tạo `notifications/index.svelte`** — Trang thông báo
6. **Cập nhật sidebar** — Thêm Notifications, Reviews, Marketplace, Profile

### Ưu tiên TRUNG BÌNH 🟡
7. **Tạo `users/show.svelte`** — Chi tiết user
8. **Tạo `users/create.svelte`** — Form tạo user
9. **Tạo `users/edit.svelte`** — Form sửa user
10. **Tạo `organizations/create.svelte`** — Form tạo org
11. **Tạo `organizations/all.svelte`** — All orgs (admin view)
12. **Tạo `applications/my-applications.svelte`** — DS đơn ứng tuyển

### Ưu tiên THẤP 🟢
13. **Tạo `tasks/applications.svelte`** — DS đơn ứng tuyển 1 task
14. **Tạo `conversations/error.svelte`** — Error page cho chat
15. **Dashboard page** — Thay thế `/test` route bằng dashboard thực
16. **Favicon** — Thay favicon giả bằng logo Suar thực
17. **Workflow editor** — UI cho quản lý task workflow transitions

---

## 📊 Frontend Type Definitions Cần Bổ Sung

Hiện tại `inertia/types/inertia.ts` chỉ có types cơ bản. Cần thêm types cho:
- Task detail (show/edit)
- User detail (show/edit)
- Organization detail (show/create)
- Notification records
- Application records
- Review submit/confirm forms

---

## 🏗️ Kiến trúc Frontend Hiện Tại

```
inertia/
├── app.ts                  # Inertia app entry
├── app/                    # App config
├── components/
│   ├── layout/            # 9 layout components (sidebar, header, nav)
│   ├── ui/                # 125 shadcn-svelte UI components
│   └── navigation.svelte.ts # Sidebar navigation config
├── css/                   # Styles
├── hooks/                 # Svelte hooks
├── layouts/
│   ├── app_layout.svelte  # Main layout (sidebar + content)
│   └── auth_layout.svelte # Auth layout
├── lib/                   # Utilities
├── pages/                 # 40 page components (12+ MISSING)
│   ├── auth/              # login
│   ├── conversations/     # index, create, show + 8 components
│   ├── errors/            # 5 error pages
│   ├── marketplace/       # tasks + 4 components
│   ├── organizations/     # index, show, members + 6 components
│   ├── profile/           # show, edit, view + 7 components
│   ├── projects/          # index, create, show
│   ├── reviews/           # flagged, my-reviews, pending, show, user-reviews + 8 components
│   ├── settings/          # index + 5 tab pages + 1 component
│   ├── tasks/             # index + 30+ components (nhiều nhưng thiếu pages)
│   └── users/             # index, pending_approval + 7 components
├── stores/                # 9 stores
└── types/                 # 1 type file
```

---

## 📝 Ghi chú kỹ thuật

- **Stack**: AdonisJS v7 + Inertia.js + Svelte 5 (runes mode: `$state`, `$derived`, `$effect`)
- **UI Kit**: shadcn-svelte (125 components)
- **Routing**: Inertia renders pages via `ctx.inertia.render('page/name', { props })`
- **Data flow**: Controller → Query/Command → Repository → DB → Response → Inertia → Svelte
- **State**: Svelte stores + Inertia shared data
- **i18n**: AdonisJS i18n + frontend translation store
- **Theme**: Dark/Light mode via theme store
