# authorization Backend Module

### Kiến trúc lõi & Phân tích nghiệp vụ
- **Role Separation**: Phân tách nghiêm ngặt 3 loại role:
  1. *Authorization Role*: System role (superadmin, system_admin), Organization role (org_owner, org_admin), Project membership role.
  2. *Professional Role*: Vai trò chuyên môn (Frontend, Backend, DevOps).
  3. *Task Contribution Role*: Vai trò tham gia task (Contributor, Lead, Reviewer).
- **Policy Enforcement**: Quản lý phân quyền tập trung thông qua lớp Policy Enforcer (`enforce_policy`).

## Module Path

```text
app/modules/authorization
```

## Folder And File Inventory

```text
./ README.md
actions/ enforce_policy.ts public_api.ts
actions/permission/ cross_module_permission_checker.ts
actions/queries/ authorize_system_user_admin_access_query.ts
constants/ context_constants.ts permissions.ts role_contracts.ts
controllers/ require_system_user_admin_access.ts
domain/ access_surface.ts system_user_access_policy.ts
exceptions/ policy_violation_exception.ts
infra/adapters/ user_identity_reader.ts
middleware/ authorize_role.ts require_system_admin_middleware.ts system_admin_context_middleware.ts
public_contracts/ access_surface.ts permission_checker.ts permissions.ts policy_enforcer.ts policy_result.ts system_admin_access.ts
```

## Route Evidence

