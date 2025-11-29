# admin Backend Module

### Kiến trúc lõi & Phân tích nghiệp vụ
- **Operations Dashboard**: Cung cấp giao diện quản trị hệ thống cho system admin/superadmin, quản lý người dùng, tổ chức, các gói cước đăng ký và queue tranh chấp đánh giá năng lực.

## Module Path

```text
app/modules/admin
```

## Folder And File Inventory

```text
./ README.md
actions/ admin_action_context.ts base_command.ts base_query.ts interfaces.ts result.ts
actions/audit_logs/queries/ list_audit_logs_query.ts
actions/commands/ toggle_admin_mode_command.ts
actions/dashboard/ get_dashboard_stats_query.ts
actions/organizations/queries/ get_organization_details_query.ts list_organizations_query.ts
actions/packages/commands/ update_subscription_command.ts
actions/packages/queries/ get_subscription_qr_catalog_query.ts list_subscriptions_query.ts
actions/permissions/queries/ get_permission_matrix_query.ts
actions/reviews/commands/ resolve_flagged_review_command.ts
actions/reviews/queries/ get_flagged_review_detail_query.ts list_flagged_reviews_query.ts
actions/users/commands/ suspend_user_command.ts update_user_system_role_command.ts
actions/users/queries/ get_user_details_query.ts list_users_query.ts
application/dtos/common/ admin_pagination.ts
constants/ subscription_packages.ts
controllers/audit_logs/ list_audit_logs_controller.ts
controllers/ dashboard_controller.ts toggle_admin_mode_controller.ts
controllers/disputes/ admin_disputes_controller.ts
controllers/organizations/ list_organizations_controller.ts show_organization_controller.ts
controllers/packages/ list_packages_controller.ts show_qr_codes_controller.ts update_package_controller.ts
controllers/permissions/ show_permissions_controller.ts
controllers/reviews/ list_flagged_reviews_controller.ts resolve_flagged_review_controller.ts show_flagged_review_controller.ts
controllers/users/ list_users_controller.ts show_user_controller.ts suspend_user_controller.ts update_user_role_controller.ts
infra/repositories/read/ admin_audit_log_queries.ts admin_flagged_review_queries.ts admin_organization_queries.ts admin_project_queries.ts admin_subscription_queries.ts admin_task_queries.ts admin_user_queries.ts
infra/repositories/write/ admin_flagged_review_mutations.ts admin_subscription_mutations.ts admin_user_mutations.ts
```

## Route Evidence

