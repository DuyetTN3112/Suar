import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

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
const AdminDashboardController = () => import('#modules/admin/dashboard/controllers/dashboard_controller')

// User Management
const AdminListUsersController = () =>
  import('#modules/admin/users/controllers/list_users_controller')
const AdminShowUserController = () =>
  import('#modules/admin/users/controllers/show_user_controller')
const AdminUpdateUserRoleController = () =>
  import('#modules/admin/users/controllers/update_user_role_controller')
const AdminSuspendUserController = () =>
  import('#modules/admin/users/controllers/suspend_user_controller')
const SystemUsersApiController = () =>
  import('#modules/users/controllers/system_users_api_controller')

// Organization Management
const AdminListOrganizationsController = () =>
  import('#modules/admin/organizations/controllers/list_organizations_controller')
const AdminShowOrganizationController = () =>
  import('#modules/admin/organizations/controllers/show_organization_controller')

// Audit Logs
const AdminListAuditLogsController = () =>
  import('#modules/admin/audit_logs/controllers/list_audit_logs_controller')
const AdminShowPermissionsController = () =>
  import('#modules/admin/permissions/controllers/show_permissions_controller')
const SearchPageController = () =>
  import('#modules/http/controllers/search_page_controller')
const AdminListNotificationsController = () =>
  import('#modules/notifications/controllers/list_notifications_controller')

// Flagged Reviews
const AdminListFlaggedReviewsController = () =>
  import('#modules/admin/reviews/controllers/list_flagged_reviews_controller')
const AdminResolveFlaggedReviewController = () =>
  import('#modules/admin/reviews/controllers/resolve_flagged_review_controller')
const AdminShowFlaggedReviewController = () =>
  import('#modules/admin/reviews/controllers/show_flagged_review_controller')
const AdminListPackagesController = () =>
  import('#modules/admin/packages/controllers/list_packages_controller')
const AdminUpdatePackageController = () =>
  import('#modules/admin/packages/controllers/update_package_controller')
const AdminShowQrCodesController = () =>
  import('#modules/admin/packages/controllers/show_qr_codes_controller')

// Review Disputes
const AdminDisputesController = () =>
  import('#modules/admin/disputes/controllers/admin_disputes_controller')
const AdminListProficiencyScalesController = () =>
  import('#modules/admin/proficiency/controllers/list_proficiency_scales_controller')
const AdminShowProficiencyScaleController = () =>
  import('#modules/admin/proficiency/controllers/show_proficiency_scale_controller')
const AdminShowSkillRubricController = () =>
  import('#modules/admin/proficiency/controllers/show_skill_rubric_controller')
const AdminMutateSkillRubricController = () =>
  import('#modules/admin/proficiency/controllers/mutate_skill_rubric_controller')


// ================ ROUTE DEFINITIONS ================

router
  .group(() => {
    // ─── Dashboard ───
    router.get('/', [AdminDashboardController, 'handle']).as('admin.dashboard.show')
    router.get('/search', [SearchPageController, 'handle']).as('admin.search.index')
    router
      .get('/notifications', [AdminListNotificationsController, 'handle'])
      .as('admin.notifications.index')
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
        router.get('/system/custom-roles/create', [() => import('#modules/admin/permissions/controllers/custom_system_role_controller'), 'create']).as('admin.permissions.custom_roles.create')
        router.get('/system/custom-roles/:id/edit', [() => import('#modules/admin/permissions/controllers/custom_system_role_controller'), 'edit']).as('admin.permissions.custom_roles.edit')
        router.post('/system/custom-roles', [() => import('#modules/admin/permissions/controllers/custom_system_role_controller'), 'store']).as('admin.permissions.custom_roles.store')
        router.put('/system/custom-roles/:id', [() => import('#modules/admin/permissions/controllers/custom_system_role_controller'), 'update']).as('admin.permissions.custom_roles.update')
        router.delete('/system/custom-roles/:id', [() => import('#modules/admin/permissions/controllers/custom_system_role_controller'), 'destroy']).as('admin.permissions.custom_roles.destroy')
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
        router
          .post('/rubrics/:skillId/drafts', [AdminMutateSkillRubricController, 'createDraft'])
          .as('admin.proficiency.rubrics.drafts.store')
        router
          .put('/rubrics/versions/:versionId/levels/:levelId', [
            AdminMutateSkillRubricController,
            'upsertLevel',
          ])
          .as('admin.proficiency.rubrics.levels.upsert')
        router
          .post('/rubrics/versions/:versionId/publish', [
            AdminMutateSkillRubricController,
            'publish',
          ])
          .as('admin.proficiency.rubrics.publish')
      })
      .prefix('/proficiency')

    // ─── Flagged Reviews ───
    router
      .get('/flagged-reviews', ({ response }) => {
        response.redirect().toPath('/admin/reviews')
      })
      .as('admin.flagged_reviews.legacy')
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

router
  .get('/api/system-users', [SystemUsersApiController, 'handle'])
  .as('api.users.system_users.index')
  .use([
    middleware.bindHttpTransport('api-compat'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
    middleware.requireSystemAdmin(),
    middleware.systemAdminContext(),
    throttle,
  ])

router
  .get('/api/v1/system-users', [SystemUsersApiController, 'handle'])
  .as('api.v1.users.system_users.index')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
    middleware.requireSystemAdmin(),
    middleware.systemAdminContext(),
    throttle,
  ])