```text
(none)
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| function | `enforcePolicy` | `app/modules/authorization/actions/enforce_policy.ts` | 10 |
| const | `crossModulePermissionChecker` | `app/modules/authorization/actions/permission/cross_module_permission_checker.ts` | 6 |
| class | `AuthorizeSystemUserAdminAccessQuery` | `app/modules/authorization/actions/queries/authorize_system_user_admin_access_query.ts` | 13 |
| const | `INTERFACE_CONTEXT_TYPES` | `app/modules/authorization/constants/context_constants.ts` | 1 |
| type | `InterfaceContextType` | `app/modules/authorization/constants/context_constants.ts` | 7 |
| const | `SYSTEM_ROLE_PERMISSIONS` | `app/modules/authorization/constants/permissions.ts` | 28 |
| const | `ORG_ROLE_PERMISSIONS` | `app/modules/authorization/constants/permissions.ts` | 48 |
| const | `PROJECT_ROLE_PERMISSIONS` | `app/modules/authorization/constants/permissions.ts` | 90 |
| const | `ORG_ROLE_LEVEL` | `app/modules/authorization/constants/permissions.ts` | 136 |
| const | `PROJECT_ROLE_LEVEL` | `app/modules/authorization/constants/permissions.ts` | 146 |
| function | `hasSystemPermission` | `app/modules/authorization/constants/permissions.ts` | 160 |
| function | `hasOrgPermission` | `app/modules/authorization/constants/permissions.ts` | 171 |
| function | `hasProjectPermission` | `app/modules/authorization/constants/permissions.ts` | 181 |
| function | `getOrgRoleLevel` | `app/modules/authorization/constants/permissions.ts` | 190 |
| function | `getProjectRoleLevel` | `app/modules/authorization/constants/permissions.ts` | 197 |
| const | `AuthOrgRole` | `app/modules/authorization/constants/role_contracts.ts` | 3 |
| const | `AuthProjectRole` | `app/modules/authorization/constants/role_contracts.ts` | 9 |
| const | `AuthSystemRole` | `app/modules/authorization/constants/role_contracts.ts` | 16 |
| interface | `PermissionPresentation` | `app/modules/authorization/domain/access_surface.ts` | 13 |
| function | `humanizeIdentifier` | `app/modules/authorization/domain/access_surface.ts` | 252 |
| function | `formatRoleLabel` | `app/modules/authorization/domain/access_surface.ts` | 261 |
| function | `getRoleDescription` | `app/modules/authorization/domain/access_surface.ts` | 265 |
| function | `describePermission` | `app/modules/authorization/domain/access_surface.ts` | 269 |
| function | `listKnownOrganizationPermissions` | `app/modules/authorization/domain/access_surface.ts` | 283 |
| function | `listSystemPermissionCatalog` | `app/modules/authorization/domain/access_surface.ts` | 305 |
| function | `listProjectPermissionCatalog` | `app/modules/authorization/domain/access_surface.ts` | 318 |
| interface | `SystemUserAccessContext` | `app/modules/authorization/domain/system_user_access_policy.ts` | 5 |
| function | `canAccessSystemUserAdministration` | `app/modules/authorization/domain/system_user_access_policy.ts` | 10 |
| type | `PolicyViolationCode` | `app/modules/authorization/exceptions/policy_violation_exception.ts` | 4 |
| interface | `PolicyViolationDetails` | `app/modules/authorization/exceptions/policy_violation_exception.ts` | 6 |
| class | `ForbiddenPolicyViolationException` | `app/modules/authorization/exceptions/policy_violation_exception.ts` | 11 |
| class | `BusinessPolicyViolationException` | `app/modules/authorization/exceptions/policy_violation_exception.ts` | 24 |
| type | `PolicyViolationException` | `app/modules/authorization/exceptions/policy_violation_exception.ts` | 37 |
| function | `isPolicyViolationException` | `app/modules/authorization/exceptions/policy_violation_exception.ts` | 41 |
| const | `userIdentityReader` | `app/modules/authorization/infra/adapters/user_identity_reader.ts` | 5 |
| class | `AuthorizeRoleMiddleware` | `app/modules/authorization/middleware/authorize_role.ts` | 14 |
| class | `RequireSystemAdminMiddleware` | `app/modules/authorization/middleware/require_system_admin_middleware.ts` | 24 |
| class | `SystemAdminContextMiddleware` | `app/modules/authorization/middleware/system_admin_context_middleware.ts` | 24 |
| type | `PolicyResult` | `app/modules/authorization/public_contracts/policy_result.ts` | 1 |
| type | `PolicyDenyCode` | `app/modules/authorization/public_contracts/policy_result.ts` | 5 |
| const | `PolicyResult` | `app/modules/authorization/public_contracts/policy_result.ts` | 7 |
| function | `canAccessSystemAdministration` | `app/modules/authorization/public_contracts/system_admin_access.ts` | 6 |
| function | `canAccessAllowedSystemRoles` | `app/modules/authorization/public_contracts/system_admin_access.ts` | 14 |

## Import Evidence

### `app/modules/authorization/actions/enforce_policy.ts`

```ts
import {
  BusinessPolicyViolationException,
  ForbiddenPolicyViolationException,
} from '#modules/authorization/exceptions/policy_violation_exception'
import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
```

### `app/modules/authorization/actions/permission/cross_module_permission_checker.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { userIdentityReader } from '#modules/authorization/infra/adapters/user_identity_reader'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
```

### `app/modules/authorization/actions/public_api.ts`

```ts
// no imports
```

### `app/modules/authorization/actions/queries/authorize_system_user_admin_access_query.ts`

```ts
import {
  canAccessSystemUserAdministration,
  type SystemUserAccessContext,
} from '#modules/authorization/domain/system_user_access_policy'
import { userIdentityReader } from '#modules/authorization/infra/adapters/user_identity_reader'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
```

### `app/modules/authorization/controllers/require_system_user_admin_access.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { AuthorizeSystemUserAdminAccessQuery } from '#modules/authorization/public_contracts/permission_checker'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
```
## Code Snippets

### `app/modules/authorization/actions/queries/authorize_system_user_admin_access_query.ts`

```ts
import {
  canAccessSystemUserAdministration,
  type SystemUserAccessContext,
} from '#modules/authorization/domain/system_user_access_policy'
import { userIdentityReader } from '#modules/authorization/infra/adapters/user_identity_reader'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'

/**
 * Authorization Query: system-user administration surface.
 */
export default class AuthorizeSystemUserAdminAccessQuery {
  private readonly __instanceMarker = true

  static {
    void new AuthorizeSystemUserAdminAccessQuery().__instanceMarker
  }

