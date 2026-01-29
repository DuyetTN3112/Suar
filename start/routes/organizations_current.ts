import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

/**
 * Current Organization Admin Routes
 *
 * Prefix: /org
 * Access: Organization Admin/Owner only
 *
 * Middleware stack:
 * - auth() → Ensure authenticated
 * - requireOrg() → Ensure current_organization_id exists
 * - requireOrgAdmin() → Check org_role (org_owner or org_admin)
 * - orgAdminContext() → Set organization context
 *
 * ⚠️ IMPORTANT:
 * These routes are for ORGANIZATION-level management, not system administration.
 * Organization admin ≠ System admin
 */

// ================ LAZY-LOADED CONTROLLERS ================
// Organization Dashboard
const OrgDashboardController = () =>
  import('#modules/organizations/dashboard/controllers/dashboard_controller')

// Member Management
const OrgListMembersController = () =>
  import('#modules/organizations/members/controllers/list_members_controller')
const OrgListMemberCandidatesController = () =>
  import('#modules/organizations/members/controllers/list_member_candidates_controller')
const OrgBulkAddMembersController = () =>
  import('#modules/organizations/members/controllers/bulk_add_members_controller')
const OrgInviteMemberController = () =>
  import('#modules/organizations/invitations/controllers/invite_member_controller')
const OrgRemoveMemberController = () =>
  import('#modules/organizations/members/controllers/remove_member_controller')
const OrgUpdateMemberRoleController = () =>
  import('#modules/organizations/members/controllers/update_member_role_controller')

// Invitations & Join Requests
const OrgListJoinRequestsController = () =>
  import('#modules/organizations/invitations/controllers/list_join_requests_controller')
const OrgApproveJoinRequestController = () =>
  import('#modules/organizations/invitations/controllers/approve_join_request_controller')
const OrgListInvitationsController = () =>
  import('#modules/organizations/invitations/controllers/list_invitations_controller')

// Settings
const OrgShowSettingsController = () =>
  import('#modules/organizations/settings/controllers/show_settings_controller')
const OrgUpdateSettingsController = () =>
  import('#modules/organizations/settings/controllers/update_settings_controller')
const OrgShowRolesController = () =>
  import('#modules/organizations/access/controllers/show_roles_controller')
const OrgShowPermissionsController = () =>
  import('#modules/organizations/access/controllers/show_permissions_controller')
const OrgShowDepartmentsController = () =>
  import('#modules/organizations/access/controllers/show_departments_controller')
const OrgUpdateRolesController = () =>
  import('#modules/organizations/access/controllers/update_roles_controller')

// Projects (Organization-level)
const OrgListProjectsController = () =>
  import('#modules/organizations/projects/controllers/list_projects_controller')
const OrgShowProjectCreateController = () =>
  import('#modules/projects/controllers/create_project_controller')
const OrgCreateProjectController = () =>
  import('#modules/organizations/projects/controllers/create_project_controller')
const OrgShowProjectController = () =>
  import('#modules/organizations/projects/controllers/show_project_controller')
const ShowOrganizationSprintsWorkspaceController = () =>
  import('#modules/organizations/sprints/controllers/show_organization_sprints_workspace_controller')

// Tasks (Organization-level)
const OrgListTasksController = () =>
  import('#modules/organizations/tasks/controllers/list_tasks_controller')
const OrgShowTaskController = () =>
  import('#modules/organizations/tasks/controllers/show_task_controller')

// Workflow Customization
const OrgListTaskStatusesController = () =>
  import('#modules/organizations/workflow/controllers/list_task_statuses_controller')
const OrgCreateTaskStatusController = () =>
  import('#modules/organizations/workflow/controllers/create_task_status_controller')
const OrgListAuditLogsController = () =>
  import('#modules/admin/audit_logs/controllers/list_audit_logs_controller')
const SearchPageController = () =>
  import('#modules/http/controllers/search_page_controller')
const OrgListNotificationsController = () =>
  import('#modules/notifications/controllers/list_notifications_controller')
const ListMarketplaceTasksController = () =>
  import('#modules/marketplace/controllers/list_marketplace_tasks_controller')
const ListOrganizationMarketplaceApplicationsController = () =>
  import('#modules/marketplace/controllers/list_organization_marketplace_applications_controller')
const ListMarketplaceTaskApplicationsController = () =>
  import('#modules/marketplace/controllers/list_marketplace_task_applications_controller')

// ================ ROUTE DEFINITIONS ================

router
  .group(() => {
    router.get('/', [OrgDashboardController, 'handle']).as('org.dashboard')
    router
      .get('/marketplace/tasks', [ListMarketplaceTasksController, 'handle'])
      .as('org.marketplace.tasks')
    router
      .get('/applications', [ListOrganizationMarketplaceApplicationsController, 'handle'])
      .as('org.applications.index')
    router.get('/search', [SearchPageController, 'handle']).as('org.search.index')
    router
      .get('/notifications', [OrgListNotificationsController, 'handle'])
      .as('org.notifications.index')
    router
      .get('/sprints', [ShowOrganizationSprintsWorkspaceController, 'handle'])
      .as('org.sprints.index')

    router
      .group(() => {
        router.get('/', [OrgListProjectsController, 'handle']).as('org.projects.index')
        router
          .get('/:projectId', [OrgShowProjectController, 'handle'])
          .where('projectId', router.matchers.uuid())
          .as('org.projects.show')
      })
      .prefix('/projects')

    router
      .group(() => {
        router.get('/', [OrgListTasksController, 'handle']).as('org.tasks.index')
        router.get('/board', [OrgListTasksController, 'handle']).as('org.tasks.board')
        router.get('/list', [OrgListTasksController, 'handle']).as('org.tasks.list')
        router
          .get('/:taskId/applications', [ListMarketplaceTaskApplicationsController, 'handle'])
          .where('taskId', router.matchers.uuid())
          .as('org.tasks.applications')
        router
          .get('/:taskId', [OrgShowTaskController, 'handle'])
          .where('taskId', router.matchers.uuid())
          .as('org.tasks.show')
      })
      .prefix('/tasks')
  })
  .prefix('/org')
  .use([middleware.auth(), middleware.requireOrg(), middleware.orgAdminContext()])