```text
start/routes/admin.ts
start/routes/organizations.ts
start/routes/reviews.ts
start/routes/users.ts
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| interface | `AdminActionContext` | `app/modules/admin/actions/admin_action_context.ts` | 1 |
| interface | `AuthenticatedAdminActionContext` | `app/modules/admin/actions/admin_action_context.ts` | 8 |
| function | `makeSystemAdminActionContext` | `app/modules/admin/actions/admin_action_context.ts` | 12 |
| interface | `ListAuditLogsDTO` | `app/modules/admin/actions/audit_logs/queries/list_audit_logs_query.ts` | 6 |
| interface | `ListAuditLogsResult` | `app/modules/admin/actions/audit_logs/queries/list_audit_logs_query.ts` | 17 |
| class | `ListAuditLogsQuery` | `app/modules/admin/actions/audit_logs/queries/list_audit_logs_query.ts` | 45 |
| interface | `ToggleAdminModeDTO` | `app/modules/admin/actions/commands/toggle_admin_mode_command.ts` | 6 |
| interface | `ToggleAdminModeResult` | `app/modules/admin/actions/commands/toggle_admin_mode_command.ts` | 10 |
| class | `ToggleAdminModeCommand` | `app/modules/admin/actions/commands/toggle_admin_mode_command.ts` | 19 |
| interface | `GetDashboardStatsResult` | `app/modules/admin/actions/dashboard/get_dashboard_stats_query.ts` | 17 |
| class | `GetDashboardStatsQuery` | `app/modules/admin/actions/dashboard/get_dashboard_stats_query.ts` | 50 |
| interface | `CommandHandler` | `app/modules/admin/actions/interfaces.ts` | 7 |
| interface | `QueryHandler` | `app/modules/admin/actions/interfaces.ts` | 22 |
| interface | `Command` | `app/modules/admin/actions/interfaces.ts` | 36 |
| interface | `Query` | `app/modules/admin/actions/interfaces.ts` | 43 |
| interface | `GetOrganizationDetailsDTO` | `app/modules/admin/actions/organizations/queries/get_organization_details_query.ts` | 33 |
| interface | `OrganizationDetailsResult` | `app/modules/admin/actions/organizations/queries/get_organization_details_query.ts` | 37 |
| class | `GetOrganizationDetailsQuery` | `app/modules/admin/actions/organizations/queries/get_organization_details_query.ts` | 56 |
| interface | `ListOrganizationsDTO` | `app/modules/admin/actions/organizations/queries/list_organizations_query.ts` | 35 |
| interface | `ListOrganizationsResult` | `app/modules/admin/actions/organizations/queries/list_organizations_query.ts` | 42 |
| class | `ListOrganizationsQuery` | `app/modules/admin/actions/organizations/queries/list_organizations_query.ts` | 71 |
| interface | `UpdateSubscriptionDTO` | `app/modules/admin/actions/packages/commands/update_subscription_command.ts` | 6 |
| class | `UpdateSubscriptionCommand` | `app/modules/admin/actions/packages/commands/update_subscription_command.ts` | 14 |
| interface | `SubscriptionQrCatalogResult` | `app/modules/admin/actions/packages/queries/get_subscription_qr_catalog_query.ts` | 9 |
| class | `GetSubscriptionQrCatalogQuery` | `app/modules/admin/actions/packages/queries/get_subscription_qr_catalog_query.ts` | 21 |
| interface | `ListSubscriptionsDTO` | `app/modules/admin/actions/packages/queries/list_subscriptions_query.ts` | 9 |
| interface | `ListSubscriptionsResult` | `app/modules/admin/actions/packages/queries/list_subscriptions_query.ts` | 17 |
| class | `ListSubscriptionsQuery` | `app/modules/admin/actions/packages/queries/list_subscriptions_query.ts` | 47 |
| interface | `PermissionMatrixResult` | `app/modules/admin/actions/permissions/queries/get_permission_matrix_query.ts` | 24 |
| class | `GetPermissionMatrixQuery` | `app/modules/admin/actions/permissions/queries/get_permission_matrix_query.ts` | 50 |
| class | `Result` | `app/modules/admin/actions/result.ts` | 5 |
| interface | `ResolveFlaggedReviewDTO` | `app/modules/admin/actions/reviews/commands/resolve_flagged_review_command.ts` | 8 |
| class | `ResolveFlaggedReviewCommand` | `app/modules/admin/actions/reviews/commands/resolve_flagged_review_command.ts` | 14 |
| interface | `GetFlaggedReviewDetailDTO` | `app/modules/admin/actions/reviews/queries/get_flagged_review_detail_query.ts` | 6 |
| interface | `GetFlaggedReviewDetailResult` | `app/modules/admin/actions/reviews/queries/get_flagged_review_detail_query.ts` | 10 |
| class | `GetFlaggedReviewDetailQuery` | `app/modules/admin/actions/reviews/queries/get_flagged_review_detail_query.ts` | 36 |
| interface | `ListFlaggedReviewsDTO` | `app/modules/admin/actions/reviews/queries/list_flagged_reviews_query.ts` | 5 |
| interface | `ListFlaggedReviewsResult` | `app/modules/admin/actions/reviews/queries/list_flagged_reviews_query.ts` | 14 |
| class | `ListFlaggedReviewsQuery` | `app/modules/admin/actions/reviews/queries/list_flagged_reviews_query.ts` | 36 |
| interface | `SuspendUserDTO` | `app/modules/admin/actions/users/commands/suspend_user_command.ts` | 20 |
| class | `SuspendUserCommand` | `app/modules/admin/actions/users/commands/suspend_user_command.ts` | 25 |
| interface | `UpdateUserSystemRoleDTO` | `app/modules/admin/actions/users/commands/update_user_system_role_command.ts` | 20 |
| class | `UpdateUserSystemRoleCommand` | `app/modules/admin/actions/users/commands/update_user_system_role_command.ts` | 25 |
| interface | `GetUserDetailsDTO` | `app/modules/admin/actions/users/queries/get_user_details_query.ts` | 11 |
| interface | `UserDetailsResult` | `app/modules/admin/actions/users/queries/get_user_details_query.ts` | 15 |
| class | `GetUserDetailsQuery` | `app/modules/admin/actions/users/queries/get_user_details_query.ts` | 27 |
| interface | `ListUsersDTO` | `app/modules/admin/actions/users/queries/list_users_query.ts` | 12 |
| interface | `ListUsersResult` | `app/modules/admin/actions/users/queries/list_users_query.ts` | 20 |
| class | `ListUsersQuery` | `app/modules/admin/actions/users/queries/list_users_query.ts` | 39 |
| const | `ADMIN_PAGINATION` | `app/modules/admin/application/dtos/common/admin_pagination.ts` | 1 |
| interface | `SubscriptionPackageDefinition` | `app/modules/admin/constants/subscription_packages.ts` | 1 |
| interface | `SubscriptionPaymentConfig` | `app/modules/admin/constants/subscription_packages.ts` | 12 |
| const | `SUBSCRIPTION_PACKAGE_CATALOG` | `app/modules/admin/constants/subscription_packages.ts` | 20 |
| const | `SUBSCRIPTION_PAYMENT_CONFIG` | `app/modules/admin/constants/subscription_packages.ts` | 48 |
| class | `ListAuditLogsController` | `app/modules/admin/controllers/audit_logs/list_audit_logs_controller.ts` | 17 |
| class | `AdminDashboardController` | `app/modules/admin/controllers/dashboard_controller.ts` | 15 |
| class | `AdminDisputesController` | `app/modules/admin/controllers/disputes/admin_disputes_controller.ts` | 9 |
| class | `ListOrganizationsController` | `app/modules/admin/controllers/organizations/list_organizations_controller.ts` | 17 |
| class | `ShowOrganizationController` | `app/modules/admin/controllers/organizations/show_organization_controller.ts` | 14 |
| class | `ListPackagesController` | `app/modules/admin/controllers/packages/list_packages_controller.ts` | 9 |
| class | `ShowQrCodesController` | `app/modules/admin/controllers/packages/show_qr_codes_controller.ts` | 7 |
| class | `UpdatePackageController` | `app/modules/admin/controllers/packages/update_package_controller.ts` | 7 |
| class | `ShowPermissionsController` | `app/modules/admin/controllers/permissions/show_permissions_controller.ts` | 7 |
| class | `ListFlaggedReviewsController` | `app/modules/admin/controllers/reviews/list_flagged_reviews_controller.ts` | 16 |
| class | `ResolveFlaggedReviewController` | `app/modules/admin/controllers/reviews/resolve_flagged_review_controller.ts` | 14 |
| class | `ShowFlaggedReviewController` | `app/modules/admin/controllers/reviews/show_flagged_review_controller.ts` | 7 |
| class | `ToggleAdminModeController` | `app/modules/admin/controllers/toggle_admin_mode_controller.ts` | 12 |
| class | `ListUsersController` | `app/modules/admin/controllers/users/list_users_controller.ts` | 17 |
| class | `ShowUserController` | `app/modules/admin/controllers/users/show_user_controller.ts` | 14 |
| class | `SuspendUserController` | `app/modules/admin/controllers/users/suspend_user_controller.ts` | 15 |
| class | `UpdateUserRoleController` | `app/modules/admin/controllers/users/update_user_role_controller.ts` | 23 |
| interface | `ListAuditLogsParams` | `app/modules/admin/infra/repositories/read/admin_audit_log_queries.ts` | 4 |
| interface | `AdminAuditLogRecord` | `app/modules/admin/infra/repositories/read/admin_audit_log_queries.ts` | 15 |
| const | `AdminAuditLogReadOps` | `app/modules/admin/infra/repositories/read/admin_audit_log_queries.ts` | 28 |
| interface | `ListFlaggedReviewsFilters` | `app/modules/admin/infra/repositories/read/admin_flagged_review_queries.ts` | 19 |
| interface | `ListFlaggedReviewsResult` | `app/modules/admin/infra/repositories/read/admin_flagged_review_queries.ts` | 26 |
| const | `AdminFlaggedReviewReadOps` | `app/modules/admin/infra/repositories/read/admin_flagged_review_queries.ts` | 31 |
| interface | `ListOrganizationsFilters` | `app/modules/admin/infra/repositories/read/admin_organization_queries.ts` | 29 |
| interface | `ListOrganizationsResult` | `app/modules/admin/infra/repositories/read/admin_organization_queries.ts` | 34 |
| interface | `DashboardOrganizationStats` | `app/modules/admin/infra/repositories/read/admin_organization_queries.ts` | 39 |
| const | `AdminOrganizationReadOps` | `app/modules/admin/infra/repositories/read/admin_organization_queries.ts` | 44 |
| interface | `DashboardProjectStats` | `app/modules/admin/infra/repositories/read/admin_project_queries.ts` | 25 |
| const | `AdminProjectReadOps` | `app/modules/admin/infra/repositories/read/admin_project_queries.ts` | 31 |
| interface | `ListSubscriptionsFilters` | `app/modules/admin/infra/repositories/read/admin_subscription_queries.ts` | 36 |
| interface | `SubscriptionListItem` | `app/modules/admin/infra/repositories/read/admin_subscription_queries.ts` | 42 |
| interface | `SubscriptionStats` | `app/modules/admin/infra/repositories/read/admin_subscription_queries.ts` | 57 |
| const | `AdminSubscriptionReadOps` | `app/modules/admin/infra/repositories/read/admin_subscription_queries.ts` | 65 |
| interface | `DashboardTaskStats` | `app/modules/admin/infra/repositories/read/admin_task_queries.ts` | 25 |
| const | `AdminTaskReadOps` | `app/modules/admin/infra/repositories/read/admin_task_queries.ts` | 31 |
| interface | `ListUsersFilters` | `app/modules/admin/infra/repositories/read/admin_user_queries.ts` | 3 |
| interface | `ListUsersResult` | `app/modules/admin/infra/repositories/read/admin_user_queries.ts` | 9 |
| interface | `DashboardUserStats` | `app/modules/admin/infra/repositories/read/admin_user_queries.ts` | 14 |
| const | `AdminUserReadOps` | `app/modules/admin/infra/repositories/read/admin_user_queries.ts` | 21 |
| const | `AdminFlaggedReviewWriteOps` | `app/modules/admin/infra/repositories/write/admin_flagged_review_mutations.ts` | 5 |
| const | `AdminSubscriptionWriteOps` | `app/modules/admin/infra/repositories/write/admin_subscription_mutations.ts` | 3 |
| const | `AdminUserWriteOps` | `app/modules/admin/infra/repositories/write/admin_user_mutations.ts` | 3 |

## Import Evidence

### `app/modules/admin/actions/admin_action_context.ts`

```ts
// no imports
```

### `app/modules/admin/actions/audit_logs/queries/list_audit_logs_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { AdminAuditLogReadOps } from '#modules/admin/infra/repositories/read/admin_audit_log_queries'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'
```

### `app/modules/admin/actions/base_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CommandHandler } from './interfaces.js'
import { Result } from './result.js'
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
```

### `app/modules/admin/actions/base_query.ts`

```ts
import type { QueryHandler } from './interfaces.js'
import { Result } from './result.js'
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
```

### `app/modules/admin/actions/commands/toggle_admin_mode_command.ts`

```ts
import { BaseCommand } from '#modules/admin/actions/base_command'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'
```

### `app/modules/admin/actions/dashboard/get_dashboard_stats_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { AdminFlaggedReviewReadOps } from '#modules/admin/infra/repositories/read/admin_flagged_review_queries'
import { AdminOrganizationReadOps } from '#modules/admin/infra/repositories/read/admin_organization_queries'
import { AdminProjectReadOps } from '#modules/admin/infra/repositories/read/admin_project_queries'
import { AdminSubscriptionReadOps } from '#modules/admin/infra/repositories/read/admin_subscription_queries'
import { AdminTaskReadOps } from '#modules/admin/infra/repositories/read/admin_task_queries'
import { AdminUserReadOps } from '#modules/admin/infra/repositories/read/admin_user_queries'
```

### `app/modules/admin/actions/interfaces.ts`

```ts
// no imports
```

### `app/modules/admin/actions/organizations/queries/get_organization_details_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { AdminOrganizationReadOps } from '#modules/admin/infra/repositories/read/admin_organization_queries'
```

### `app/modules/admin/actions/organizations/queries/list_organizations_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { AdminOrganizationReadOps } from '#modules/admin/infra/repositories/read/admin_organization_queries'
import type { PartnerType } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/admin/actions/packages/commands/update_subscription_command.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseCommand } from '#modules/admin/actions/base_command'
import { AdminSubscriptionWriteOps } from '#modules/admin/infra/repositories/write/admin_subscription_mutations'
import { toStorageSubscriptionPlan } from '#modules/users/public_contracts/subscription_rules'
```

### `app/modules/admin/actions/packages/queries/get_subscription_qr_catalog_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import {
  SUBSCRIPTION_PACKAGE_CATALOG,
  SUBSCRIPTION_PAYMENT_CONFIG,
} from '#modules/admin/constants/subscription_packages'
import { AdminSubscriptionReadOps } from '#modules/admin/infra/repositories/read/admin_subscription_queries'
```

### `app/modules/admin/actions/packages/queries/list_subscriptions_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { AdminSubscriptionReadOps } from '#modules/admin/infra/repositories/read/admin_subscription_queries'
import {
  toDisplaySubscriptionPlan,
  toStorageSubscriptionPlan,
} from '#modules/users/public_contracts/subscription_rules'
```

### `app/modules/admin/actions/permissions/queries/get_permission_matrix_query.ts`

```ts
import { BaseQuery } from '#modules/admin/actions/base_query'
import {
  describePermission,
  formatRoleLabel,
  getRoleDescription,
  listKnownOrganizationPermissions,
  listProjectPermissionCatalog,
  listSystemPermissionCatalog,
} from '#modules/authorization/public_contracts/access_surface'
import {
  ORG_ROLE_PERMISSIONS,
  PROJECT_ROLE_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
} from '#modules/authorization/public_contracts/permissions'
```

### `app/modules/admin/actions/result.ts`

```ts
// no imports
```

### `app/modules/admin/actions/reviews/commands/resolve_flagged_review_command.ts`

```ts
import { Exception } from '@adonisjs/core/exceptions'
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseCommand } from '#modules/admin/actions/base_command'
import { AdminFlaggedReviewReadOps } from '#modules/admin/infra/repositories/read/admin_flagged_review_queries'
import { AdminFlaggedReviewWriteOps } from '#modules/admin/infra/repositories/write/admin_flagged_review_mutations'
```

### `app/modules/admin/actions/reviews/queries/get_flagged_review_detail_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { AdminFlaggedReviewReadOps } from '#modules/admin/infra/repositories/read/admin_flagged_review_queries'
import { reviewPublicApi } from '#modules/reviews/public_contracts/review_public_api'
```

### `app/modules/admin/actions/reviews/queries/list_flagged_reviews_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { AdminFlaggedReviewReadOps } from '#modules/admin/infra/repositories/read/admin_flagged_review_queries'
```

### `app/modules/admin/actions/users/commands/suspend_user_command.ts`

```ts
import { Exception } from '@adonisjs/core/exceptions'
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseCommand } from '#modules/admin/actions/base_command'
import { AdminUserReadOps } from '#modules/admin/infra/repositories/read/admin_user_queries'
import { AdminUserWriteOps } from '#modules/admin/infra/repositories/write/admin_user_mutations'
```

### `app/modules/admin/actions/users/commands/update_user_system_role_command.ts`

```ts
import { Exception } from '@adonisjs/core/exceptions'
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseCommand } from '#modules/admin/actions/base_command'
import { AdminUserReadOps } from '#modules/admin/infra/repositories/read/admin_user_queries'
import { AdminUserWriteOps } from '#modules/admin/infra/repositories/write/admin_user_mutations'
```

### `app/modules/admin/actions/users/queries/get_user_details_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { AdminUserReadOps } from '#modules/admin/infra/repositories/read/admin_user_queries'
```

### `app/modules/admin/actions/users/queries/list_users_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { AdminUserReadOps } from '#modules/admin/infra/repositories/read/admin_user_queries'
```

### `app/modules/admin/controllers/audit_logs/list_audit_logs_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import ListAuditLogsQuery from '#modules/admin/actions/audit_logs/queries/list_audit_logs_query'
import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/dashboard_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import GetDashboardStatsQuery from '#modules/admin/actions/dashboard/get_dashboard_stats_query'
import ListSubscriptionsQuery from '#modules/admin/actions/packages/queries/list_subscriptions_query'
import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/disputes/admin_disputes_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetAdminReviewDisputeDetailQuery from '#modules/reviews/actions/queries/get_admin_review_dispute_detail_query'
import ListAdminReviewDisputesQuery from '#modules/reviews/actions/queries/list_admin_review_disputes_query'
```

### `app/modules/admin/controllers/organizations/list_organizations_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import ListOrganizationsQuery from '#modules/admin/actions/organizations/queries/list_organizations_query'
import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/organizations/show_organization_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import GetOrganizationDetailsQuery from '#modules/admin/actions/organizations/queries/get_organization_details_query'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/packages/list_packages_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import ListSubscriptionsQuery from '#modules/admin/actions/packages/queries/list_subscriptions_query'
import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import { SUBSCRIPTION_PACKAGE_CATALOG } from '#modules/admin/constants/subscription_packages'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/packages/show_qr_codes_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import GetSubscriptionQrCatalogQuery from '#modules/admin/actions/packages/queries/get_subscription_qr_catalog_query'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/packages/update_package_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import UpdateSubscriptionCommand from '#modules/admin/actions/packages/commands/update_subscription_command'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/permissions/show_permissions_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import GetPermissionMatrixQuery from '#modules/admin/actions/permissions/queries/get_permission_matrix_query'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/reviews/list_flagged_reviews_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import ListFlaggedReviewsQuery from '#modules/admin/actions/reviews/queries/list_flagged_reviews_query'
import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/reviews/resolve_flagged_review_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import ResolveFlaggedReviewCommand from '#modules/admin/actions/reviews/commands/resolve_flagged_review_command'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/reviews/show_flagged_review_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import GetFlaggedReviewDetailQuery from '#modules/admin/actions/reviews/queries/get_flagged_review_detail_query'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/toggle_admin_mode_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import ToggleAdminModeCommand from '#modules/admin/actions/commands/toggle_admin_mode_command'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/users/list_users_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import ListUsersQuery from '#modules/admin/actions/users/queries/list_users_query'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/users/show_user_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import GetUserDetailsQuery from '#modules/admin/actions/users/queries/get_user_details_query'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/users/suspend_user_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import SuspendUserCommand from '#modules/admin/actions/users/commands/suspend_user_command'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/admin/controllers/users/update_user_role_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import UpdateUserSystemRoleCommand from '#modules/admin/actions/users/commands/update_user_system_role_command'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'
```
## Code Snippets

### `start/routes/admin.ts`

```ts
import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