  static async evaluate(userId: string, organizationId: string): Promise<PolicyResult> {
    const [actorSystemRole, membershipContext] = await Promise.all([
      userIdentityReader.getSystemRoleName(userId),
      organizationPublicApi.getMembershipContext(organizationId, userId, undefined, true),
    ])

    const accessContext: SystemUserAccessContext = {
      actorSystemRole,
      actorOrgRole: membershipContext?.role ?? null,
    }

    return canAccessSystemUserAdministration(accessContext)
  }

  static async execute(userId: string, organizationId: string): Promise<boolean> {
    const decision = await this.evaluate(userId, organizationId)
    return decision.allowed
  }

  static async authorize(userId: string, organizationId: string): Promise<void> {
    enforcePolicy(await this.evaluate(userId, organizationId))
  }
}

```

### `app/modules/authorization/controllers/require_system_user_admin_access.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import { AuthorizeSystemUserAdminAccessQuery } from '#modules/authorization/public_contracts/permission_checker'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'

interface SystemUserAdminAccessContext {
  userId: string
  organizationId: string
}

function getRequiredContext(ctx: HttpContext): SystemUserAdminAccessContext {
  const user = ctx.auth.user
  if (!user) {
    throw new UnauthorizedException()
  }

  const organizationId = user.current_organization_id
  if (!organizationId) {
    throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
  }

  return {
    userId: user.id,
    organizationId,
  }
}

export async function requireSystemUserAdminAccess(
  ctx: HttpContext
): Promise<SystemUserAdminAccessContext> {
  const accessContext = getRequiredContext(ctx)
  await AuthorizeSystemUserAdminAccessQuery.authorize(
    accessContext.userId,
    accessContext.organizationId
  )

  return accessContext
}

export async function resolveSystemUserAdminAccess(
  ctx: HttpContext
): Promise<SystemUserAdminAccessContext | null> {
  const user = ctx.auth.user
  if (!user) {
    return null
  }

  const organizationId = user.current_organization_id
  if (!organizationId) {
    return null
  }

  const allowed = await AuthorizeSystemUserAdminAccessQuery.execute(user.id, organizationId)
  if (!allowed) {
    return null
  }

  return {
    userId: user.id,
    organizationId,
  }
}

```

### `app/modules/authorization/domain/access_surface.ts`

```ts
import {
  AuthOrgRole,
  AuthProjectRole,
  AuthSystemRole,
} from '#modules/authorization/constants/role_contracts'
import {
  ORG_ROLE_PERMISSIONS,
  PROJECT_ROLE_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
} from '#modules/authorization/public_contracts/permissions'
import type { OrganizationCustomRoleDefinition as CustomRoleDefinition } from '#modules/organizations/types/custom_role_definition'

export interface PermissionPresentation {
  key: string
  label: string
  description: string
  category: string
}

const PERMISSION_PRESENTATION_MAP: Record<
  string,
  { label: string; description: string; category: string }
