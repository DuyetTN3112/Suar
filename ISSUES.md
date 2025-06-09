# SUAR Platform - Issues & Fixes Tracker

Generated: 2026-03-19

## 🔴 CRITICAL - P0 (Block toàn page/tính năng)

### 1. ✅ Users Page - [object Object] + Auto-popups Cascade
**Issue:** Khi vào `/users`:
- Input search hiển thị `[object Object]`
- Auto-popup "Thêm người dùng vào tổ chức" ngay khi load page
- Tắt popup này → xuất hiện popup phê duyệt
- Tắt popup phê duyệt → xuất hiện popup xóa "unknown"
- Infinite loading spinner

**Files:**
- `inertia/pages/users/index.svelte`
- `inertia/pages/users/components/AddUserModal.svelte`
- Các modal/dialog components

**Fix:**
- [ ] Remove [object Object] - fix toString() issue
- [ ] Disable auto-popup on page load
- [ ] Fix popup cascade (event propagation issue)
- [ ] Fix loading state
- [ ] Add permission check: Hide Users menu for normal users

---

### 2. ✅ Sidebar Org Selector - "Không có tổ chức" Error
**Issue:**
- Hiển thị "Không có tổ chức" với text màu đỏ
- Backend không trả organizations cho user
- Position: "Suar" text và org name cần swap

**Files:**
- `inertia/components/layout/team_switcher.svelte`
- Backend: Middleware hoặc controller trả props

**Fix:**
- [ ] Backend: Include organizations in user props
- [ ] Swap position: Org name trước, "Suar" text sau (hoặc remove "Suar")
- [ ] Hiển thị project name nếu có

---

## 🟠 HIGH - P1 (UX impact cao)

### 3. ✅ Notification Button - Static (không mở dropdown)
**Issue:** Click Bell icon không có phản ứng gì

**Files:**
- `inertia/components/layout/nav_bar.svelte`

**Fix:**
- [ ] Add DropdownMenu wrapper cho Bell icon
- [ ] Create notification list component
- [ ] Show empty state nếu không có notifications

---

### 4. ✅ Sidebar Text - "Nhiệm vụ" → "Tasks"
**Issue:** Translation không đúng

**Files:**
- `inertia/components/navigation.svelte.ts`

**Fix:**
- [ ] Change "Nhiệm vụ" → "Tasks"

---

## 🟡 MEDIUM - P2 (UX improvements)

### 5. ✅ Kanban Board - Missing Jira-like UX
**Issue:** Kanban thiếu các tính năng như Jira:
- Không có "+ Create task" ở cuối mỗi column
- Không có "+" button để tạo status mới
- Không có hover edit cho status name
- Button "Tạo mới" ở header không hoạt động

**Files:**
- `inertia/pages/tasks/components/views/kanban/`
- `kanban_column.svelte`
- `kanban_board.svelte`

**Fix:**
- [ ] Add "+ Create task" button at bottom of each column (mờ mờ, như Jira)
- [ ] Add "+" icon next to status titles
- [ ] Add hover edit for status names
- [ ] Fix/remove header "Tạo mới" button

---

### 6. ✅ Task Code Format - TASK-xxx → PROJECT-xxx
**Issue:** 
- Hiện tại: `TASK-{uuid}`
- Jira style: `PROJECT-123` (short, auto-increment, contains project code)

**Files:**
- Backend: Task model/migration
- Display: `inertia/pages/tasks/components/task_list/task_list_row.svelte`

**Fix:**
- [ ] Backend: Add `task_number` field (auto-increment per project)
- [ ] Backend: Add project `code` field (e.g., "DTC" for Dragon Tech Corp)
- [ ] Update task display: Show `{project.code}-{task_number}`
- [ ] Migration to populate existing tasks

---

## 🟢 LOW - P3 (Cleanup/Tech debt)

### 7. ✅ Remove Conversations/Messages Module
**Issue:** Không còn cần tính năng chat, quá phức tạp

**Files:**
- Backend: `app/models/conversation.ts`, `app/models/message.ts`
- Backend: `app/controllers/conversations/`
- Backend: `app/actions/conversations/`
- Routes: `start/routes/` (conversations routes)
- Frontend: `inertia/pages/conversations/`
- Seed: `commands/seed_data.ts`

**Fix:**
- [ ] Remove backend models
- [ ] Remove backend controllers/actions
- [ ] Remove routes
- [ ] Remove frontend pages/components
- [ ] Remove from seed data
- [ ] Create migration to drop tables
- [ ] Create command to clean existing data

---

## 📋 Additional Issues from Screenshots

### Profile Page Issues
From new screenshots:

**Stats Cards:**
- Kỹ năng: 7 (0 đã được đánh giá) - OK
- Điểm trung bình: 0.0% (Dựa trên đánh giá) - Need real data
- Uy tín: N/A (Chưa xác định) - Need calculation logic
- Thành viên từ: N/A - Should show user.created_at

**Profile Card:**
- Shows: "Chưa có điểm uy tín" - OK for now
- Organization: "Dragon Tech Corp" - Good!

**Action Items:**
- [ ] Calculate trust score (uy tín)
- [ ] Show member since date
- [ ] Calculate average rating from reviews

---

## 🎯 Execution Order

1. **P0-1: Users page** - Fix [object Object] + popups (30 min)
2. **P0-2: Sidebar org** - Backend + frontend (20 min)
3. **P1-3: Notification** - Add dropdown (15 min)
4. **P1-4: Sidebar text** - Quick change (2 min)
5. **P2-5: Kanban UX** - Add Jira features (45 min)
6. **P2-6: Task code** - Backend + migration (30 min)
7. **P3-7: Remove conversations** - Full cleanup (60 min)

Total estimated time: ~3.5 hours

---

## ✅ Completed Issues

- MongoDB persistent volume
- Session fix with organization
- UI improvements (menu consolidation, logout confirm)
- Task list shows project name
- Notification icon added (static)