/**
 * System Admin Routes
 *
 * Prefix: /admin
 * Access: System Admin only (superadmin, system_admin)
 *
 * Middleware stack:
 * - auth() → Ensure authenticated
 * - requireSystemAdmin() → Check system_role
 * - systemAdminContext() → Set admin context
 *
 * ⚠️ IMPORTANT:
 * These routes are for SYSTEM-level administration, not organization management.
 * System admin ≠ Organization owner/admin
 */

// ================ LAZY-LOADED CONTROLLERS ================
// System Admin Dashboard
const AdminDashboardController = () => import('#modules/admin/controllers/dashboard_controller')
const AdminToggleAdminModeController = () =>
  import('#modules/admin/controllers/toggle_admin_mode_controller')

// User Management
const AdminListUsersController = () =>
  import('#modules/admin/controllers/users/list_users_controller')
const AdminShowUserController = () =>
  import('#modules/admin/controllers/users/show_user_controller')
const AdminUpdateUserRoleController = () =>
  import('#modules/admin/controllers/users/update_user_role_controller')
const AdminSuspendUserController = () =>
  import('#modules/admin/controllers/users/suspend_user_controller')

// Organization Management
const AdminListOrganizationsController = () =>
  import('#modules/admin/controllers/organizations/list_organizations_controller')
