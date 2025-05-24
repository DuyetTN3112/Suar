# Tasks Module - CQRS Refactoring Analysis

## Overview

Phân tích chi tiết Tasks Module để chuẩn bị refactoring sang CQRS pattern. Module này phức tạp hơn Projects Module với nhiều tính năng nâng cao như time tracking, subtasks, task versions, và phân quyền chi tiết.

## Current Structure

### 1. Controllers (2 files - Inconsistent naming)

#### TasksController (`app/controllers/tasks/tasks_controller.ts`) - 370 lines
**Routes & Methods:**
- `index()` - List tasks với permissions và metadata
- `create()` - Hiển thị form tạo task
- `store()` - Lưu task mới
- `show()` - Chi tiết task với permissions
- `edit()` - Form edit task
- `update()` - Cập nhật task
- `updateTime()` - Cập nhật thời gian thực tế
- `destroy()` - Xóa task (soft delete)
- `getAuditLogs()` - Lấy audit logs của task
- `updateStatus()` - API: Cập nhật status
- `checkCreatePermission()` - API: Kiểm tra quyền tạo task

**Issues:**
- Controller quá dài (370 lines)
- Trực tiếp gọi actions thay vì Commands/Queries
- Logic phân quyền rải rác
- Xử lý Inertia request khác nhau (X-Inertia header check)
- Method formatChanges() nên ở utility

#### TaskController (singular) (`app/controllers/tasks/task_controller.ts`) - 237 lines
**Routes & Methods:**
- `index()` - List tasks (duplicate với TasksController)
- `show()` - Chi tiết task
- `create()` - Form tạo task
- `store()` - Lưu task mới (duplicate)
- `edit()` - Form edit (incomplete trong code đọc)
- `update()` - Cập nhật task (incomplete trong code đọc)

**Issues:**
- Duplicate routes với TasksController
- Controller naming inconsistent (singular vs plural)
- Một số methods sử dụng stored procedure (`getUserTasks`)
- Truy vấn database trực tiếp trong controller

**Recommendation:** Consolidate hai controllers thành một TasksController (plural) duy nhất.

---

### 2. Actions (14 files - Complex)

#### Write Operations (4 files)

**a) CreateTask** (`create_task.ts` - 110 lines)
- Input: TaskData (title, description, status_id, label_id, priority_id, assigned_to, due_date, parent_task_id, estimated_time, actual_time, organization_id)
- Business Logic:
  - Kiểm tra organization_id từ session (required)
  - Set creator_id từ auth.user
  - Gửi notification khi assign task
  - Ghi audit log
- Return: Task object

**b) UpdateTask** (`update_task.ts` - 167 lines)
- Input: id, TaskData (partial)
- Business Logic:
  - Kiểm tra task thuộc organization hiện tại
  - Check permission: creator/assignee/admin có quyền update
  - Track old values để audit
  - Gửi notification khi:
    - Assigned_to thay đổi → notify assignee mới
    - Status thay đổi → notify creator
  - Load full relations sau update
- Permission Logic:
  - Creator or assignee: full access
  - Admin/Superadmin: full access
  - Owner/Manager trong organization: limited access (không rõ specifics)
- Return: Task với full relations

**c) UpdateTaskTime** (`update_task_time.ts` - ?)
- Input: id, actualTime
- Logic: Update actual_time field
- Simple operation

**d) DeleteTask** (`delete_task.ts` - 128 lines)
- Input: id
- Business Logic:
  - Check delete permission
  - Soft delete (set deleted_at)
  - Ghi audit log
  - Notify assignee và creator
- Permission Logic:
  - Admin/Superadmin: có thể xóa nếu thuộc organization
  - Creator: có thể xóa task của mình
  - Manager trong organization: có thể xóa
- Return: { success, message }

#### Read Operations (10 files)

**a) ListTasksWithPermissions** (`list_tasks_with_permissions.ts` - 95 lines)
- Features:
  - Pagination (page, limit)
  - Filters: status, priority, label, assigned_to, parent_task_id, search, organization_id
  - Permission-based filtering
  - Empty response if no organization
- Permission Logic:
  - Admin: Xem tất cả tasks trong organization
  - Org Admin (role 1,2): Xem tất cả tasks trong organization
  - Member: Chỉ xem tasks mình tạo hoặc được assign
