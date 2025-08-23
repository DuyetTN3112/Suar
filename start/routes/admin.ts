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
const AdminDashboardController = () => import('#controllers/admin/dashboard_controller')
const AdminToggleAdminModeController = () =>
  import('#controllers/admin/toggle_admin_mode_controller')

// User Management
const AdminListUsersController = () => import('#controllers/admin/users/list_users_controller')
const AdminShowUserController = () => import('#controllers/admin/users/show_user_controller')
const AdminUpdateUserRoleController = () =>
  import('#controllers/admin/users/update_user_role_controller')
const AdminSuspendUserController = () => import('#controllers/admin/users/suspend_user_controller')

// Organization Management
const AdminListOrganizationsController = () =>
  import('#controllers/admin/organizations/list_organizations_controller')
const AdminShowOrganizationController = () =>
  import('#controllers/admin/organizations/show_organization_controller')

// Audit Logs
const AdminListAuditLogsController = () =>
  import('#controllers/admin/audit_logs/list_audit_logs_controller')
const AdminShowPermissionsController = () =>
  import('#controllers/admin/permissions/show_permissions_controller')

// Flagged Reviews
const AdminListFlaggedReviewsController = () =>
  import('#controllers/admin/reviews/list_flagged_reviews_controller')
const AdminResolveFlaggedReviewController = () =>
  import('#controllers/admin/reviews/resolve_flagged_review_controller')
const AdminShowFlaggedReviewController = () =>
  import('#controllers/admin/reviews/show_flagged_review_controller')
const AdminListPackagesController = () =>
  import('#controllers/admin/packages/list_packages_controller')
const AdminUpdatePackageController = () =>
  import('#controllers/admin/packages/update_package_controller')
const AdminShowQrCodesController = () =>
  import('#controllers/admin/packages/show_qr_codes_controller')

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