const AdminShowOrganizationController = () =>
  import('#modules/admin/controllers/organizations/show_organization_controller')

// Audit Logs
const AdminListAuditLogsController = () =>
  import('#modules/admin/controllers/audit_logs/list_audit_logs_controller')
const AdminShowPermissionsController = () =>
  import('#modules/admin/controllers/permissions/show_permissions_controller')

// Flagged Reviews
const AdminListFlaggedReviewsController = () =>
  import('#modules/admin/controllers/reviews/list_flagged_reviews_controller')
const AdminResolveFlaggedReviewController = () =>
  import('#modules/admin/controllers/reviews/resolve_flagged_review_controller')
const AdminShowFlaggedReviewController = () =>
  import('#modules/admin/controllers/reviews/show_flagged_review_controller')
const AdminListPackagesController = () =>
  import('#modules/admin/controllers/packages/list_packages_controller')
const AdminUpdatePackageController = () =>
  import('#modules/admin/controllers/packages/update_package_controller')
const AdminShowQrCodesController = () =>
  import('#modules/admin/controllers/packages/show_qr_codes_controller')

// Review Disputes
const AdminDisputesController = () =>
  import('#modules/admin/controllers/disputes/admin_disputes_controller')


// ================ ROUTE DEFINITIONS ================

router
  .group(() => {
    router.post('/toggle', [AdminToggleAdminModeController, 'handle']).as('admin.toggle')

    // ─── Dashboard ───
    router.get('/', [AdminDashboardController, 'handle']).as('admin.dashboard')
    router.get('/dashboards/users', [AdminDashboardController, 'users']).as('admin.dashboard.users')
    router
      .get('/dashboards/operations', [AdminDashboardController, 'operations'])
      .as('admin.dashboard.operations')
    router
      .get('/dashboards/subscriptions', [AdminDashboardController, 'subscriptions'])
      .as('admin.dashboard.subscriptions')

    // ─── User Management ───
    router
      .group(() => {
        router.get('/', [AdminListUsersController, 'handle']).as('admin.users.index')
        router.get('/:id', [AdminShowUserController, 'handle']).as('admin.users.show')
        router
          .put('/:id/role', [AdminUpdateUserRoleController, 'handle'])
          .as('admin.users.updateRole')
        router.put('/:id/suspend', [AdminSuspendUserController, 'handle']).as('admin.users.suspend')
        router
          .put('/:id/activate', [AdminSuspendUserController, 'handle'])
          .as('admin.users.activate')
      })
      .prefix('/users')

    // ─── Organization Management ───
    router
      .group(() => {
        router
          .get('/', [AdminListOrganizationsController, 'handle'])
          .as('admin.organizations.index')
        router
          .get('/:id', [AdminShowOrganizationController, 'handle'])
          .as('admin.organizations.show')
      })
      .prefix('/organizations')

    // ─── Audit Logs ───
    router.get('/audit-logs', [AdminListAuditLogsController, 'handle']).as('admin.auditLogs')
    router.get('/permissions', [AdminShowPermissionsController, 'handle']).as('admin.permissions')
    router.get('/qr-codes', [AdminShowQrCodesController, 'handle']).as('admin.qrCodes')

    // ─── Flagged Reviews ───
    router
      .group(() => {
        router.get('/', [AdminListFlaggedReviewsController, 'handle']).as('admin.reviews.flagged')
        router.get('/:id', [AdminShowFlaggedReviewController, 'handle']).as('admin.reviews.show')
        router
          .put('/:id/resolve', [AdminResolveFlaggedReviewController, 'handle'])
          .as('admin.reviews.resolve')
      })
      .prefix('/reviews')

    // ─── Review Disputes ───
    router
      .group(() => {
        router.get('/', [AdminDisputesController, 'index']).as('admin.disputes.index')
        router
          .get('/ai-operator', [AdminDisputesController, 'aiOperator'])
          .as('admin.disputes.ai_operator')
        router.get('/:id', [AdminDisputesController, 'show']).as('admin.disputes.show')
      })
      .prefix('/disputes')


    // ─── Package Management ───
    router
      .group(() => {
        router.get('/', [AdminListPackagesController, 'handle']).as('admin.packages.index')
        router.put('/:id', [AdminUpdatePackageController, 'handle']).as('admin.packages.update')
      })
      .prefix('/packages')

    // TODO: Future routes
    // - /admin/subscriptions (subscription management)
    // - /admin/settings (system settings)
  })
  .prefix('/admin')
  .use([middleware.auth(), middleware.requireSystemAdmin(), middleware.systemAdminContext()])

