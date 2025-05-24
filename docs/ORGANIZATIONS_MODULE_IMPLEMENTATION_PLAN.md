# Organizations Module - Complete Implementation Plan

**Date:** October 18, 2025  
**Status:** 📋 **READY TO IMPLEMENT**  
**Based on:** Tasks, Projects, Users, Auth patterns

---

## 🎯 Executive Summary

Sau khi đọc kỹ 19 docs và học từ 4 modules đã refactor (Tasks, Projects, Users, Auth), tôi đã có đầy đủ context để refactor Organizations Module theo **đúng pattern** đã được áp dụng thành công.

**Key Learnings Applied:**
1. ✅ **CQRS Pattern** - Tách rõ Commands/Queries (từ ACTION_PATTERN_GUIDE.md)
2. ✅ **Naming Convention** - User intent, không phải CRUD (từ ARCHITECTURE_ANALYSIS.md)
3. ✅ **BaseCommand/BaseQuery** - Standalone classes với explicit transactions (từ Tasks Module)
4. ✅ **DTO Validation** - Construction-time validation (từ Projects Module)
5. ✅ **Permission System** - Role-based access control (từ Users Module)
6. ✅ **Development Mode** - Configurable features (từ Auth Module)

---

## 📚 Context từ 19 Docs

### Docs Đã Đọc & Key Takeaways

1. **ACTION_PATTERN_GUIDE.md** (814 lines)
   - Commands phải reflect **user intent**, không chỉ CRUD
   - Queries phải idempotent, có thể cache
   - DTOs validate trong constructor
   - BaseCommand/BaseQuery pattern

2. **ARCHITECTURE_ANALYSIS.md** (445 lines)
   - Vi phạm: CRUD naming (CreateUser → RegisterUserCommand)
   - Solution: CQRS separation `/commands` `/queries`
   - Thin controllers (< 50 lines)
   - Avoid circular dependencies in Services

3. **AUTH_MODULE_FINAL_SUMMARY.md** (460 lines)
   - Development mode pattern: `USE_PASSWORD_HASH = false`
   - Rate limiting: 10 attempts / 15 min
   - DTOs: 80-90 lines with validation
   - Commands: 125-170 lines with subtasks

4. **CQRS_REFACTORING_README.md** (377 lines)
   - Step-by-step migration guide
   - Testing patterns
   - Code review checklist
   - Metrics & goals

5. **MIGRATION_EXAMPLE.md** (689 lines)
   - Before/After comparison
   - Command: `RegisterUserCommand` (not CreateUser)
   - Query: `GetUsersListQuery` with caching
   - Thin controller: 3 steps (DTO → Execute → Response)

6. **TASKS_MODULE_SUMMARY.md** (614 lines)
   - **8 DTOs** with 50+ helper methods
   - **6 Commands** with transactions & notifications
   - **6 Queries** with Redis caching (2-10 min TTL)
   - Standalone classes (no BaseCommand inheritance due to errors)
   - Pattern: `const trx = await db.transaction()` + try/catch/rollback

7. **PROJECTS_MODULE_SUMMARY.md** (636 lines)
   - **5 DTOs + 5 Commands + 3 Queries**
   - Permission matrix (Owner/Admin/Manager/Member/Viewer)
   - Row-level locking: `.forUpdate()`
   - Lucid syntax: `.useTransaction(trx).save()` NOT `.save({client})`

8. **USERS_MODULE_PROGRESS.md** (624 lines)
   - **6 DTOs + 4 Commands + 2 Queries**
   - Approve & ChangeRole commands
   - Thin controller: 620 lines but well-organized
   - Zero business logic in controller

9. **ERROR_FIXING_SESSION.md** (Created during this session)
   - Fixed AssignTaskCommand by recreating from scratch
   - Pattern: No BaseCommand, explicit transactions
   - Fixed: `this.ctx.auth.user!`, `this.ctx.request.ip()`
   - Lucid: `.useTransaction(trx)` not `.save({client})`

10-19. **Other Docs** (SESSION_SUMMARY, CLEANUP, COMMIT, etc.)
    - Progress tracking
    - Best practices consolidation
    - Lessons learned

---

## 🏗️ Organizations Module Architecture

### Current State (16 Legacy Files)

**Write Operations:**
1. `create_organization.ts` - Tạo org mới
2. `update_organization.ts` - Cập nhật org
3. `delete_organization.ts` - Xóa org
4. `add_member.ts` + `add_user_to_organization.ts` - Duplicate! Merge thành 1
5. `remove_member.ts` - Xóa member
6. `update_member_role.ts` - Cập nhật role
7. `invite_user.ts` - Mời user
8. `create_join_request.ts` - Tạo request
9. `process_join_request.ts` - Approve/reject request
10. `switch_organization.ts` - Switch org