- Dependencies: list_tasks_helpers.ts
- Return: PaginatedResponse<Task>

**b) ListTasks** (`list_tasks.ts` - ?)
- Tương tự ListTasksWithPermissions nhưng không có permission check?
- Có thể là legacy code

**c) GetTaskWithPermissions** (`get_task_with_permissions.ts` - 63 lines)
- Input: id
- Features:
  - Load full relations: status, label, priority, assignee, creator, parentTask, childTasks, versions
  - Comments (commented out - chưa có model)
- Permission Logic:
  - Admin: Xem tất cả
  - User: Chỉ xem task được assign
- Return: Task object

**d) GetTask** (`get_task.ts` - ?)
- Tương tự GetTaskWithPermissions nhưng không có permission check?

**e) GetTaskMetadata** (`get_task_metadata.ts` - ?)
- Return: Metadata cho forms (statuses, labels, priorities, users, parent tasks)
- Used in create/edit forms

**f) GetTaskStatistics** (`get_task_statistics.ts` - ?)
- Analytics/metrics cho tasks
- Không rõ chi tiết

**g) GetUserTasks** (`get_user_tasks.ts` - ?)
- Lấy tasks của user hiện tại
- Có thể sử dụng stored procedure

#### Helper Files (3 files)

**list_tasks_helpers.ts** (~100 lines)
- `checkUserPermissions()` - Check admin & org role
- `createBaseTaskQuery()` - Base query với organization_id
- `applyTaskFilters()` - Apply filters (status, priority, label, assigned_to, parent_task_id, search)
- `applyTaskRelations()` - Preload all relations

**list_tasks_helpers.js** (legacy?)
- JavaScript version, should be deleted

**list_tasks_types.ts**
- TypeScript types: FilterOptions, PaginatedResponse, TaskPaginator, AuthUser

---

### 3. Model (Task)

**Fields:**
- `id` - Primary key
- `title` - string (max 255)
- `description` - text (optional)
- `status_id` - Foreign key to TaskStatus (required)
- `label_id` - Foreign key to TaskLabel (optional)
- `priority_id` - Foreign key to TaskPriority (optional)
- `assigned_to` - Foreign key to User (optional)
- `creator_id` - Foreign key to User (required)
- `updated_by` - Foreign key to User (optional)
- `due_date` - DateTime (optional)
- `estimated_time` - number (hours, default 0)
- `actual_time` - number (hours, default 0)
- `organization_id` - Foreign key to Organization (required)
- `project_id` - Foreign key to Project (optional)
- `parent_task_id` - Foreign key to Task (optional, self-referential)
- `created_at` - DateTime
- `updated_at` - DateTime
- `deleted_at` - DateTime (soft delete)

**Relations:**
- `status` - BelongsTo TaskStatus
- `label` - BelongsTo TaskLabel
- `priority` - BelongsTo TaskPriority
- `assignee` - BelongsTo User
- `creator` - BelongsTo User
- `updater` - BelongsTo User
- `organization` - BelongsTo Organization
- `project` - BelongsTo Project
- `parentTask` - BelongsTo Task (self)
- `childTasks` - HasMany Task (self)
- `versions` - HasMany TaskVersion (history)

**Complexity:**
- More complex than Project model
- Time tracking (estimated_time, actual_time)
- Hierarchical structure (parent_task_id, childTasks)
- Version history (TaskVersion)
- 3 users: creator, assignee, updater

---

### 4. Validators (`app/validators/task.ts`)

**Validators defined:**
1. `createTaskValidator` - For creating tasks
2. `updateTaskValidator` - For updating tasks
3. `updateTaskStatusValidator` - For status updates
4. `updateTaskTimeValidator` - For time updates
5. `taskFilterValidator` - For list filtering

**Issues:**
- VineJS validators không được sử dụng trong actions
- Actions validate data manually
- Validators có thể được tích hợp vào DTOs

---

## Business Rules & Permissions

### Create Task
- **Required:** title, status_id, organization_id (from session)
- **Defaults:** creator_id = current user
- **Permissions:** 
  - Superadmin/Admin: Can create
  - Check via `checkCreatePermission()` method
- **Notifications:** Notify assignee khi task được assign