> = {
  '*': {
    label: 'Toàn quyền',
    description: 'Truy cập và thao tác không giới hạn trong phạm vi hệ thống.',
    category: 'System',
  },
  'can_manage_users': {
    label: 'Quản lý người dùng',
    description: 'Xem, đổi vai trò, khóa hoặc khôi phục tài khoản người dùng.',
    category: 'Administration',
  },
  'can_view_all_organizations': {
    label: 'Xem toàn bộ tổ chức',
    description: 'Truy cập danh sách và chi tiết mọi organization trong hệ thống.',
    category: 'Administration',
  },
  'can_view_system_logs': {
    label: 'Xem nhật ký hệ thống',
    description: 'Theo dõi audit logs, vận hành và thay đổi quan trọng của hệ thống.',
    category: 'Monitoring',
  },
  'can_view_reports': {
    label: 'Xem báo cáo hệ thống',
    description: 'Mở các dashboard và báo cáo phân tích cấp hệ thống.',
    category: 'Monitoring',
  },
  'can_manage_system_settings': {
    label: 'Quản lý cấu hình hệ thống',
    description: 'Cập nhật cài đặt vận hành cấp hệ thống.',
    category: 'Administration',
  },
  'can_create_project': {
    label: 'Tạo dự án',
    description: 'Khởi tạo project mới trong organization.',
    category: 'Project',
  },
  'can_manage_members': {
    label: 'Quản lý thành viên',
    description: 'Thêm, gỡ, sắp xếp vai trò và điều phối nhân sự.',
    category: 'Membership',
  },
  'can_delete_organization': {
    label: 'Xóa tổ chức',
    description: 'Thực hiện thao tác xóa organization.',
    category: 'Governance',
  },
  'can_view_all_projects': {
    label: 'Xem tất cả dự án',
    description: 'Truy cập toàn bộ project thuộc organization.',
    category: 'Project',
  },
  'can_transfer_ownership': {
    label: 'Chuyển quyền sở hữu',
    description: 'Chuyển ownership cho role hoặc thành viên phù hợp.',
    category: 'Governance',
  },
  'can_manage_settings': {
    label: 'Quản lý cài đặt',
    description: 'Cập nhật thông tin, workflow và cấu hình của organization.',
    category: 'Governance',
  },
  'can_create_custom_roles': {
    label: 'Tạo vai trò tùy chỉnh',
    description: 'Khai báo role mới dựa trên tập quyền của organization.',
    category: 'Governance',
  },
  'can_invite_members': {
    label: 'Mời thành viên',
    description: 'Tạo lời mời hoặc đưa người dùng mới vào organization.',
    category: 'Membership',
  },
  'can_approve_members': {
    label: 'Duyệt tham gia',
    description: 'Xử lý yêu cầu vào organization.',
    category: 'Membership',
  },
  'can_remove_members': {
    label: 'Gỡ thành viên',
    description: 'Loại thành viên khỏi organization.',
    category: 'Membership',
  },
  'can_view_audit_logs': {
    label: 'Xem audit log',
    description: 'Theo dõi thay đổi và hoạt động quan trọng của tổ chức.',
    category: 'Monitoring',
  },
  'can_manage_integrations': {
    label: 'Quản lý tích hợp',
    description: 'Điều phối các kết nối và tích hợp ngoài hệ thống.',
    category: 'Integrations',
  },
  'can_view_assigned_projects': {
    label: 'Xem dự án được giao',
    description: 'Chỉ truy cập các project có liên quan trực tiếp.',
    category: 'Project',
  },
  'can_update_own_tasks': {
    label: 'Cập nhật task của mình',
    description: 'Sửa trạng thái và thông tin task được giao trực tiếp.',
    category: 'Task',
  },
  'can_view_organization_info': {
    label: 'Xem thông tin tổ chức',
    description: 'Đọc thông tin cơ bản và cấu trúc chung của organization.',
    category: 'Organization',
  },
  'can_comment_on_tasks': {
    label: 'Bình luận task',
    description: 'Tham gia trao đổi và cập nhật ngữ cảnh trong task.',
    category: 'Collaboration',
  },
  'can_upload_task_files': {
    label: 'Tải file cho task',
    description: 'Đính kèm file phục vụ trao đổi hoặc nghiệm thu task.',
    category: 'Collaboration',
  },
  'can_delete_project': {
    label: 'Xóa dự án',
    description: 'Xóa project khỏi hệ thống.',
    category: 'Project',
  },
  'can_create_task': {
    label: 'Tạo task',
    description: 'Khởi tạo task mới trong project.',
    category: 'Task',
  },
  'can_assign_task': {
    label: 'Giao task',
    description: 'Gán task cho thành viên hoặc freelancer.',
    category: 'Task',
  },
  'can_update_any_task': {
    label: 'Cập nhật mọi task',
    description: 'Chỉnh sửa toàn bộ task trong project.',
    category: 'Task',
  },
  'can_delete_any_task': {
    label: 'Xóa mọi task',
    description: 'Xóa task bất kỳ trong project.',
    category: 'Task',
  },
  'can_invite_freelancer': {
    label: 'Mời freelancer',
    description: 'Đưa freelancer hoặc ứng viên ngoài tổ chức vào flow công việc.',
    category: 'Marketplace',
  },
  'can_approve_application': {
    label: 'Duyệt đơn ứng tuyển',
    description: 'Xử lý application trên marketplace hoặc task external.',
    category: 'Marketplace',
  },
  'can_manage_project_settings': {
    label: 'Quản lý cài đặt dự án',
    description: 'Sửa cấu hình và quy ước của project.',
    category: 'Project',
  },
  'can_view_all_tasks': {
    label: 'Xem toàn bộ task',
    description: 'Truy cập tất cả task trong project.',
    category: 'Task',
  },
  'can_manage_project_budget': {
    label: 'Quản lý ngân sách dự án',
    description: 'Theo dõi và điều chỉnh budget của project.',
    category: 'Project',
  },
  'can_export_project_data': {
    label: 'Xuất dữ liệu dự án',
    description: 'Trích xuất dữ liệu project cho báo cáo hoặc đối soát.',
    category: 'Reporting',
  },
  'can_update_task': {
    label: 'Cập nhật task',
    description: 'Cập nhật task trong phạm vi quản lý của mình.',
    category: 'Task',
  },
  'can_delete_task': {
    label: 'Xóa task',
    description: 'Xóa task trong phạm vi quản lý của mình.',
    category: 'Task',
  },
  'can_review_completed_tasks': {
    label: 'Review task hoàn tất',
    description: 'Theo dõi và chấm chất lượng công việc đã hoàn thành.',
    category: 'Review',
  },
  'can_manage_task_priorities': {
    label: 'Quản lý độ ưu tiên task',
    description: 'Sắp xếp mức ưu tiên và thứ tự xử lý task.',
    category: 'Task',
  },
  'can_view_project_reports': {
    label: 'Xem báo cáo dự án',
    description: 'Truy cập biểu đồ và số liệu của project.',
    category: 'Reporting',
  },
  'can_view_assigned_tasks': {
    label: 'Xem task được giao',
    description: 'Chỉ xem các task được giao trực tiếp.',
    category: 'Task',
  },
}

