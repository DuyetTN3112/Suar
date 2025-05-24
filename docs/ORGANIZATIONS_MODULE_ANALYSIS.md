# Organizations Module - CQRS Refactoring Analysis

**Date:** October 18, 2025  
**Status:** 🔄 **IN PROGRESS** - Analysis Phase  
**Module:** Organizations  

---

## 📊 Current State Analysis

### Existing Files (16 Legacy Actions)

**Write Operations (Commands):**
1. `create_organization.ts` - Tạo organization mới
2. `update_organization.ts` - Cập nhật organization
3. `delete_organization.ts` - Xóa organization
4. `add_member.ts` - Thêm member vào organization
5. `add_user_to_organization.ts` - Thêm user vào organization (duplicate?)
6. `remove_member.ts` - Xóa member
7. `update_member_role.ts` - Cập nhật role của member
8. `invite_user.ts` - Mời user vào organization
9. `create_join_request.ts` - Tạo request xin tham gia
10. `process_join_request.ts` - Xử lý (approve/reject) join request
11. `switch_organization.ts` - Switch current organization

**Read Operations (Queries):**
12. `list_organizations.ts` - Danh sách organizations của user
13. `get_organization.ts` - Chi tiết một organization
14. `get_organization_tasks.ts` - Tasks của organization
15. `get_pending_requests.ts` - Danh sách pending requests
16. `manage_members.ts` - Danh sách members (có filter?)

---

## 🎯 Refactoring Plan

### Phase 1: DTOs (Data Transfer Objects) ✅

**Create DTOs (8 files):**

1. **create_organization_dto.ts**
   - Fields: name*, slug, description, logo, website, plan
   - Validation: name (3-100 chars), slug (unique, url-safe), website (URL format)
   - Helpers: `generateSlug()`, `toObject()`

2. **update_organization_dto.ts**
   - Fields: organization_id*, name, slug, description, logo, website, plan
   - Validation: Partial update, các field optional
   - Helpers: `hasUpdates()`, `getUpdatedFields()`

3. **delete_organization_dto.ts**
   - Fields: organization_id*, permanent (boolean), reason
   - Validation: reason (nếu có, max 500 chars)
   - Helpers: `isPermanentDelete()`, `hasReason()`

4. **add_member_dto.ts**
   - Fields: organization_id*, user_id*, role_id (1-4: admin/manager/member/viewer)
   - Validation: role_id in valid range, user exists
   - Helpers: `isAdminRole()`, `isManagerRole()`, `getRoleDisplayName()`

5. **update_member_role_dto.ts**
   - Fields: organization_id*, user_id*, role_id*
   - Validation: Cannot change owner role, role_id valid
   - Helpers: `isRoleUpgrade()`, `isRoleDowngrade()`

6. **remove_member_dto.ts**
   - Fields: organization_id*, user_id*, reason
   - Validation: Cannot remove owner, reason optional
   - Helpers: `hasReason()`, `getAuditMessage()`

7. **invite_user_dto.ts**
   - Fields: organization_id*, email*, role_id, message
   - Validation: email format, role_id valid, message max 500 chars
   - Helpers: `hasCustomMessage()`, `getInvitationData()`

8. **process_join_request_dto.ts**
   - Fields: request_id*, action* (approve/reject), role_id (for approve), reason (for reject)
   - Validation: action in ['approve', 'reject'], role_id required if approve
   - Helpers: `isApprove()`, `isReject()`, `getReason()`

**Query DTOs (3 files):**

9. **get_organizations_list_dto.ts**
   - Fields: page, limit, search, status (active/inactive), plan
   - Validation: page >= 1, limit 10-100
   - Helpers: `getOffset()`, `hasFilters()`

10. **get_organization_detail_dto.ts**
    - Fields: organization_id*, include_members, include_stats, include_projects
    - Validation: organization_id exists
    - Helpers: `shouldIncludeMembers()`, `getIncludes()`

11. **get_organization_members_dto.ts**
    - Fields: organization_id*, page, limit, role_id, search, status
    - Validation: Standard pagination, role_id valid
    - Helpers: `getOffset()`, `hasFilters()`

---

### Phase 2: Commands (Write Operations) ✅

**Create Commands (11 files):**

1. **create_organization_command.ts**
   - Business Rules:
     - Any authenticated user can create organization
     - Creator becomes owner (owner_id)
     - MySQL trigger auto adds owner to organization_users with role_id=1
     - Slug auto-generated if not provided
     - Audit log creation
   - Permissions: Authenticated user
   - Transaction: Yes (create org + verify trigger + audit)

2. **update_organization_command.ts**
   - Business Rules:
     - Only owner or admin can update
     - Track field changes for audit
     - Row-level lock during update
   - Permissions: owner_id OR role_id IN (1,2)
   - Transaction: Yes

3. **delete_organization_command.ts**
   - Business Rules:
     - Only owner can delete
     - Soft delete by default (deleted_at)
     - Cannot delete if has active projects/tasks
     - Permanent delete option for superadmin only
   - Permissions: owner_id ONLY
   - Transaction: Yes