router
  .group(() => {
    router.get('/api/admin/dashboard', [AdminDashboardController, 'apiDashboard']).as(
      'api.admin.dashboard'
    )
    router.get('/api/admin/users', [AdminListUsersController, 'apiIndex']).as('api.admin.users')
    router
      .get('/api/admin/organizations', [AdminListOrganizationsController, 'apiIndex'])
      .as('api.admin.organizations')
    router
      .get('/api/admin/audit-logs', [AdminListAuditLogsController, 'apiIndex'])
      .as('api.admin.audit_logs')
  })
  .use([middleware.auth(), middleware.requireSystemAdmin(), middleware.systemAdminContext()])

```

### `app/modules/admin/actions/audit_logs/queries/list_audit_logs_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { AdminAuditLogReadOps } from '#modules/admin/infra/repositories/read/admin_audit_log_queries'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

export interface ListAuditLogsDTO {
  page?: number
  perPage?: number
  search?: string
  action?: string
  resourceType?: string
  userId?: string
  from?: Date
  to?: Date
}

export interface ListAuditLogsResult {
  data: {
    id: string
    user: {
      id: string
      username: string
    } | null
    action: string
    resource_type: string
    resource_id: string | null
    details: Record<string, unknown>
    ip_address: string
    user_agent: string
    created_at: string
  }[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

/**
 * ListAuditLogsQuery
 *
 * Application Layer - Query for listing audit logs
 */
export default class ListAuditLogsQuery extends BaseQuery<ListAuditLogsDTO, ListAuditLogsResult> {
  constructor(
    execCtx: AdminActionContext,
    private repo = AdminAuditLogReadOps
  ) {
    super(execCtx)
  }

  async handle(dto: ListAuditLogsDTO): Promise<ListAuditLogsResult> {
    const page = dto.page ?? 1
    const perPage = dto.perPage ?? 50

    const result = await this.repo.listAuditLogs({
      page,
      perPage,
      search: dto.search,
      action: dto.action,
      resourceType: dto.resourceType,
      userId: dto.userId,
      from: dto.from,
      to: dto.to,
    })

    const userIds = [...new Set(result.data.map((log) => log.user_id).filter((value) => !!value))]
    const users =
      userIds.length > 0
        ? await userPublicApi.findByIds(userIds as string[], ['id', 'username'])
        : []
    const userMap = new Map(users.map((user) => [user.id, user]))

    const lastPage = Math.max(1, Math.ceil(result.total / perPage))

    return {
      data: result.data.map((log) => ({
        id: log.id,
        user: log.user_id
          ? (() => {
              const user = userMap.get(log.user_id)
              return user ? { id: user.id, username: user.username } : null
            })()
          : null,
        action: log.action,
        resource_type: log.entity_type,
        resource_id: log.entity_id,
        details: {
          old_values: log.old_values,
          new_values: log.new_values,
        },
        ip_address: log.ip_address ?? '',
        user_agent: log.user_agent ?? '',
        created_at: log.created_at.toISOString(),
      })),
      meta: {
        total: result.total,
        perPage,
        currentPage: page,
        lastPage,
      },
    }
  }
}

```

### `app/modules/admin/actions/commands/toggle_admin_mode_command.ts`

```ts
import { BaseCommand } from '#modules/admin/actions/base_command'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

export interface ToggleAdminModeDTO {
  enabled: boolean
}

export interface ToggleAdminModeResult {
  enabled: boolean
  redirectPath: string
  successMessage: string
}

// Admin module là orchestration layer. Import từ public APIs của nhiều modules
// (users, organizations) tại đây là intentional — đây là trách nhiệm của
// orchestration layer, không phải boundary violation.
export default class ToggleAdminModeCommand extends BaseCommand<
  ToggleAdminModeDTO,
  ToggleAdminModeResult
> {
  async handle(dto: ToggleAdminModeDTO): Promise<ToggleAdminModeResult> {
    const userId = this.getCurrentUserId()
    const actorSystemRole = await userPublicApi.getSystemRoleName(userId)

    enforcePolicy(userPublicApi.canToggleAdminMode(actorSystemRole))

    if (dto.enabled) {
      return {
        enabled: true,
        redirectPath: '/admin',
        successMessage: 'Đã bật Admin Mode',
      }
    }

    const organizationId = this.execCtx.organizationId
    if (!organizationId) {
      return {
        enabled: false,
        redirectPath: '/organizations',
        successMessage: 'Đã tắt Admin Mode',
      }
    }

    const membershipContext = await organizationPublicApi.getMembershipContext(
      organizationId,
      userId,
      undefined,
      true
    )
    const actorOrgRole = membershipContext?.role ?? null

    return {
      enabled: false,
      redirectPath: organizationPublicApi.canAccessAdminShell(actorOrgRole).allowed
        ? '/org'
        : '/tasks',
      successMessage: 'Đã tắt Admin Mode',
    }
  }
}

```

### `app/modules/admin/actions/organizations/queries/get_organization_details_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { AdminOrganizationReadOps } from '#modules/admin/infra/repositories/read/admin_organization_queries'

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const getExtrasNumber = (value: unknown, key: string): number => {
  if (typeof value !== 'object' || value === null) {
    return 0
  }
  const extras = (value as { $extras?: unknown }).$extras
  if (typeof extras !== 'object' || extras === null) {
    return 0
  }
  return toNumberValue((extras as Record<string, unknown>)[key])
}

/**
 * GetOrganizationDetailsQuery (System Admin)
 *
 * Query to get detailed information about a specific organization.
 */

export interface GetOrganizationDetailsDTO {
  organizationId: string
}

export interface OrganizationDetailsResult {
  id: string
  name: string
  slug: string
  description: string | null
  partner_type: string | null
  created_at: string
  updated_at: string
  owner: {
    id: string
    username: string
    email: string | null
  }
  stats: {
    usersCount: number
    projectsCount: number
  }
}

export default class GetOrganizationDetailsQuery extends BaseQuery<
  GetOrganizationDetailsDTO,
  OrganizationDetailsResult
> {
  constructor(
    execCtx: AdminActionContext,
    private orgRepo = AdminOrganizationReadOps
  ) {
    super(execCtx)
  }

  async handle(dto: GetOrganizationDetailsDTO): Promise<OrganizationDetailsResult> {
    const org = await this.orgRepo.findById(dto.organizationId)

    if (!org) {
      throw new Error(`Organization not found: ${dto.organizationId}`)
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      partner_type: org.partner_type,
      created_at: org.created_at.toISO() ?? new Date().toISOString(),
      updated_at: org.updated_at.toISO() ?? new Date().toISOString(),
      owner: {
        id: org.owner.id,
        username: org.owner.username,
        email: org.owner.email,
      },
      stats: {
        usersCount: getExtrasNumber(org, 'users_count'),
        projectsCount: getExtrasNumber(org, 'projects_count'),
      },
    }
  }
}

```

### `app/modules/admin/actions/organizations/queries/list_organizations_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { AdminOrganizationReadOps } from '#modules/admin/infra/repositories/read/admin_organization_queries'
import type { PartnerType } from '#modules/organizations/public_contracts/organization_constants'

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const getExtrasNumber = (value: unknown, key: string): number => {
  if (typeof value !== 'object' || value === null) {
    return 0
  }
  const extras = (value as { $extras?: unknown }).$extras
  if (typeof extras !== 'object' || extras === null) {
    return 0
  }
  return toNumberValue((extras as Record<string, unknown>)[key])
}

/**
 * ListOrganizationsQuery (System Admin)
 *
 * Query to list all organizations in the system with filtering and pagination.
 * Uses repository (Infrastructure layer) for DB queries.
 */

export interface ListOrganizationsDTO {
  page?: number
  perPage?: number
  search?: string
  partnerType?: PartnerType
}

export interface ListOrganizationsResult {
  data: {
    id: string
    name: string
    slug: string
    description: string | null
    owner_id: string
    owner: {
      id: string
      username: string
      email: string
    }
    partner_type: string | null
    partner_is_active: boolean
    created_at: string
    updated_at: string
    _count: {
      members: number
      projects: number
    }
  }[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export default class ListOrganizationsQuery extends BaseQuery<
  ListOrganizationsDTO,
  ListOrganizationsResult
> {
  constructor(
    execCtx: AdminActionContext,
    private orgRepo = AdminOrganizationReadOps
  ) {
    super(execCtx)
  }

  async handle(dto: ListOrganizationsDTO): Promise<ListOrganizationsResult> {
    const page = dto.page ?? 1
    const perPage = dto.perPage ?? 50

    // Fetch from repository (Infrastructure layer)
    const result = await this.orgRepo.listOrganizations(
      {
        search: dto.search,
        partnerType: dto.partnerType,
      },
      page,
      perPage
    )

    const lastPage = Math.ceil(result.total / perPage)

    return {
      data: result.organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description ?? null,
        owner_id: org.owner_id,
        owner: {
          id: org.owner.id,
          username: org.owner.username,
          email: org.owner.email ?? '',
        },
        partner_type: org.partner_type,
        partner_is_active: org.partner_is_active ?? false,
        created_at: org.created_at.toISO() ?? new Date().toISOString(),
        updated_at: org.updated_at.toISO() ?? new Date().toISOString(),
        _count: {
          members: getExtrasNumber(org, 'users_count'),
          projects: getExtrasNumber(org, 'projects_count'),
        },
      })),
      meta: {
        total: result.total,
        perPage,
        currentPage: page,
        lastPage,
      },
    }
  }
}

```

### `app/modules/admin/actions/packages/commands/update_subscription_command.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseCommand } from '#modules/admin/actions/base_command'
import { AdminSubscriptionWriteOps } from '#modules/admin/infra/repositories/write/admin_subscription_mutations'
import { toStorageSubscriptionPlan } from '#modules/users/public_contracts/subscription_rules'

