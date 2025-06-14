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

// Flagged Reviews
const AdminListFlaggedReviewsController = () =>
  import('#controllers/admin/reviews/list_flagged_reviews_controller')
const AdminResolveFlaggedReviewController = () =>
  import('#controllers/admin/reviews/resolve_flagged_review_controller')

// ================ ROUTE DEFINITIONS ================

router
  .group(() => {
    // ─── Dashboard ───
    router.get('/', [AdminDashboardController, 'handle']).as('admin.dashboard')

    // ─── User Management ───
    router
      .group(() => {
        router.get('/', [AdminListUsersController, 'handle']).as('admin.users.index')
        router.get('/:id', [AdminShowUserController, 'handle']).as('admin.users.show')
        router
          .put('/:id/role', [AdminUpdateUserRoleController, 'handle'])
          .as('admin.users.updateRole')
        router
          .put('/:id/suspend', [AdminSuspendUserController, 'handle'])
          .as('admin.users.suspend')
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

    // ─── Flagged Reviews ───
    router
      .group(() => {
        router.get('/', [AdminListFlaggedReviewsController, 'handle']).as('admin.reviews.flagged')
        router
          .put('/:id/resolve', [AdminResolveFlaggedReviewController, 'handle'])
          .as('admin.reviews.resolve')
      })
      .prefix('/reviews')

    // TODO: Future routes
    // - /admin/subscriptions (subscription management)
    // - /admin/qr-codes (payment QR generation)
    // - /admin/settings (system settings)
  })
  .prefix('/admin')
  .use([middleware.auth(), middleware.requireSystemAdmin(), middleware.systemAdminContext()])