4. **add_member_command.ts**
   - Business Rules:
     - Only owner/admin can add members
     - User must not already be member
     - Send notification to invited user
     - Default role: member (3)
   - Permissions: owner OR role_id IN (1,2)
   - Transaction: Yes

5. **update_member_role_command.ts**
   - Business Rules:
     - Only owner/admin can update roles
     - Cannot change owner's role
     - Cannot promote to owner (only one owner)
     - Admin can only update roles <= their own level
     - Send notification to affected user
   - Permissions: Complex (owner OR admin with constraints)
   - Transaction: Yes

6. **remove_member_command.ts**
   - Business Rules:
     - Only owner/admin can remove
     - Cannot remove owner
     - Tasks assigned to removed user → reassign to manager/owner
     - Send notification
   - Permissions: owner OR role_id=1
   - Transaction: Yes

7. **invite_user_command.ts**
   - Business Rules:
     - Only owner/admin can invite
     - Create invitation record with token
     - Send email with invitation link
     - Invitation expires after 7 days
   - Permissions: owner OR role_id IN (1,2)
   - Transaction: Yes

8. **create_join_request_command.ts**
   - Business Rules:
     - Any authenticated user can request
     - Cannot request if already member
     - Cannot have duplicate pending request
     - Auto-reject if blacklisted
   - Permissions: Authenticated user
   - Transaction: Yes

9. **process_join_request_command.ts**
   - Business Rules:
     - Only owner/admin can process
     - Request must be 'pending'
     - On approve: add to organization_users
     - On reject: update status + reason
     - Send notification to requester
   - Permissions: owner OR role_id IN (1,2)
   - Transaction: Yes

10. **switch_organization_command.ts**
    - Business Rules:
      - User must be member of target organization
      - Update user's current_organization_id
      - Log activity
    - Permissions: Member of organization
    - Transaction: No (simple update)

11. **manage_members_command.ts** (DEPRECATED?)
    - Note: Có vẻ đây là Query, không phải Command
    - Action: Review và move sang Queries nếu đúng

---

### Phase 3: Queries (Read Operations) ✅

**Create Queries (6 files):**

1. **get_organizations_list_query.ts**
   - Features:
     - User scope: only orgs where user is member
     - Pagination support
     - Search by name/description
     - Filter by status, plan
     - Include member count, project count
     - Sort by name, created_at, member_count
   - Cache: 5 minutes
   - Permissions: Authenticated user (only own orgs)

2. **get_organization_detail_query.ts**
   - Features:
     - Full organization data
     - Optional includes: members, stats, projects, owner info
     - Permission flags for current user
     - Recent activity
   - Cache: 2 minutes
   - Permissions: Member of organization

3. **get_organization_members_query.ts**
   - Features:
     - Paginated member list
     - Filter by role, status, search
     - Include user details, joined_at, task count
     - Sort by name, role, joined_at, task_count
   - Cache: 3 minutes
   - Permissions: Member of organization

4. **get_organization_tasks_query.ts**
   - Features:
     - All tasks in organization
     - Filter by status, priority, assignee, project
     - Pagination
     - Include task stats (by status, overdue, etc.)
   - Cache: 2 minutes
   - Permissions: Member of organization

5. **get_pending_requests_query.ts**
   - Features:
     - List all pending join requests for organization
     - Include requester info
     - Sort by created_at (oldest first)
     - Pagination
   - Cache: 1 minute (fresh data needed)
   - Permissions: owner OR role_id IN (1,2)

6. **get_organization_metadata_query.ts** (NEW)
   - Features:
     - Dropdown data for forms
     - Available roles
     - Organization plans
     - Organization stats summary
   - Cache: 10 minutes
   - Permissions: Member of organization

---

## 📐 Database Schema Reference

### Organizations Table
- id (PK)
- name (string, unique)
- slug (string, unique, indexed)
- description (text, nullable)
- logo (string, nullable)
- website (string, nullable)
- plan (string: free/basic/pro/enterprise)
- owner_id (FK → users.id)
- created_at, updated_at, deleted_at

### Organization_Users Table (Members)
- id (PK)
- organization_id (FK → organizations.id)
- user_id (FK → users.id)
- role_id (1=admin, 2=manager, 3=member, 4=viewer)
- status (enum: pending/approved/rejected)
- joined_at (timestamp)
- created_at, updated_at

### Organization_Invitations Table
- id (PK)
- organization_id (FK)
- inviter_id (FK → users.id)
- email (string)
- token (string, unique)
- role_id (default: 3)
- message (text, nullable)
- status (enum: pending/accepted/rejected/expired)
- expires_at (timestamp)
- created_at, updated_at

### Organization_Join_Requests Table
- id (PK)
- organization_id (FK)
- user_id (FK → users.id)
- status (enum: pending/approved/rejected)
- message (text, nullable)
- processed_by (FK → users.id, nullable)
- processed_at (timestamp, nullable)
- rejection_reason (text, nullable)
- created_at, updated_at

---

## 🔐 Permission Matrix