const BUILT_IN_ROLE_LABELS: Record<string, string> = {
  [AuthSystemRole.SUPERADMIN]: 'Superadmin',
  [AuthSystemRole.SYSTEM_ADMIN]: 'System Admin',
  [AuthSystemRole.REGISTERED_USER]: 'Registered User',
  [AuthOrgRole.OWNER]: 'Owner Org',
  [AuthOrgRole.ADMIN]: 'Org Admin',
  [AuthOrgRole.MEMBER]: 'Org Member',
  [AuthProjectRole.OWNER]: 'Project Owner',
  [AuthProjectRole.MANAGER]: 'Project Manager',
  [AuthProjectRole.MEMBER]: 'Project Member',
  [AuthProjectRole.VIEWER]: 'Project Viewer',
}

const BUILT_IN_ROLE_DESCRIPTIONS: Record<string, string> = {
  [AuthSystemRole.SUPERADMIN]: 'Toàn quyền cấp hệ thống.',
  [AuthSystemRole.SYSTEM_ADMIN]: 'Điều hành vận hành hệ thống, moderation và báo cáo.',
  [AuthSystemRole.REGISTERED_USER]: 'Người dùng thông thường, không có quyền hệ thống.',
  [AuthOrgRole.OWNER]: 'Chủ tổ chức, có toàn quyền trong phạm vi organization.',
  [AuthOrgRole.ADMIN]: 'Quản trị viên tổ chức, điều phối membership và vận hành.',
  [AuthOrgRole.MEMBER]: 'Thành viên tham gia dự án và task thường ngày.',
  [AuthProjectRole.OWNER]: 'Chủ dự án, chịu trách nhiệm project-level governance.',
  [AuthProjectRole.MANAGER]: 'Quản lý dự án, điều phối task và thành viên.',
  [AuthProjectRole.MEMBER]: 'Thành viên thực thi trong project.',
  [AuthProjectRole.VIEWER]: 'Người xem chỉ có quyền theo dõi thông tin.',
}