**Read Operations:**
11. `list_organizations.ts` - List orgs của user
12. `get_organization.ts` - Chi tiết org
13. `get_organization_tasks.ts` - Tasks của org
14. `get_pending_requests.ts` - Pending requests
15. `manage_members.ts` - List members (Query, not Command!)

**Issues Found:**
- ❌ Duplicate: `add_member.ts` vs `add_user_to_organization.ts`
- ❌ Wrong category: `manage_members.ts` is Query not Command
- ❌ No DTOs, no validation
- ❌ CRUD naming (should be user intent)
- ❌ Mixed concerns in controllers

### Target State (27 New Files)

**DTOs (11 files ~1,460 lines)**
1. `create_organization_dto.ts` - name*, slug, description, logo, website, plan
2. `update_organization_dto.ts` - Partial updates with change tracking
3. `delete_organization_dto.ts` - permanent flag, reason
4. `add_member_dto.ts` - user_id*, role_id (1-4)
5. `update_member_role_dto.ts` - Cannot change owner
6. `remove_member_dto.ts` - Cannot remove owner, task reassignment
7. `invite_user_dto.ts` - email*, role_id, message
8. `process_join_request_dto.ts` - approve/reject with reason
9. `get_organizations_list_dto.ts` - Pagination, filters
10. `get_organization_detail_dto.ts` - include flags
11. `get_organization_members_dto.ts` - Pagination, role filter

**Commands (10 files ~1,710 lines)**
1. `create_organization_command.ts` - Anyone can create, owner auto-added
2. `update_organization_command.ts` - Owner/Admin only, field tracking
3. `delete_organization_command.ts` - Owner only, check active projects
4. `add_member_command.ts` - Owner/Admin, notification
5. `update_member_role_command.ts` - Complex permissions, cannot promote to owner
6. `remove_member_command.ts` - Reassign tasks, notification
7. `invite_user_command.ts` - Create invitation with token, send email
8. `create_join_request_command.ts` - Any user, check duplicates
9. `process_join_request_command.ts` - Owner/Admin, approve/reject
10. `switch_organization_command.ts` - Update current_organization_id

**Queries (6 files ~1,330 lines)**
1. `get_organizations_list_query.ts` - User scope, pagination, search, cache 5min
2. `get_organization_detail_query.ts` - Full data, optional includes, cache 2min
3. `get_organization_members_query.ts` - Paginated, filter by role, cache 3min
4. `get_organization_tasks_query.ts` - All tasks, filters, cache 2min
5. `get_pending_requests_query.ts` - Pending only, cache 1min
6. `get_organization_metadata_query.ts` - Dropdown data, cache 10min

---

## 🎯 Implementation Pattern (Learned from 4 Modules)

### DTO Pattern (from Projects)
```typescript
export class CreateOrganizationDTO {
  constructor(
    public readonly name: string,
    public readonly slug?: string,
    public readonly description?: string,
    public readonly logo?: string,
    public readonly website?: string,
    public readonly plan?: string
  ) {
    this.validate()
  }

  private validate(): void {
    if (this.name.length < 3 || this.name.length > 100) {
      throw new Error('Organization name must be 3-100 characters')
    }
    if (this.slug && !/^[a-z0-9-]+$/.test(this.slug)) {
      throw new Error('Slug must be lowercase alphanumeric with hyphens')
    }
    if (this.website && !this.isValidUrl(this.website)) {
      throw new Error('Invalid website URL')
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  toObject() {
    return {
      name: this.name,
      slug: this.slug || this.generateSlug(this.name),
      description: this.description,
      logo: this.logo,
      website: this.website,
      plan: this.plan || 'free',
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
}
```