### Update Task
- **Permissions:**
  - Creator: Full access
  - Assignee: Full access
  - Admin/Superadmin: Full access
  - Org Owner/Manager: Partial access (cần xác định rõ)
- **Validation:** Task phải thuộc organization hiện tại
- **Notifications:**
  - Assigned_to changed → Notify new assignee
  - Status changed → Notify creator
- **Audit:** Track old/new values

### Delete Task
- **Type:** Soft delete (set deleted_at)
- **Permissions:**
  - Admin/Superadmin: Nếu thuộc organization
  - Creator: Can delete own tasks
  - Org Manager: Can delete (cần xác định rõ)
- **Notifications:** Notify assignee và creator
- **Audit:** Log old values

### View Tasks (List)
- **Filtering:**
  - By organization (required)
  - By status, priority, label, assigned_to, parent_task_id
  - Search (title, description, id)
  - Pagination
- **Permissions:**
  - Admin: All tasks in organization
  - Org Admin (role 1,2): All tasks in organization
  - Member: Only created or assigned tasks
- **Empty if:** No organization selected

### View Task (Detail)
- **Permissions:**
  - Admin: All tasks
  - User: Only assigned tasks
- **Includes:** Full relations, child tasks, versions

### Update Status
- **API endpoint:** Cập nhật status_id
- **Set:** updated_by = current user
- **Notifications:** Notify creator if status changed

### Update Time
- **Simple:** Update actual_time field
- **Permissions:** Likely same as update task

---

## Technical Observations

### Strengths
- Notification system tích hợp tốt
- Audit logging đầy đủ (old/new values)
- Permission logic khá chi tiết
- Helper functions tách biệt tốt
- Type definitions rõ ràng

### Issues & Code Smells
1. **Duplicate Controllers:** TasksController vs TaskController
2. **Duplicate Actions:** ListTasks vs ListTasksWithPermissions, GetTask vs GetTaskWithPermissions
3. **Inconsistent Permission Logic:** Rải rác giữa actions và controllers
4. **No Caching:** Không có Redis cache cho list/detail
5. **Manual Validation:** Không sử dụng VineJS validators đã define
6. **Stored Procedures:** GetUserTasks có thể dùng stored procedure
7. **Direct DB Access:** Some actions query db directly thay vì dùng models
8. **Complex Controller Methods:** Xử lý nhiều logic trong controllers
9. **Inertia Handling:** Special cases cho X-Inertia header scattered
10. **Helper File Duplication:** .js và .ts versions

### Performance Concerns
- List queries có thể chậm với organization lớn (no caching)
- Multiple preload relations có thể gây N+1 queries
- No pagination limit validation
- GetTaskMetadata load all data every time

---

## Refactoring Plan

### Phase 1: DTOs (Estimated 8 files)

1. **CreateTaskDTO**
   - Fields: title, description, status_id, label_id, priority_id, assigned_to, due_date, parent_task_id, estimated_time, actual_time
   - Validation: title (required, 3-255), status_id (required), organization_id (from session), due_date (future?)
   - Defaults: estimated_time=0, actual_time=0

2. **UpdateTaskDTO**
   - Fields: Partial của CreateTaskDTO + updated_by
   - Methods: hasUpdates(), getUpdatedFields(), hasStatusChange(), hasAssigneeChange()
   - Change tracking for audit

3. **DeleteTaskDTO**
   - Fields: id, reason (optional)
   - Methods: getReason(), getAuditMessage()

4. **AssignTaskDTO**
   - Fields: task_id, assigned_to, notify (default true)
   - Validation: user exists, in organization

5. **UpdateTaskStatusDTO**
   - Fields: task_id, status_id
   - Validation: status exists, status transition rules?

6. **UpdateTaskTimeDTO**
   - Fields: task_id, actual_time, estimated_time (optional)
   - Validation: positive numbers

7. **GetTasksListDTO**
   - Fields: page, limit, status, priority, label, assigned_to, parent_task_id, search, organization_id
   - Defaults: page=1, limit=10

8. **GetTaskDetailDTO**
   - Fields: task_id, include_versions, include_child_tasks
   - Defaults: include_versions=true, include_child_tasks=true

### Phase 2: Commands (Estimated 7 files)

