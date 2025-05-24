# Projects Module - CQRS Refactoring Analysis

**Date:** October 18, 2025  
**Status:** 🔍 Analysis Phase  
**Priority:** HIGH (Core Business Logic)

---

## 📊 Current Structure

### Controllers (1 file)
```
app/controllers/projects/
└── projects_controller.ts (206 lines)
    ├── index()      - List projects (GET /projects)
    ├── create()     - Show create form (GET /projects/create)
    ├── store()      - Create project (POST /projects)
    ├── show()       - Project details (GET /projects/:id)
    ├── destroy()    - Delete project (DELETE /projects/:id)
    └── addMember()  - Add member (POST /projects/members)
```

### Legacy Actions (3 files) - TO DELETE
```
app/actions/projects/
├── create_project.ts (62 lines)
│   └── Uses stored procedure: create_project(...)
├── delete_project.ts (57 lines)
│   └── Uses stored procedure: delete_project(...)
└── add_project_member.ts (60 lines)
    └── Uses stored procedure: add_project_member(...)

Total: ~179 lines to refactor
```

### Model Structure
```typescript
Project {
  // Core Fields
  id, name, description, organization_id
  creator_id, manager_id, owner_id
  status_id, visibility (public/private/team)
  start_date, end_date, budget
  created_at, updated_at, deleted_at
  
  // Relations
  @belongsTo creator: User
  @belongsTo manager: User
  @belongsTo owner: User
  @belongsTo organization: Organization
  @hasMany tasks: Task[]
  @manyToMany members: User[] (pivot: project_members)
}
```

### Routes
```typescript
GET    /projects              - List projects
GET    /projects/create       - Show create form
POST   /projects              - Create project
GET    /projects/:id          - Show project detail
DELETE /projects/:id          - Delete project
POST   /projects/members      - Add member to project
```

---

## 🎯 Refactoring Plan

### Phase 1: DTOs (5 files)

#### 1. `create_project_dto.ts`
```typescript
class CreateProjectDTO {
  name: string                    // Required, 3-100 chars
  description?: string            // Optional, max 1000 chars
  organization_id: number         // Required
  status_id?: number             // Optional, default 1 (pending)
  start_date?: DateTime          // Optional
  end_date?: DateTime            // Optional, must be after start_date
  manager_id?: number            // Optional, defaults to creator
  visibility: 'public' | 'private' | 'team' // Default 'team'
  budget?: number                // Optional, must be >= 0
}
```

**Validation Rules:**
- Name: 3-100 chars, alphanumeric + spaces
- Description: Max 1000 chars
- End date must be after start date if both provided
- Budget must be positive if provided
- Organization must exist and user must be superadmin

#### 2. `update_project_dto.ts`
```typescript
class UpdateProjectDTO {
  project_id: number             // Required
  name?: string                  // Same validation as create
  description?: string
  status_id?: number
  start_date?: DateTime
  end_date?: DateTime
  manager_id?: number
  visibility?: 'public' | 'private' | 'team'
  budget?: number
}
```

#### 3. `delete_project_dto.ts`
```typescript
class DeleteProjectDTO {
  project_id: number             // Required
  reason?: string                // Optional, for audit log
  permanent?: boolean            // Soft delete vs permanent
}
```

#### 4. `add_project_member_dto.ts`
```typescript
class AddProjectMemberDTO {
  project_id: number             // Required
  user_id: number                // Required
  role?: string                  // Default 'member' (member/lead/viewer)
}
```

**Validation:**
- User must be in same organization
- User not already a member
- Requester must be superadmin or project owner

#### 5. `remove_project_member_dto.ts`
```typescript
class RemoveProjectMemberDTO {
  project_id: number             // Required
  user_id: number                // Required
  reason?: string                // Optional, for audit
}
```

---

### Phase 2: Commands (5 files)

#### 1. `create_project_command.ts` (~150 lines)
**Purpose:** Create new project with validation

**Flow:**
```typescript
1. Validate DTO (name, dates, organization)
2. Check user is superadmin of organization
3. Begin transaction
4. Create project record
5. Add creator as first member (role: owner)
6. Create initial project status entry
7. Audit log: "Created project {name}"
8. Commit transaction
9. Return project with relations
```

**Business Rules:**
- Only superadmins can create projects
- Creator automatically becomes first member
- Default status: 'pending' (id: 1)
- Default visibility: 'team'
- Manager defaults to creator if not specified