router
  .group(() => {
    // ─── Member Management ───
    router
      .group(() => {
        router.get('/', [OrgListMembersController, 'handle']).as('org.members.index')
        router
          .get('/candidates', [OrgListMemberCandidatesController, 'handle'])
          .as('org.members.candidates')
        router.post('/add', [OrgBulkAddMembersController, 'handle']).as('org.members.bulk_add')
        router.post('/invite', [OrgInviteMemberController, 'handle']).as('org.members.invite')
        router.delete('/:memberId', [OrgRemoveMemberController, 'handle']).as('org.members.destroy')
        router
          .put('/:memberId/role', [OrgUpdateMemberRoleController, 'handle'])
          .as('org.members.update_role')
      })
      .prefix('/members')

    // ─── Join Requests & Invitations ───
    router
      .group(() => {
        router
          .get('/requests', [OrgListJoinRequestsController, 'handle'])
          .as('org.join_requests.index')
        router
          .put('/requests/:joinRequestId/approve', [OrgApproveJoinRequestController, 'handle'])
          .as('org.join_requests.approvals.store')
        router.get('/', [OrgListInvitationsController, 'handle']).as('org.invitations.index')
      })
      .prefix('/invitations')

    // ─── Settings ───
    router
      .group(() => {
        router.get('/', [OrgShowSettingsController, 'handle']).as('org.settings.show')
        router.put('/', [OrgUpdateSettingsController, 'handle']).as('org.settings.update')
      })
      .prefix('/settings')

    router.get('/roles', [OrgShowRolesController, 'handle']).as('org.roles.index')
    router.put('/roles', [OrgUpdateRolesController, 'handle']).as('org.roles.update')
    router.get('/permissions', [OrgShowPermissionsController, 'handle']).as('org.permissions.index')
    router.get('/departments', [OrgShowDepartmentsController, 'handle']).as('org.departments.index')

    // ─── Projects (Organization-level) ───
    router
      .group(() => {
        router.get('/create', [OrgShowProjectCreateController, 'handle']).as('org.projects.create')
        router.post('/', [OrgCreateProjectController, 'handle']).as('org.projects.store')
      })
      .prefix('/projects')

    // ─── Tasks (Organization-level) ───
    router
      .group(() => {
        router
          .get('/workflow', [OrgListTaskStatusesController, 'handle'])
          .as('org.tasks.workflow')
        router
          .post('/workflow', [OrgCreateTaskStatusController, 'handle'])
          .as('org.tasks.workflow.create')
      })
      .prefix('/tasks')

    // ─── Workflow Customization (legacy compatibility alias) ───
    router
      .group(() => {
        router
          .get('/statuses', [OrgListTaskStatusesController, 'handle'])
          .as('org.workflow.statuses')
        router
          .post('/statuses', [OrgCreateTaskStatusController, 'handle'])
          .as('org.workflow.statuses.store')
      })
      .prefix('/workflow')
  })
  .prefix('/org')
  .use([
    middleware.auth(),
    middleware.requireOrg(),
    middleware.requireOrgAdmin(),
    middleware.orgAdminContext(),
  ])

router
  .group(() => {
    router.get('/audit-logs', [OrgListAuditLogsController, 'orgHandle']).as('org.audit_logs.index')
  })
  .prefix('/org')
  .use([
    middleware.auth(),
    middleware.requireOrg(),
    middleware.requireOrgPermission({ permission: 'can_view_audit_logs' }),
    middleware.orgAdminContext(),
  ])

    router
      .group(() => {
        router
          .post('/member-invitations', [OrgInviteMemberController, 'handle'])
          .as('api.v1.me.organizations.current.member_invitations.store')
        router
          .post('/members/add', [OrgBulkAddMembersController, 'handle'])
          .as('api.v1.me.organizations.current.members.bulk_add')
        router
          .delete('/members/:memberId', [OrgRemoveMemberController, 'handle'])
          .as('api.v1.me.organizations.current.members.destroy')
    router
      .put('/members/:memberId/role', [OrgUpdateMemberRoleController, 'handle'])
      .as('api.v1.me.organizations.current.members.role.update')
    router
      .put('/join-requests/:joinRequestId/approve', [OrgApproveJoinRequestController, 'handle'])
      .as('api.v1.me.organizations.current.join_requests.approvals.store')
    router
      .put('/roles', [OrgUpdateRolesController, 'handle'])
      .as('api.v1.me.organizations.current.roles.update')
    router
      .post('/projects', [OrgCreateProjectController, 'handle'])
      .as('api.v1.me.organizations.current.projects.store')
    router
      .get('/task-statuses', [OrgListTaskStatusesController, 'handle'])
      .as('api.v1.me.organizations.current.task_statuses.index')
    router
      .post('/task-statuses', [OrgCreateTaskStatusController, 'handle'])
      .as('api.v1.me.organizations.current.task_statuses.store')
  })
  .prefix('/api/v1/me/organizations/current')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    middleware.requireOrgAdmin(),
    middleware.orgAdminContext(),
  ])