1. **CreateTaskCommand extends BaseCommand**
   - Input: CreateTaskDTO
   - Logic:
     - Validate organization_id
     - Set creator_id
     - Create task
     - Send notification if assigned
     - Audit log
   - Transaction: Yes
   - Return: Task

2. **UpdateTaskCommand extends BaseCommand**
   - Input: UpdateTaskDTO
   - Logic:
     - Load task with forUpdate()
     - Check organization
     - Check permission (creator/assignee/admin/org-manager)
     - Track old values
     - Merge updates
     - Send notifications (assignee/status change)
     - Audit log
   - Transaction: Yes
   - Return: Task with relations

3. **DeleteTaskCommand extends BaseCommand**
   - Input: DeleteTaskDTO
   - Logic:
     - Check permission (admin/creator/org-manager)
     - Soft delete (set deleted_at)
     - Notify assignee & creator
     - Audit log
   - Transaction: Yes
   - Return: { success, message }

4. **AssignTaskCommand extends BaseCommand**
   - Input: AssignTaskDTO
   - Logic:
     - Validate user in organization
     - Update assigned_to
     - Send notification
     - Audit log
   - Transaction: Yes
   - Return: Task

5. **UpdateTaskStatusCommand extends BaseCommand**
   - Input: UpdateTaskStatusDTO
   - Logic:
     - Validate status transition (if rules exist)
     - Update status_id and updated_by
     - Notify creator
     - Audit log
   - Transaction: Yes
   - Return: Task

6. **UpdateTaskTimeCommand extends BaseCommand**
   - Input: UpdateTaskTimeDTO
   - Logic:
     - Update estimated_time/actual_time
     - Audit log
   - Transaction: No (simple update)
   - Return: Task

7. **BulkUpdateTasksCommand extends BaseCommand** (optional)
   - Input: task_ids[], updates
   - Logic: Update multiple tasks at once
   - Transaction: Yes
   - Return: Updated count

### Phase 3: Queries (Estimated 6 files)

1. **GetTasksListQuery extends BaseQuery**
   - Input: GetTasksListDTO
   - Logic:
     - Check organization_id
     - Apply permission filters (admin/org-admin/member)
     - Apply filters (status, priority, label, assigned_to, parent_task_id, search)
     - Preload relations
     - Pagination
   - Caching: 3 minutes (key: org:tasks:list:{org_id}:{filters_hash})
   - Return: PaginatedResponse<Task>

2. **GetTaskDetailQuery extends BaseQuery**
   - Input: GetTaskDetailDTO
   - Logic:
     - Check permission (admin/assignee)
     - Load task with full relations
     - Load child tasks (if requested)
     - Load versions (if requested)
     - Load audit logs (last 20)
   - Caching: 5 minutes (key: task:detail:{id})
   - Return: Task with relations + permissions

3. **GetTaskMetadataQuery extends BaseQuery**
   - Input: organization_id (optional)
   - Logic:
     - Load all statuses
     - Load all labels
     - Load all priorities
     - Load organization users
     - Load parent tasks (không có subtasks)
   - Caching: 10 minutes (key: org:task:metadata:{org_id})
   - Return: { statuses, labels, priorities, users, tasks }

4. **GetTaskAuditLogsQuery extends BaseQuery**
   - Input: task_id, limit (default 20)
   - Logic:
     - Query audit_logs by entity_type='task', entity_id
     - Preload user
     - Format changes
   - Caching: 2 minutes (key: task:audit:{id})
   - Return: AuditLog[]

5. **GetTaskStatisticsQuery extends BaseQuery**
   - Input: organization_id, filters (date range, assignee, status)
   - Logic:
     - Count by status
     - Count by priority
     - Count by label
     - Overdue count
     - Avg completion time
     - Time tracking stats
   - Caching: 5 minutes (key: org:task:stats:{org_id})
   - Return: Statistics object

6. **GetUserTasksQuery extends BaseQuery**
   - Input: user_id, filters (status, date range)
   - Logic:
     - Get tasks created by or assigned to user
     - Filter by status, dates
     - Preload relations
     - Pagination
   - Caching: 3 minutes (key: user:tasks:{user_id}:{filters_hash})
   - Return: PaginatedResponse<Task>

### Phase 4: Controller Refactoring