**Dependencies:**
- Organization service (check superadmin)
- AuditLog service
- Transaction support

#### 2. `update_project_command.ts` (~140 lines)
**Purpose:** Update project details

**Flow:**
```typescript
1. Validate DTO
2. Load project with lock
3. Check permissions (owner/superadmin/manager)
4. Validate date logic (end > start)
5. Update fields (only provided ones)
6. Audit log: "Updated project {field}: {old} -> {new}"
7. Return updated project
```

**Permissions:**
- Owner: Can update everything
- Superadmin: Can update everything
- Manager: Can update description, dates, status

#### 3. `delete_project_command.ts` (~100 lines)
**Purpose:** Soft delete project

**Flow:**
```typescript
1. Validate DTO
2. Load project
3. Check permissions (owner/superadmin only)
4. Begin transaction
5. Check if has active tasks (warn if yes)
6. Set deleted_at = now()
7. Audit log: "Deleted project {name}"
8. Commit transaction
```

**Business Rules:**
- Soft delete by default (set deleted_at)
- Can't delete if has incomplete tasks (warn user)
- Only owner or superadmin can delete

#### 4. `add_project_member_command.ts` (~130 lines)
**Purpose:** Add member to project

**Flow:**
```typescript
1. Validate DTO
2. Load project and user
3. Check requester permissions (owner/superadmin)
4. Check user in same organization
5. Check user not already member
6. Insert into project_members pivot table
7. Send notification to added user
8. Audit log: "Added {user} to project"
9. Return member info
```

**Pivot Table Fields:**
```typescript
project_members {
  project_id, user_id
  role: 'owner' | 'lead' | 'member' | 'viewer'
  created_at
}
```

#### 5. `remove_project_member_command.ts` (~110 lines)
**Purpose:** Remove member from project

**Flow:**
```typescript
1. Validate DTO
2. Check permissions
3. Check not removing owner (prevent)
4. Delete from project_members
5. Reassign their tasks to manager
6. Audit log: "Removed {user} from project"
```

**Business Rules:**
- Can't remove owner
- Can't remove last superadmin
- Tasks reassigned to manager

---

### Phase 3: Queries (3 files)

#### 1. `get_projects_list_query.ts` (~160 lines)
**Purpose:** Paginated list with filters

**Features:**
- **Pagination:** Page, limit
- **Filters:**
  - organization_id
  - status_id
  - creator_id
  - manager_id
  - visibility
  - date_range (start/end)
- **Search:** name, description
- **Sorting:** created_at, name, start_date, end_date
- **User Scope:** Only show projects where user is creator/manager/member

**Query Structure:**
```sql
SELECT p.*, ps.name as status_name, o.name as org_name,
       u1.full_name as creator_name, u2.full_name as manager_name,
       COUNT(t.id) as task_count,
       COUNT(pm.user_id) as member_count
FROM projects p
LEFT JOIN project_status ps ON p.status_id = ps.id
LEFT JOIN organizations o ON p.organization_id = o.id
LEFT JOIN users u1 ON p.creator_id = u1.id
LEFT JOIN users u2 ON p.manager_id = u2.id
LEFT JOIN tasks t ON p.id = t.project_id AND t.deleted_at IS NULL
LEFT JOIN project_members pm ON p.id = pm.project_id
WHERE p.deleted_at IS NULL
  AND (p.creator_id = ? OR p.manager_id = ? OR pm.user_id = ?)
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT ? OFFSET ?
```

**Return:**
```typescript
{
  data: Project[],
  pagination: {
    page, limit, total, totalPages
  },
  filters: { applied filters },
  stats: {
    total_projects,
    active_projects,
    completed_projects
  }
}
```

#### 2. `get_project_detail_query.ts` (~140 lines)
**Purpose:** Full project details with relations

**Includes:**
- Project info
- Creator, manager, owner details
- Organization info
- Status info
- Members list (with roles, avatars)
- Tasks summary (count by status)
- Recent activity (last 10 events)
- User permissions (isOwner, isManager, isMember, canEdit, canDelete)

**Caching:** 5 minutes (invalidate on update)

**Return:**
```typescript
{
  project: Project,
  members: Array<{
    user_id, full_name, email, avatar_url, role,
    joined_at, task_count
  }>,
  tasks_summary: {
    total, pending, in_progress, completed, overdue
  },
  recent_activity: AuditLog[],
  permissions: {
    isOwner, isManager, isMember,
    canEdit, canDelete, canAddMembers
  }
}
```