export interface UpdateSubscriptionDTO {
  subscriptionId: string
  plan?: string
  status?: string
  auto_renew?: boolean
  expires_at?: string | null
}

export default class UpdateSubscriptionCommand extends BaseCommand<UpdateSubscriptionDTO> {
  constructor(
    execCtx: AdminActionContext,
    private repo = AdminSubscriptionWriteOps
  ) {
    super(execCtx)
  }

  async handle(dto: UpdateSubscriptionDTO): Promise<void> {
    // Intentionally no executeInTransaction: this is a single-table subscription update.
    await this.repo.updateSubscription(dto.subscriptionId, {
      plan: toStorageSubscriptionPlan(dto.plan),
      status: dto.status,
      auto_renew: dto.auto_renew,
      expires_at: dto.expires_at,
    })
  }
}

```

### `app/modules/admin/actions/packages/queries/get_subscription_qr_catalog_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import {
  SUBSCRIPTION_PACKAGE_CATALOG,
  SUBSCRIPTION_PAYMENT_CONFIG,
} from '#modules/admin/constants/subscription_packages'
import { AdminSubscriptionReadOps } from '#modules/admin/infra/repositories/read/admin_subscription_queries'

export interface SubscriptionQrCatalogResult {
  paymentConfig: typeof SUBSCRIPTION_PAYMENT_CONFIG
  plans: typeof SUBSCRIPTION_PACKAGE_CATALOG
  stats: {
    total: number
    active: number
    expiringSoon: number
    cancelled: number
    byPlan: Record<string, number>
  }
}

