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
  import('#modules/organizations/controllers/current/dashboard_controller')

// Member Management
const OrgListMembersController = () =>
  import('#modules/organizations/controllers/current/members/list_members_controller')
const OrgInviteMemberController = () =>
  import('#modules/organizations/controllers/current/members/invite_member_controller')
const OrgRemoveMemberController = () =>
  import('#modules/organizations/controllers/current/members/remove_member_controller')
const OrgUpdateMemberRoleController = () =>
  import('#modules/organizations/controllers/current/members/update_member_role_controller')

// Invitations & Join Requests
const OrgListJoinRequestsController = () =>
  import('#modules/organizations/controllers/current/invitations/list_join_requests_controller')
const OrgApproveJoinRequestController = () =>
  import('#modules/organizations/controllers/current/invitations/approve_join_request_controller')
const OrgListInvitationsController = () =>
  import('#modules/organizations/controllers/current/invitations/list_invitations_controller')

// Settings
const OrgShowSettingsController = () =>
  import('#modules/organizations/controllers/current/settings/show_settings_controller')
const OrgUpdateSettingsController = () =>
  import('#modules/organizations/controllers/current/settings/update_settings_controller')
const OrgShowRolesController = () =>
  import('#modules/organizations/controllers/current/access/show_roles_controller')
const OrgShowPermissionsController = () =>
  import('#modules/organizations/controllers/current/access/show_permissions_controller')
const OrgShowDepartmentsController = () =>
  import('#modules/organizations/controllers/current/access/show_departments_controller')
const OrgUpdateRolesController = () =>
  import('#modules/organizations/controllers/current/access/update_roles_controller')

// Projects (Organization-level)
const OrgListProjectsController = () =>
  import('#modules/organizations/controllers/current/projects/list_projects_controller')
const OrgShowProjectCreateController = () =>
  import('#modules/projects/controllers/create_project_controller')
const OrgCreateProjectController = () =>
  import('#modules/organizations/controllers/current/projects/create_project_controller')
const OrgShowProjectController = () =>
  import('#modules/organizations/controllers/current/projects/show_project_controller')
const ShowOrganizationSprintsWorkspaceController = () =>
  import('#modules/organizations/controllers/current/sprints/show_organization_sprints_workspace_controller')

// Tasks (Organization-level)
const OrgListTasksController = () =>
  import('#modules/organizations/controllers/current/tasks/list_tasks_controller')
const OrgShowTaskController = () =>
  import('#modules/organizations/controllers/current/tasks/show_task_controller')

// Workflow Customization
const OrgListTaskStatusesController = () =>
  import('#modules/organizations/controllers/current/workflow/list_task_statuses_controller')
const OrgCreateTaskStatusController = () =>
  import('#modules/organizations/controllers/current/workflow/create_task_status_controller')
const OrgListAuditLogsController = () =>
  import('#modules/admin/controllers/audit_logs/list_audit_logs_controller')
const ListMarketplaceTasksController = () =>
  import('#modules/marketplace/controllers/list_marketplace_tasks_controller')

// ================ ROUTE DEFINITIONS ================

router
  .group(() => {
    // ─── Dashboard ───
    router.get('/', [OrgDashboardController, 'handle']).as('org.dashboard')

    // ─── Member Management ───
    router
      .group(() => {
        router.get('/', [OrgListMembersController, 'handle']).as('org.members.index')
        router.post('/invite', [OrgInviteMemberController, 'handle']).as('org.members.invite')
        router
          .delete('/:memberId', [OrgRemoveMemberController, 'handle'])
          .as('org.members.destroy')
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
    router.get('/audit-logs', [OrgListAuditLogsController, 'orgHandle']).as('org.audit_logs.index')
    router
      .get('/marketplace/tasks', [ListMarketplaceTasksController, 'handle'])
      .as('org.marketplace.tasks')
    router
      .get('/sprints', [ShowOrganizationSprintsWorkspaceController, 'handle'])
      .as('org.sprints.index')

    // ─── Projects (Organization-level) ───
    router
      .group(() => {
        router.get('/', [OrgListProjectsController, 'handle']).as('org.projects.index')
        router.get('/create', [OrgShowProjectCreateController, 'handle']).as('org.projects.create')
        router.post('/', [OrgCreateProjectController, 'handle']).as('org.projects.store')
        router.get('/:projectId', [OrgShowProjectController, 'handle']).as('org.projects.show')
      })
      .prefix('/projects')

    // ─── Tasks (Organization-level) ───
    router
      .group(() => {
        router.get('/', [OrgListTasksController, 'handle']).as('org.tasks.index')
        router.get('/board', [OrgListTasksController, 'handle']).as('org.tasks.board')
        router.get('/list', [OrgListTasksController, 'handle']).as('org.tasks.list')
        router
          .get('/workflow', [OrgListTaskStatusesController, 'handle'])
          .as('org.tasks.workflow')
        router
          .post('/workflow', [OrgCreateTaskStatusController, 'handle'])
          .as('org.tasks.workflow.create')
        router.get('/:taskId', [OrgShowTaskController, 'handle']).as('org.tasks.show')
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