#### 3. `get_project_members_query.ts` (~100 lines)
**Purpose:** List project members with details

**Features:**
- Pagination
- Filter by role
- Search by name/email
- Include task count per member
- Include last activity date

**Return:**
```typescript
{
  data: Array<{
    user_id, full_name, email, avatar_url,
    role, joined_at, task_count, last_active_at
  }>,
  pagination: { page, limit, total }
}
```

---

### Phase 4: Controller Refactoring

#### Before (projects_controller.ts - 206 lines)
```typescript
// PROBLEMS:
❌ 206 lines - too fat
❌ Direct DB queries in controller
❌ Complex permission logic inline
❌ No caching
❌ No proper error handling
❌ Uses stored procedures (not portable)
❌ Manual session flash messages
```

#### After (projects_controller.ts - ~120 lines)
```typescript
// IMPROVED:
✅ Thin controller (orchestrator only)
✅ Uses Commands/Queries
✅ Centralized error handling
✅ Type-safe DTOs
✅ Proper validation
✅ Audit logging in Commands
✅ Cacheable queries
✅ Testable

Methods to refactor:
1. index()      → GetProjectsListQuery
2. create()     → Keep as-is (just renders form)
3. store()      → CreateProjectCommand
4. show()       → GetProjectDetailQuery
5. destroy()    → DeleteProjectCommand
6. addMember()  → AddProjectMemberCommand
```

**New Controller Structure:**
```typescript
class ProjectsController {
  async index({ inertia, auth, request }: HttpContext) {
    const dto = this.buildListDTO(request)
    const result = await new GetProjectsListQuery(ctx).handle(dto)
    return inertia.render('projects/index', result)
  }
  
  async store({ request, response, session }: HttpContext) {
    const dto = this.buildCreateDTO(request)
    const project = await new CreateProjectCommand(ctx).handle(dto)
    session.flash('success', 'Dự án đã được tạo thành công')
    return response.redirect().toRoute('projects.show', { id: project.id })
  }
  
  // ... similar pattern for other methods
  
  private buildCreateDTO(request: any): CreateProjectDTO {
    return new CreateProjectDTO({
      name: request.input('name'),
      description: request.input('description'),
      // ... map all fields
    })
  }
}
```

---

## 📈 Estimated Impact

### Code Quality
- **Before:** 206 lines controller + 179 lines actions = 385 lines
- **After:** 120 lines controller + 550 lines (Commands) + 400 lines (Queries) + 250 lines (DTOs) = 1,320 lines
- **Net Change:** +935 lines (+243%)
- **Quality Score:** +85% (separation of concerns, testability, maintainability)

### Performance
- ✅ **Caching:** Queries support Redis caching (5-15 min TTL)
- ✅ **Query Optimization:** Proper indexes, eager loading
- ✅ **Transaction Safety:** Commands use DB transactions
- ⚠️ **Stored Procedures:** Remove dependency (portability)

### Testability
- ✅ Commands: 100% testable in isolation
- ✅ Queries: 100% testable with mock DB
- ✅ DTOs: Validation testable
- ✅ Controllers: Thin, easy to test

### Security
- ✅ **Validation:** All DTOs validate at construction
- ✅ **Permissions:** Commands check permissions
- ✅ **Audit Log:** All mutations logged
- ✅ **SQL Injection:** Protected by Lucid ORM
- ✅ **Rate Limiting:** Can add to Commands

---

## 🚧 Challenges & Solutions

### Challenge 1: Stored Procedures
**Problem:** Current code uses MySQL stored procedures:
- `create_project()`
- `delete_project()`
- `add_project_member()`

**Solution:** Replace with Lucid ORM + Transactions
```typescript
// Instead of:
await db.rawQuery('CALL create_project(...)', [params])

// Use:
await db.transaction(async (trx) => {
  const project = await Project.create({ ... }, { client: trx })
  await project.related('members').attach([userId], trx)
  // ... more operations
})
```

**Benefits:**
- Database agnostic (PostgreSQL, SQLite)
- Type-safe
- Easier to test
- Better error handling

### Challenge 2: Complex Permissions
**Problem:** Permission logic scattered across controller:
```typescript
const isMember = await db.query()...
const isCreator = project.creator_id === user.id
const isManager = project.manager_id === user.id
if (!isMember && !isCreator && !isManager) { ... }
```