export default class GetSubscriptionQrCatalogQuery extends BaseQuery<
  Record<string, never>,
  SubscriptionQrCatalogResult
> {
  constructor(
    execCtx: AdminActionContext,
    private repo = AdminSubscriptionReadOps
  ) {
    super(execCtx)
  }

  async handle(): Promise<SubscriptionQrCatalogResult> {
    const stats = await this.repo.getSubscriptionStats()

    return {
      paymentConfig: SUBSCRIPTION_PAYMENT_CONFIG,
      plans: SUBSCRIPTION_PACKAGE_CATALOG,
      stats,
    }
  }
}

```

### `app/modules/admin/actions/packages/queries/list_subscriptions_query.ts`

```ts
import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import { AdminSubscriptionReadOps } from '#modules/admin/infra/repositories/read/admin_subscription_queries'
import {
  toDisplaySubscriptionPlan,
  toStorageSubscriptionPlan,
} from '#modules/users/public_contracts/subscription_rules'

export interface ListSubscriptionsDTO {
  page?: number
  perPage?: number
  search?: string
  plan?: string
  status?: string
}

export interface ListSubscriptionsResult {
  stats: {
    total: number
    active: number
    expiringSoon: number
    cancelled: number
    byPlan: Record<string, number>
  }
  subscriptions: {
    id: string
    user_id: string
    username: string
    email: string | null
    system_role: string
    plan: string
    status: string
    started_at: string | null
    expires_at: string | null
    auto_renew: boolean
    created_at: string | null
    updated_at: string | null
  }[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export default class ListSubscriptionsQuery extends BaseQuery<
  ListSubscriptionsDTO,
  ListSubscriptionsResult
> {
  constructor(
    execCtx: AdminActionContext,
    private repo = AdminSubscriptionReadOps
  ) {
    super(execCtx)
  }

  async handle(dto: ListSubscriptionsDTO): Promise<ListSubscriptionsResult> {
    const page = dto.page ?? 1
    const perPage = dto.perPage ?? 20

    const [stats, result] = await Promise.all([
      this.repo.getSubscriptionStats(),
      this.repo.listSubscriptions(
        { search: dto.search, plan: toStorageSubscriptionPlan(dto.plan), status: dto.status },
        page,
        perPage
      ),
    ])

    return {
      stats: {
        ...stats,
        byPlan: {
          ...stats.byPlan,
          promax: stats.byPlan.enterprise ?? 0,
        },
      },
      subscriptions: result.subscriptions.map((subscription) => ({
        ...subscription,
        plan: toDisplaySubscriptionPlan(subscription.plan),
      })),
      meta: {
        total: result.total,
        perPage,
        currentPage: page,
        lastPage: Math.max(1, Math.ceil(result.total / perPage)),
      },
    }
  }
}

```

### `app/modules/admin/actions/permissions/queries/get_permission_matrix_query.ts`

```ts
import { BaseQuery } from '#modules/admin/actions/base_query'
import {
  describePermission,
  formatRoleLabel,
  getRoleDescription,
  listKnownOrganizationPermissions,
  listProjectPermissionCatalog,
  listSystemPermissionCatalog,
} from '#modules/authorization/public_contracts/access_surface'
import {
  ORG_ROLE_PERMISSIONS,
  PROJECT_ROLE_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
} from '#modules/authorization/public_contracts/permissions'

interface RoleMatrixEntry {
  code: string
  label: string
  description: string
  permissions: ReturnType<typeof describePermission>[]
  permissionCount: number
}

export interface PermissionMatrixResult {
  summary: {
    totalRoleGroups: number
    totalRoles: number
    totalUniquePermissions: number
  }
  systemRoles: RoleMatrixEntry[]
  organizationRoles: RoleMatrixEntry[]
  projectRoles: RoleMatrixEntry[]
  catalogs: {
    system: ReturnType<typeof listSystemPermissionCatalog>
    organization: ReturnType<typeof listKnownOrganizationPermissions>
    project: ReturnType<typeof listProjectPermissionCatalog>
  }
}

const buildRoleEntries = (map: Record<string, readonly string[]>): RoleMatrixEntry[] => {
  return Object.entries(map).map(([code, permissions]) => ({
    code,
    label: formatRoleLabel(code),
    description: getRoleDescription(code),
    permissions: permissions.map((permission) => describePermission(permission)),
    permissionCount: permissions.length,
  }))
}

export default class GetPermissionMatrixQuery extends BaseQuery<
  Record<string, never>,
  PermissionMatrixResult
> {
  handle(): Promise<PermissionMatrixResult> {
    const systemCatalog = listSystemPermissionCatalog()
    const organizationCatalog = listKnownOrganizationPermissions()
    const projectCatalog = listProjectPermissionCatalog()

    return Promise.resolve({
      summary: {
        totalRoleGroups: 3,
        totalRoles:
          Object.keys(SYSTEM_ROLE_PERMISSIONS).length +
          Object.keys(ORG_ROLE_PERMISSIONS).length +
          Object.keys(PROJECT_ROLE_PERMISSIONS).length,
        totalUniquePermissions: new Set([
          ...systemCatalog.map((entry) => entry.key),
          ...organizationCatalog.map((entry) => entry.key),
          ...projectCatalog.map((entry) => entry.key),
        ]).size,
      },
      systemRoles: buildRoleEntries(SYSTEM_ROLE_PERMISSIONS),
      organizationRoles: buildRoleEntries(ORG_ROLE_PERMISSIONS),
      projectRoles: buildRoleEntries(PROJECT_ROLE_PERMISSIONS),
      catalogs: {
        system: systemCatalog,
        organization: organizationCatalog,
        project: projectCatalog,
      },
    })
  }
}

```

### `app/modules/admin/actions/reviews/commands/resolve_flagged_review_command.ts`

```ts
import { Exception } from '@adonisjs/core/exceptions'

import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseCommand } from '#modules/admin/actions/base_command'
import { AdminFlaggedReviewReadOps } from '#modules/admin/infra/repositories/read/admin_flagged_review_queries'
import { AdminFlaggedReviewWriteOps } from '#modules/admin/infra/repositories/write/admin_flagged_review_mutations'

export interface ResolveFlaggedReviewDTO {
  flaggedReviewId: string
  action: 'dismiss' | 'confirm'
  notes?: string
}

export default class ResolveFlaggedReviewCommand extends BaseCommand<ResolveFlaggedReviewDTO> {
  constructor(
    execCtx: AdminActionContext,
    private readRepo = AdminFlaggedReviewReadOps,
    private writeRepo = AdminFlaggedReviewWriteOps
  ) {
    super(execCtx)
  }

  async handle(dto: ResolveFlaggedReviewDTO): Promise<void> {
    const reviewerId = this.getCurrentUserId()
    const flaggedReview = await this.readRepo.getFlaggedReviewDetail(dto.flaggedReviewId)
    if (!flaggedReview) {
      throw new Exception('Flagged review not found', { status: 404 })
    }

    if (flaggedReview.status !== 'pending') {
      throw new Exception('Flagged review already resolved', { status: 400 })
    }

    await this.writeRepo.resolve(dto.flaggedReviewId, dto.action, reviewerId, dto.notes)
  }
}

```