**Consolidate to ONE TasksController:**
- Routes: /tasks (index, create, store, show, edit, update, destroy)
- API routes: /api/tasks/status (updateStatus), /api/tasks/time (updateTime), /api/tasks/audit-logs (getAuditLogs)
- Target: < 200 lines
- Helper methods: buildListDTO(), buildCreateDTO(), buildUpdateDTO()
- Remove Inertia special handling (use standard patterns)

**Methods:**
1. `index()` → GetTasksListQuery
2. `create()` → GetTaskMetadataQuery
3. `store()` → CreateTaskCommand
4. `show()` → GetTaskDetailQuery
5. `edit()` → GetTaskDetailQuery + GetTaskMetadataQuery
6. `update()` → UpdateTaskCommand
7. `destroy()` → DeleteTaskCommand
8. `updateStatus()` → UpdateTaskStatusCommand
9. `updateTime()` → UpdateTaskTimeCommand
10. `getAuditLogs()` → GetTaskAuditLogsQuery

### Phase 5: Cleanup

**Delete Legacy Files (14 files):**
1. app/actions/tasks/create_task.ts
2. app/actions/tasks/update_task.ts
3. app/actions/tasks/update_task_time.ts
4. app/actions/tasks/delete_task.ts
5. app/actions/tasks/list_tasks.ts
6. app/actions/tasks/list_tasks_with_permissions.ts
7. app/actions/tasks/get_task.ts
8. app/actions/tasks/get_task_with_permissions.ts
9. app/actions/tasks/get_task_metadata.ts
10. app/actions/tasks/get_task_statistics.ts
11. app/actions/tasks/get_user_tasks.ts
12. app/actions/tasks/list_tasks_helpers.js (JavaScript version)
13. app/actions/tasks/list_tasks_helpers.ts (move utils to Commands/Queries)
14. app/actions/tasks/list_tasks_types.ts (move to DTOs folder)

**Delete Duplicate Controller:**
- app/controllers/tasks/task_controller.ts (singular)

**Keep Validators:**
- app/validators/task.ts (integrate into DTOs)

---

## Comparison with Projects Module

| Feature | Projects Module | Tasks Module | Complexity |
|---------|----------------|--------------|------------|
| Controllers | 1 (180 lines) | 2 (607 lines) | +237% |
| Actions | 3 legacy files | 14 files | +367% |
| Model Fields | ~10 core fields | ~16 core fields | +60% |
| Relations | 5 relations | 11 relations | +120% |
| DTOs Needed | 5 DTOs | 8 DTOs | +60% |
| Commands Needed | 5 Commands | 7 Commands | +40% |
| Queries Needed | 3 Queries | 6 Queries | +100% |
| Permissions | Simple (owner/creator) | Complex (creator/assignee/admin/org-role) | +200% |
| Notifications | None | 4 types | N/A |
| Time Tracking | No | Yes (estimated/actual) | N/A |
| Subtasks | No | Yes (parent_task_id) | N/A |
| Versioning | No | Yes (TaskVersion) | N/A |
| Audit Logs | Basic | Detailed (old/new values) | +100% |

**Estimated Effort:**
- Projects Module: ~15 hours total
- Tasks Module: ~25-30 hours total (2x complexity)

---

## Next Steps

1. ✅ Complete this analysis document
2. ⏳ Create DTOs (8 files, ~900 lines estimated)
3. ⏳ Create Commands (7 files, ~1,200 lines estimated)
4. ⏳ Create Queries (6 files, ~1,400 lines estimated)
5. ⏳ Refactor controllers (consolidate to 1 file, <200 lines)
6. ⏳ Delete legacy code (15 files)
7. ⏳ Write documentation
8. ⏳ Test thoroughly (unit + integration)

---

## Notes

- Tasks module là module phức tạp nhất đến giờ
- Permission logic rất chi tiết, cần test kỹ
- Notification system phải maintain
- Caching strategy quan trọng cho performance
- Time tracking feature cần validation cẩn thận
- Subtasks relationship cần handle recursive queries
- TaskVersion history cần decide keep or migrate

**Estimated Total Lines:** ~3,500 lines new code (vs Projects ~1,900 lines)

---

**Created:** 2024
**Author:** CQRS Refactoring Team
**Status:** Analysis Complete ✅
