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
const AdminListProficiencyScalesController = () =>
  import('#modules/admin/controllers/proficiency/list_proficiency_scales_controller')
const AdminShowProficiencyScaleController = () =>
  import('#modules/admin/controllers/proficiency/show_proficiency_scale_controller')
const AdminShowSkillRubricController = () =>
  import('#modules/admin/controllers/proficiency/show_skill_rubric_controller')


// ================ ROUTE DEFINITIONS ================

router
  .group(() => {
    router.post('/toggle', [AdminToggleAdminModeController, 'handle']).as('admin.mode.switch')

    // ─── Dashboard ───
    router.get('/', [AdminDashboardController, 'handle']).as('admin.dashboard.show')
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
        router.get('/:userId', [AdminShowUserController, 'handle']).as('admin.users.show')
        router
          .put('/:userId/role', [AdminUpdateUserRoleController, 'handle'])
          .as('admin.users.update_role')
        router
          .put('/:userId/suspend', [AdminSuspendUserController, 'handle'])
          .as('admin.users.suspend')
        router
          .put('/:userId/activate', [AdminSuspendUserController, 'handle'])
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
          .get('/:organizationId', [AdminShowOrganizationController, 'handle'])
          .as('admin.organizations.show')
      })
      .prefix('/organizations')

    // ─── Audit Logs ───
    router.get('/audit-logs', [AdminListAuditLogsController, 'handle']).as('admin.audit_logs.index')
    router
      .group(() => {
        router.get('/', [AdminShowPermissionsController, 'system']).as('admin.permissions.index')
        router.get('/system', [AdminShowPermissionsController, 'system']).as('admin.permissions.system')
        router.get('/system/custom-roles/create', [() => import('#modules/admin/controllers/permissions/custom_system_role_controller'), 'create']).as('admin.permissions.custom_roles.create')
        router.get('/system/custom-roles/:id/edit', [() => import('#modules/admin/controllers/permissions/custom_system_role_controller'), 'edit']).as('admin.permissions.custom_roles.edit')
        router.post('/system/custom-roles', [() => import('#modules/admin/controllers/permissions/custom_system_role_controller'), 'store']).as('admin.permissions.custom_roles.store')
        router.put('/system/custom-roles/:id', [() => import('#modules/admin/controllers/permissions/custom_system_role_controller'), 'update']).as('admin.permissions.custom_roles.update')
        router.delete('/system/custom-roles/:id', [() => import('#modules/admin/controllers/permissions/custom_system_role_controller'), 'destroy']).as('admin.permissions.custom_roles.destroy')
        router.get('/organization', [AdminShowPermissionsController, 'organization']).as('admin.permissions.organization')
        router.get('/project', [AdminShowPermissionsController, 'project']).as('admin.permissions.project')
      })
      .prefix('/permissions')
    router.get('/qr-codes', [AdminShowQrCodesController, 'handle']).as('admin.qr_codes.show')

    // ─── Proficiency & Rubrics ───
    router
      .group(() => {
        router.get('/', [AdminListProficiencyScalesController, 'handle']).as('admin.proficiency.index')
        router
          .get('/:proficiencyScaleId', [AdminShowProficiencyScaleController, 'handle'])
          .as('admin.proficiency.show')
        router
          .get('/rubrics/:skillId', [AdminShowSkillRubricController, 'handle'])
          .as('admin.proficiency.rubrics.show')
      })
      .prefix('/proficiency')

    // ─── Flagged Reviews ───
    router
      .group(() => {
        router.get('/', [AdminListFlaggedReviewsController, 'handle']).as('admin.reviews.flagged')
        router
          .get('/:flaggedReviewId', [AdminShowFlaggedReviewController, 'handle'])
          .as('admin.reviews.show')
        router
          .put('/:flaggedReviewId/resolve', [AdminResolveFlaggedReviewController, 'handle'])
          .as('admin.reviews.resolutions.store')
      })
      .prefix('/reviews')

    // ─── Review Disputes ───
    router
      .group(() => {
        router.get('/', [AdminDisputesController, 'index']).as('admin.disputes.index')
        router
          .get('/ai-operator', [AdminDisputesController, 'aiOperator'])
          .as('admin.disputes.ai_operator.show')
        router.get('/:disputeId', [AdminDisputesController, 'show']).as('admin.disputes.show')
      })
      .prefix('/disputes')


    // ─── Package Management ───
    router
      .group(() => {
        router.get('/', [AdminListPackagesController, 'handle']).as('admin.packages.index')
        router
          .put('/:subscriptionId', [AdminUpdatePackageController, 'handle'])
          .as('admin.packages.update')
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
      'api.admin.dashboard.show'
    )
    router.get('/api/admin/users', [AdminListUsersController, 'apiIndex']).as('api.admin.users.index')
    router
      .get('/api/admin/organizations', [AdminListOrganizationsController, 'apiIndex'])
      .as('api.admin.organizations.index')
    router
      .get('/api/admin/audit-logs', [AdminListAuditLogsController, 'apiIndex'])
      .as('api.admin.audit_logs.index')
  })
  .use([
    middleware.bindHttpTransport('api-admin-internal'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
    middleware.requireSystemAdmin(),
    middleware.systemAdminContext(),
  ])
