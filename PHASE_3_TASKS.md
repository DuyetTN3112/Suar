# Phase 3: Công việc cần hoàn thành

**Tài liệu này là bản tóm tắt từ USER_ADMIN_ORG_SEPARATION_PLAN.md**  
**Cập nhật:** 2026-03-24  
**Trạng thái:** Phase 1 & 2 DONE ✅ | Phase 3 IN PROGRESS ⚠️

---

## 🎯 Mục tiêu Phase 3

Hoàn thiện tích hợp giữa backend và frontend để hệ thống Admin & Organization hoạt động đầy đủ.

---

## 🔴 CRITICAL - Cần làm ngay

### 1. Permission & Security

- [ ] **Ẩn menu "Người dùng" cho user thường**
  - File: `inertia/components/navigation.svelte.ts`
  - Thêm conditional: `if (user.system_role === 'system_admin' || 'superadmin')`

- [ ] **Verify route protection**
  - `/admin/*` routes: Check middleware chain
  - `/org/*` routes: Check middleware chain

- [ ] **Fix Users Page (từ ISSUES.md - P0)**
  - Fix `[object Object]` in search input
  - Disable auto-popup on page load
  - Fix popup cascade
  - Fix infinite loading

### 2. Backend Actions Implementation

**Admin:**
- [ ] `ListUsersQuery`: Add filters (role, status, search)
- [ ] `UpdateUserSystemRoleCommand`: Role change logic
- [ ] `SuspendUserCommand`: Suspend logic
- [ ] `ListAuditLogsQuery`: MongoDB query
- [ ] `ListOrganizationsQuery`: Bypass membership
- [ ] `ListFlaggedReviewsQuery`: Query flagged reviews

**Organization:**
- [ ] `ListOrganizationMembersQuery`: Complete
- [ ] `InviteMemberCommand`: Invitation logic
- [ ] `RemoveMemberCommand`: Remove logic
- [ ] `UpdateMemberRoleCommand`: Role change
- [ ] `ApproveJoinRequestCommand`: Approval logic

### 3. Frontend Data Wiring

**Admin Pages:**
- [ ] `admin/dashboard.svelte` → Connect to backend
- [ ] `admin/users/index.svelte` → Wire filters, actions
- [ ] `admin/audit_logs/index.svelte` → Wire query
- [ ] `admin/organizations/index.svelte` → Wire query

**Org Pages:**
- [ ] `org/dashboard.svelte` → Connect to backend
- [ ] `org/members/index.svelte` → Wire all actions
- [ ] `org/invitations/index.svelte` → Wire query
- [ ] `org/settings/index.svelte` → Wire settings

---

## 🟡 MEDIUM - Cần làm sau

### 4. Context Switching UI

- [ ] **Admin Mode Toggle**
  - Create: `inertia/components/layout/admin_mode_toggle.svelte`
  - Add to: `nav_user.svelte`
  - Endpoint: POST `/admin/toggle-mode`

- [ ] **Org Switcher Enhancement**
  - Update: `team_switcher.svelte`
  - Show role badge
  - Auto-redirect based on role

### 5. UX Improvements

- [ ] Add breadcrumbs
- [ ] Add loading states
- [ ] Add empty states
- [ ] Add error handling

---

## 🟢 LOW - Future enhancements

### 6. Additional Features

- [ ] Subscription management UI
- [ ] QR Code generator
- [ ] Advanced analytics
- [ ] Export CSV functionality

---

## 📝 Checklist nhanh (Tuần tới)

**Week 1: Backend (5 ngày)**
- [ ] Day 1-2: Admin user management actions
- [ ] Day 3: Admin audit logs & orgs actions
- [ ] Day 4-5: Org member management actions

**Week 2: Frontend (5 ngày)**
- [ ] Day 6-7: Wire all admin pages
- [ ] Day 8-9: Wire all org pages
- [ ] Day 10: Permissions & bug fixes

**Week 3: Testing (3 ngày)**
- [ ] Day 11-12: Manual testing all flows
- [ ] Day 13: Documentation & deployment prep

---

## 📊 Progress Tracking

- **Phase 1 (Backend Foundation):** ✅ 100% DONE
- **Phase 2 (Frontend Foundation):** ✅ 100% DONE
- **Phase 3 (Integration):** ⚠️ 10% DONE
  - Backend actions: 20% (structure done, logic needed)
  - Frontend wiring: 0% (UI done, data needed)
  - Permissions: 30% (middleware done, UI checks needed)

---

## 🚨 Blockers hiện tại

1. **Backend actions chưa implement logic** → Cần hoàn thành queries/commands
2. **Frontend pages chưa có data** → Cần wire backend
3. **Permission checks thiếu ở UI** → Cần add conditional rendering
4. **Users page có critical bugs** → Cần fix ngay (từ ISSUES.md)

---

## 📞 Next Actions (Ngày mai)

1. ✅ Review & cập nhật document này
2. 🔴 Implement `ListUsersQuery` với filters
3. 🔴 Fix Users page critical bugs
4. 🔴 Wire admin/users page với backend
5. 🟡 Test permission checks

---

**Ghi chú:** Tài liệu đầy đủ xem tại `USER_ADMIN_ORG_SEPARATION_PLAN.md`