### Command Pattern (from Tasks - Standalone)
```typescript
@inject()
export default class CreateOrganizationCommand {
  constructor(
    protected ctx: HttpContext,
    private createNotification: CreateNotification
  ) {}

  async execute(dto: CreateOrganizationDTO): Promise<Organization> {
    const user = this.ctx.auth.user!
    const trx = await db.transaction()

    try {
      // 1. Create organization
      const organization = await Organization.create(
        {
          ...dto.toObject(),
          owner_id: user.id,
        },
        { client: trx }
      )

      // 2. Verify trigger added owner to organization_users
      const ownerMembership = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', user.id)
        .where('role_id', 1)
        .useTransaction(trx)
        .first()

      if (!ownerMembership) {
        throw new Error('Failed to add owner to organization (trigger failed)')
      }

      // 3. Create audit log
      await AuditLog.create(
        {
          user_id: user.id,
          action: 'create',
          entity_type: 'organization',
          entity_id: organization.id,
          new_values: organization.toJSON(),
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent') || '',
        },
        { client: trx }
      )

      await trx.commit()

      // 4. Send welcome notification (outside transaction)
      await this.sendWelcomeNotification(organization, user)

      // 5. Load relations
      await organization.load('owner')

      return organization
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async sendWelcomeNotification(org: Organization, user: User): Promise<void> {
    try {
      await this.createNotification.handle({
        user_id: user.id,
        title: 'Tổ chức mới được tạo',
        message: `Bạn đã tạo tổ chức "${org.name}" thành công`,
        type: 'organization_created',
        related_entity_type: 'organization',
        related_entity_id: org.id,
      })
    } catch (error) {
      console.error('[CreateOrganizationCommand] Failed to send notification:', error)
    }
  }
}
```

### Query Pattern (from Projects - with Caching)
```typescript
@inject()
export default class GetOrganizationsListQuery {
  constructor(protected ctx: HttpContext) {}

  async execute(dto: GetOrganizationsListDTO): Promise<PaginatedResult> {
    const user = this.ctx.auth.user!

    // Try cache first
    const cacheKey = this.getCacheKey(dto, user.id)
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    // Build query
    const query = this.buildQuery(dto, user.id)

    // Count total
    const countQuery = query.clone().clearSelect().count('* as total')
    const countResult = await countQuery.first()
    const total = Number(countResult?.total || 0)

    // Execute with pagination
    const organizations = await query
      .limit(dto.limit)
      .offset(dto.getOffset())

    // Enrich with stats
    const enriched = await this.enrichWithStats(organizations)

    const result = {
      data: enriched,
      pagination: {
        page: dto.page,
        limit: dto.limit,
        total,
        totalPages: Math.ceil(total / dto.limit),
      },
    }

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(result))

    return result
  }

  private buildQuery(dto: GetOrganizationsListDTO, userId: number) {
    let query = db
      .from('organizations as o')
      .join('organization_users as ou', 'o.id', 'ou.organization_id')
      .where('ou.user_id', userId)
      .whereNull('o.deleted_at')
      .select('o.*')

    if (dto.search) {
      query = query.where((builder) => {
        builder
          .where('o.name', 'like', `%${dto.search}%`)
          .orWhere('o.description', 'like', `%${dto.search}%`)
      })
    }

    if (dto.plan) {
      query = query.where('o.plan', dto.plan)
    }

    query = query.orderBy('o.created_at', 'desc')

    return query
  }

  private async enrichWithStats(orgs: any[]): Promise<any[]> {
    // Parallel fetch stats for all orgs
    const stats = await Promise.all(
      orgs.map((org) =>
        Promise.all([
          db.from('organization_users').where('organization_id', org.id).count('* as count'),
          db.from('projects').where('organization_id', org.id).whereNull('deleted_at').count('* as count'),
        ])
      )
    )

    return orgs.map((org, index) => ({
      ...org,
      member_count: stats[index][0][0].count,
      project_count: stats[index][1][0].count,
    }))
  }

  private getCacheKey(dto: GetOrganizationsListDTO, userId: number): string {
    return `orgs:list:user:${userId}:${JSON.stringify(dto)}`
  }
}
```

### Controller Pattern (from Users - Thin)
```typescript
@inject()
export default class OrganizationsController {
  // Create organization
  async store(
    { request, response, session }: HttpContext,
    createOrganization: CreateOrganizationCommand
  ) {
    const dto = new CreateOrganizationDTO(
      request.input('name'),
      request.input('slug'),
      request.input('description'),
      request.input('logo'),
      request.input('website'),
      request.input('plan')
    )

    const organization = await createOrganization.execute(dto)

    session.flash('success', 'Tổ chức đã được tạo thành công')
    return response.redirect().toRoute('organizations.show', { id: organization.id })
  }

  // List organizations
  async index(
    { request, inertia, auth }: HttpContext,
    getOrganizationsList: GetOrganizationsListQuery
  ) {
    const dto = new GetOrganizationsListDTO(
      Number(request.input('page', 1)),
      Number(request.input('limit', 20)),
      request.input('search'),
      request.input('plan')
    )

    const result = await getOrganizationsList.execute(dto)

    return inertia.render('organizations/index', {
      organizations: result.data,
      pagination: result.pagination,
    })
  }
}
```