| Action | Owner | Admin | Manager | Member | Viewer |
|--------|-------|-------|---------|--------|--------|
| **Organizations** |
| Create | ✅ Any | ✅ Any | ✅ Any | ✅ Any | ✅ Any |
| View Detail | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Members** |
| View List | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add Member | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update Role | ✅ | ✅* | ❌ | ❌ | ❌ |
| Remove Member | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Invitations** |
| Send Invite | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cancel Invite | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Join Requests** |
| Create Request | ✅ Any | ✅ Any | ✅ Any | ✅ Any | ✅ Any |
| View Requests | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve/Reject | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Tasks** |
| View All | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Projects** |
| View All | ✅ | ✅ | ✅ | ✅ | ✅ |

*Admin can only update roles up to their own level (cannot promote to admin)

---

## 📁 Proposed Structure

```
app/actions/organizations/
├── dtos/                                    # 11 DTOs
│   ├── create_organization_dto.ts           # 120 lines
│   ├── update_organization_dto.ts           # 140 lines
│   ├── delete_organization_dto.ts           # 70 lines
│   ├── add_member_dto.ts                    # 100 lines
│   ├── update_member_role_dto.ts            # 110 lines
│   ├── remove_member_dto.ts                 # 90 lines
│   ├── invite_user_dto.ts                   # 130 lines
│   ├── process_join_request_dto.ts          # 100 lines
│   ├── get_organizations_list_dto.ts        # 200 lines
│   ├── get_organization_detail_dto.ts       # 120 lines
│   ├── get_organization_members_dto.ts      # 180 lines
│   └── index.ts                             # Exports
├── commands/                                # 10 Commands
│   ├── create_organization_command.ts       # 150 lines
│   ├── update_organization_command.ts       # 180 lines
│   ├── delete_organization_command.ts       # 140 lines
│   ├── add_member_command.ts                # 160 lines
│   ├── update_member_role_command.ts        # 200 lines
│   ├── remove_member_command.ts             # 170 lines
│   ├── invite_user_command.ts               # 180 lines
│   ├── create_join_request_command.ts       # 140 lines
│   ├── process_join_request_command.ts      # 190 lines
│   ├── switch_organization_command.ts       # 100 lines
│   └── index.ts                             # Exports
└── queries/                                 # 6 Queries
    ├── get_organizations_list_query.ts      # 280 lines
    ├── get_organization_detail_query.ts     # 260 lines
    ├── get_organization_members_query.ts    # 240 lines
    ├── get_organization_tasks_query.ts      # 220 lines
    ├── get_pending_requests_query.ts        # 180 lines
    ├── get_organization_metadata_query.ts   # 150 lines
    └── index.ts                             # Exports

app/controllers/organizations/
├── organizations_controller.ts              # Refactored với CQRS
├── members_controller.ts                    # Refactored với CQRS
└── join_requests_controller.ts              # New controller
```

**Estimated Total:**
- DTOs: ~1,460 lines (11 files)
- Commands: ~1,710 lines (10 files)
- Queries: ~1,330 lines (6 files)
- **Total: ~4,500 lines** of new CQRS code

---

## 🎯 Key Decisions

### 1. Merge or Keep Separate?
- **add_member.ts** vs **add_user_to_organization.ts**
  - Decision: MERGE → `add_member_command.ts` (same functionality)
  
- **manage_members.ts**
  - Decision: MOVE to Queries → `get_organization_members_query.ts`

### 2. New Features to Add
- **Invitations System**: Create proper invitation flow
- **Join Requests**: Formalize request approval process
- **Role Hierarchy**: Enforce strict role permissions
- **Audit Logging**: Track all member changes
- **Notifications**: Notify users on role changes, approvals, etc.

### 3. Soft Delete Strategy
- Organizations: Soft delete (can restore)
- Members: Hard delete (clean removal)
- Invitations: Soft delete (track history)
- Join Requests: Keep history (never delete)

---

## ✅ Implementation Order

1. **Phase 1: DTOs** (Day 1 - 3 hours)
   - Create all 11 DTOs with validation
   - Test validation rules
   
2. **Phase 2: Commands** (Day 1-2 - 5 hours)
   - Implement 10 Commands with transactions
   - Add permission checks
   - Add audit logging
   
3. **Phase 3: Queries** (Day 2 - 3 hours)
   - Implement 6 Queries with caching
   - Add permission filters
   - Add pagination
   
4. **Phase 4: Controllers** (Day 2 - 2 hours)
   - Refactor 3 controllers
   - Wire up DTOs, Commands, Queries
   
5. **Phase 5: Cleanup** (Day 3 - 1 hour)
   - Delete 16 legacy action files
   - Update imports in controllers
   - Run tests

**Total Estimate: 2-3 days**

---

## 🚀 Ready to Start?

Bạn muốn bắt đầu với Phase nào?
1. **Phase 1: DTOs** - Tạo tất cả DTOs với validation
2. **Phase 2: Commands** - Implement write operations
3. **Phase 3: Queries** - Implement read operations

Hoặc bạn muốn em phân tích thêm chi tiết về một phần cụ thể nào không? 😊