export function humanizeIdentifier(value: string): string {
  return value
    .replace(/^can_/, '')
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function formatRoleLabel(role: string): string {
  return BUILT_IN_ROLE_LABELS[role] ?? humanizeIdentifier(role)
}

export function getRoleDescription(role: string): string {
  return BUILT_IN_ROLE_DESCRIPTIONS[role] ?? 'Vai trò tùy chỉnh do organization định nghĩa.'
}

export function describePermission(permission: string): PermissionPresentation {
  const predefined = PERMISSION_PRESENTATION_MAP[permission]
  if (predefined) {
    return { key: permission, ...predefined }
  }

  return {
    key: permission,
    label: humanizeIdentifier(permission),
    description: 'Quyền hạn tùy chỉnh hoặc chưa được gắn mô tả chi tiết.',
    category: 'Custom',
  }
}

export function listKnownOrganizationPermissions(
  customRoles: CustomRoleDefinition[] = []
): PermissionPresentation[] {
  const permissionSet = new Set<string>()

  for (const permissions of Object.values(ORG_ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      permissionSet.add(permission)
    }
  }

  for (const role of customRoles) {
    for (const permission of role.permissions) {
      permissionSet.add(permission)
    }
  }

  return [...permissionSet]
    .sort((left, right) => left.localeCompare(right))
    .map((permission) => describePermission(permission))
}

export function listSystemPermissionCatalog(): PermissionPresentation[] {
  const permissionSet = new Set<string>()
  for (const permissions of Object.values(SYSTEM_ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      permissionSet.add(permission)
    }
  }

  return [...permissionSet]
    .sort((left, right) => left.localeCompare(right))
    .map((permission) => describePermission(permission))
}

export function listProjectPermissionCatalog(): PermissionPresentation[] {
  const permissionSet = new Set<string>()
  for (const permissions of Object.values(PROJECT_ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      permissionSet.add(permission)
    }
  }

  return [...permissionSet]
    .sort((left, right) => left.localeCompare(right))
    .map((permission) => describePermission(permission))
}

```

### `app/modules/authorization/domain/system_user_access_policy.ts`

```ts
import { AuthOrgRole, AuthSystemRole } from '#modules/authorization/constants/role_contracts'
import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'

export interface SystemUserAccessContext {
  actorSystemRole: string | null
  actorOrgRole: string | null
}

export function canAccessSystemUserAdministration(
  context: SystemUserAccessContext
): PolicyResult {
  if (
    context.actorSystemRole === AuthSystemRole.SUPERADMIN ||
    context.actorSystemRole === AuthSystemRole.SYSTEM_ADMIN
  ) {
    return PR.allow()
  }

  if (context.actorOrgRole === AuthOrgRole.OWNER) {
    return PR.allow()
  }

  return PR.deny('Bạn không có quyền truy cập khu vực quản trị người dùng')
}

```

### `app/modules/authorization/middleware/authorize_role.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { canAccessAllowedSystemRoles } from '#modules/authorization/public_contracts/system_admin_access'

/**
 * AuthorizeRole Middleware — kiểm tra system role của user.
 *
 * v3: system_role là inline VARCHAR trên users table.
 * Không cần preload relationship, đọc trực tiếp auth.user.system_role.
 *
 * Accepts: string[] of role names (ví dụ: ['superadmin', 'system_admin'])
 */
export default class AuthorizeRoleMiddleware {
  async handle(
    { auth, response, session }: HttpContext,
    next: NextFn,
    allowedRoles: string[] = []
  ): Promise<void> {
    // Kiểm tra user đã đăng nhập
    if (!auth.user) {
      session.flash('error', 'Bạn cần đăng nhập để truy cập trang này')
      response.redirect().toRoute('auth.login')
      return
    }

    // Nếu không yêu cầu role cụ thể → cho phép
    if (allowedRoles.length === 0) {
      await next()
      return
    }

    const decision = canAccessAllowedSystemRoles(auth.user.system_role, allowedRoles)
    if (decision.allowed) {
      await next()
      return
    }

    // Không có quyền
    session.flash('error', 'Bạn không có quyền truy cập chức năng này')
    response.redirect().back()
  }
}

```

### `app/modules/authorization/middleware/require_system_admin_middleware.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { canAccessSystemAdministration } from '#modules/authorization/public_contracts/system_admin_access'

/**
 * RequireSystemAdminMiddleware
 *
 * Protects routes that require SYSTEM-level admin access.
 * Only users with system_role = 'superadmin' or 'system_admin' can proceed.
 *
 * ⚠️ IMPORTANT:
 * - This is for SYSTEM admins (manage entire platform)
 * - NOT for organization admins (manage their org only)
 * - System admin ≠ Organization owner/admin
 *
 * Usage:
 * ```typescript
 * router.group(() => {
 *   // System admin routes
 * }).use([middleware.auth(), middleware.requireSystemAdmin()])
 * ```
 */
export default class RequireSystemAdminMiddleware {
  /**
   * Handle the request
   */
  async handle({ auth, session, response }: HttpContext, next: NextFn): Promise<void> {
    // Check if user is authenticated
    if (!auth.user) {
      session.flash('error', 'You must be logged in to access this page')
      response.redirect().toRoute('auth.login')
      return
    }

    const decision = canAccessSystemAdministration(auth.user.system_role)
    if (!decision.allowed) {
      session.flash('error', 'Access denied. System administrator privileges required.')
      response.redirect().toRoute('home')
      return
    }

    // TODO: Log system admin access to audit log
    // await AuditLog.create({
    //   user_id: auth.user.id,
    //   action: 'system_admin_access',
    //   resource_type: 'system',
    //   resource_id: null,
    //   ip_address: request.ip(),
    //   user_agent: request.header('user-agent'),
    // })

    await next()
  }
}

```

### `app/modules/authorization/middleware/system_admin_context_middleware.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { INTERFACE_CONTEXT_TYPES, type InterfaceContextType } from '#modules/authorization/constants/context_constants'

/**
 * SystemAdminContextMiddleware
 *
 * Sets context variables for system admin interface.
 * Detects if user is in "Admin Mode" and shares relevant data to views.
 *
 * Context variables shared:
 * - isAdminMode: boolean - Is user currently in admin mode?
 * - canSwitchToAdmin: boolean - Can user access admin mode?
 * - contextType: 'system_admin' | 'organization' | 'user' - Current interface context
 *
 * Usage:
 * ```typescript
 * router.group(() => {
 *   // System admin routes
 * }).use([middleware.auth(), middleware.requireSystemAdmin(), middleware.systemAdminContext()])
 * ```
 */
export default class SystemAdminContextMiddleware {
  /**
   * Handle the request
   */
  async handle({ auth, session, view }: HttpContext, next: NextFn): Promise<void> {
    if (!auth.user) {
      await next()
      return
    }

    // Check if user can access system admin
    const systemRole = auth.user.system_role.toLowerCase()
    const canSwitchToAdmin = systemRole === 'superadmin' || systemRole === 'system_admin'

    // Check if admin mode is enabled in session
    const isAdminModeRaw: unknown = session.get('is_admin_mode', false)
    const isAdminMode = Boolean(isAdminModeRaw) && canSwitchToAdmin

    // Share context to views
    const contextType: InterfaceContextType = isAdminMode
      ? INTERFACE_CONTEXT_TYPES.SYSTEM_ADMIN
      : INTERFACE_CONTEXT_TYPES.USER

    view.share({
      isAdminMode,
      canSwitchToAdmin,
      contextType,
    })

    await next()
  }
}

```

### `app/modules/authorization/public_contracts/access_surface.ts`

```ts
export * from '#modules/authorization/domain/access_surface'

```

### `app/modules/authorization/public_contracts/permission_checker.ts`

```ts
export { crossModulePermissionChecker } from '#modules/authorization/actions/permission/cross_module_permission_checker'
export { enforcePolicy } from '#modules/authorization/actions/enforce_policy'
export { default as AuthorizeSystemUserAdminAccessQuery } from '#modules/authorization/actions/queries/authorize_system_user_admin_access_query'

```

### `app/modules/authorization/public_contracts/permissions.ts`

```ts
export * from '#modules/authorization/constants/permissions'

```