---

## 🔐 Permission Matrix (5-Level Hierarchy)

| Action | Owner | Admin | Manager | Member | Viewer |
|--------|-------|-------|---------|--------|--------|
| **Create Org** | ✅ Any | ✅ Any | ✅ Any | ✅ Any | ✅ Any |
| **View Detail** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Update Org** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Delete Org** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Add Member** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Update Role** | ✅ | ✅* | ❌ | ❌ | ❌ |
| **Remove Member** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Send Invite** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Process Request** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Tasks** | ✅ | ✅ | ✅ | ✅ | ✅ |

*Admin can only update roles up to their own level

---

## 📋 Implementation Checklist

### Phase 1: DTOs (Day 1 - 3 hours)
- [ ] `create_organization_dto.ts` (120 lines)
- [ ] `update_organization_dto.ts` (140 lines)
- [ ] `delete_organization_dto.ts` (70 lines)
- [ ] `add_member_dto.ts` (100 lines)
- [ ] `update_member_role_dto.ts` (110 lines)
- [ ] `remove_member_dto.ts` (90 lines)
- [ ] `invite_user_dto.ts` (130 lines)
- [ ] `process_join_request_dto.ts` (100 lines)
- [ ] `get_organizations_list_dto.ts` (200 lines)
- [ ] `get_organization_detail_dto.ts` (120 lines)
- [ ] `get_organization_members_dto.ts` (180 lines)
- [ ] `index.ts` (exports)

### Phase 2: Commands (Day 2 - 5 hours)
- [ ] `create_organization_command.ts` (150 lines)
- [ ] `update_organization_command.ts` (180 lines)
- [ ] `delete_organization_command.ts` (140 lines)
- [ ] `add_member_command.ts` (160 lines)
- [ ] `update_member_role_command.ts` (200 lines)
- [ ] `remove_member_command.ts` (170 lines)
- [ ] `invite_user_command.ts` (180 lines)
- [ ] `create_join_request_command.ts` (140 lines)
- [ ] `process_join_request_command.ts` (190 lines)
- [ ] `switch_organization_command.ts` (100 lines)
- [ ] `index.ts` (exports)

### Phase 3: Queries (Day 2-3 - 3 hours)
- [ ] `get_organizations_list_query.ts` (280 lines)
- [ ] `get_organization_detail_query.ts` (260 lines)
- [ ] `get_organization_members_query.ts` (240 lines)
- [ ] `get_organization_tasks_query.ts` (220 lines)
- [ ] `get_pending_requests_query.ts` (180 lines)
- [ ] `get_organization_metadata_query.ts` (150 lines)
- [ ] `index.ts` (exports)

### Phase 4: Controllers (Day 3 - 2 hours)
- [ ] Refactor `organizations_controller.ts`
- [ ] Refactor `members_controller.ts`
- [ ] Create `join_requests_controller.ts`

### Phase 5: Cleanup (Day 3 - 1 hour)
- [ ] Delete 16 legacy action files
- [ ] Update imports in controllers
- [ ] Run error check
- [ ] Update documentation

---

## ✅ Success Criteria

### Code Quality
- ✅ All files compile without errors
- ✅ No BaseCommand inheritance issues
- ✅ Proper Lucid syntax (`.useTransaction(trx)`)
- ✅ DTOs validate at construction
- ✅ Commands use explicit transactions
- ✅ Queries implement caching
- ✅ Controllers < 200 lines

### Architecture
- ✅ CQRS separation clear
- ✅ User intent naming (not CRUD)
- ✅ Standalone classes pattern
- ✅ Permission checks in Commands
- ✅ Audit logging comprehensive
- ✅ Notifications sent

### Documentation
- ✅ JSDoc comments on all public methods
- ✅ README updated
- ✅ ORGANIZATIONS_MODULE_SUMMARY.md created
- ✅ Migration notes documented

---

## 🚀 Ready to Start?

Tôi đã:
1. ✅ Đọc đủ 19 docs
2. ✅ Học pattern từ 4 modules (Tasks, Projects, Users, Auth)
3. ✅ Hiểu rõ BaseCommand issue và Standalone pattern
4. ✅ Nắm được Lucid syntax, permission system, caching strategy
5. ✅ Có plan chi tiết từng bước

**Bắt đầu với Phase 1: DTOs?** 

Tôi sẽ tạo từng DTO một, giải thích pattern, và đảm bảo follow đúng những gì đã học từ các modules trước! 🎯