**Solution:** Centralize in `ProjectPermissionService`:
```typescript
class ProjectPermissionService {
  async checkPermission(user: User, project: Project, action: string): Promise<boolean>
  async getUserRole(user: User, project: Project): Promise<Role>
  canEdit(user: User, project: Project): boolean
  canDelete(user: User, project: Project): boolean
}
```

Use in Commands:
```typescript
if (!this.permissionService.canEdit(user, project)) {
  throw new ForbiddenException('No permission to edit project')
}
```

### Challenge 3: Member Management
**Problem:** Current `add_project_member` uses stored procedure with complex checks

**Solution:** Create `ProjectMemberService`:
```typescript
class ProjectMemberService {
  async addMember(project: Project, user: User, role: string, addedBy: User)
  async removeMember(project: Project, user: User, removedBy: User)
  async updateRole(project: Project, user: User, newRole: string)
  async isMember(project: Project, user: User): Promise<boolean>
}
```

---

## 📋 Implementation Checklist

### Phase 1: Foundation (2-3 hours)
- [ ] Create `app/actions/projects/dtos/` folder
- [ ] Create 5 DTOs with validation
- [ ] Create `index.ts` for exports
- [ ] Test DTO validation

### Phase 2: Commands (4-5 hours)
- [ ] Create `app/actions/projects/commands/` folder
- [ ] Implement CreateProjectCommand
- [ ] Implement UpdateProjectCommand
- [ ] Implement DeleteProjectCommand
- [ ] Implement AddProjectMemberCommand
- [ ] Implement RemoveProjectMemberCommand
- [ ] Create `index.ts` for exports
- [ ] Remove stored procedure dependencies
- [ ] Test all Commands

### Phase 3: Queries (3-4 hours)
- [ ] Create `app/actions/projects/queries/` folder
- [ ] Implement GetProjectsListQuery
- [ ] Implement GetProjectDetailQuery
- [ ] Implement GetProjectMembersQuery
- [ ] Add caching layer
- [ ] Create `index.ts` for exports
- [ ] Test all Queries

### Phase 4: Controller (2-3 hours)
- [ ] Refactor `index()` method
- [ ] Refactor `store()` method
- [ ] Refactor `show()` method
- [ ] Refactor `destroy()` method
- [ ] Refactor `addMember()` method
- [ ] Add helper methods for DTO building
- [ ] Test all controller methods

### Phase 5: Cleanup (1-2 hours)
- [ ] Delete `create_project.ts`
- [ ] Delete `delete_project.ts`
- [ ] Delete `add_project_member.ts`
- [ ] Remove empty folders
- [ ] Check for compilation errors
- [ ] Update routes (if needed)
- [ ] Create migration documentation

### Phase 6: Documentation (1 hour)
- [ ] Create `PROJECTS_MODULE_SUMMARY.md`
- [ ] Document API changes
- [ ] Create migration guide
- [ ] Update main TODO list

---

## 🎯 Success Criteria

### Functional Requirements
- ✅ All existing features work identically
- ✅ No breaking changes to API
- ✅ All routes return same data structure
- ✅ Session flash messages work

### Non-Functional Requirements
- ✅ Code coverage > 80%
- ✅ Zero compilation errors
- ✅ Performance >= current (no regressions)
- ✅ All queries optimized with proper indexes

### Quality Requirements
- ✅ All DTOs validate input
- ✅ All Commands log to audit trail
- ✅ All Queries support caching
- ✅ Controller methods < 50 lines each

---

## 📊 Statistics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Files** | 4 | 17 | +325% |
| **Lines of Code** | 385 | ~1,320 | +243% |
| **Controller Size** | 206 lines | ~120 lines | -42% |
| **Business Logic in Controller** | ❌ Yes | ✅ No | N/A |
| **Test Coverage** | 0% | 80%+ | +80% |
| **Stored Procedures** | ❌ 3 | ✅ 0 | -100% |
| **Database Agnostic** | ❌ No | ✅ Yes | N/A |

---

## 🚀 Next Steps

1. **Create DTOs first** (foundation)
2. **Implement Commands** (business logic)
3. **Implement Queries** (data retrieval)
4. **Refactor Controller** (orchestration)
5. **Delete legacy code** (cleanup)
6. **Write tests** (validation)
7. **Document changes** (knowledge transfer)

**Estimated Total Time:** 13-18 hours

**Priority:** HIGH - Core business functionality
**Risk Level:** MEDIUM - Complex permissions, stored procedures
**Dependencies:** None (Auth & Users modules complete)

---

**Ready to start Phase 1: DTOs? 🎯**
