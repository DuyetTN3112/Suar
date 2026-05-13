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
const OrgCreateProjectController = () =>
  import('#modules/organizations/controllers/current/projects/create_project_controller')

// Tasks (Organization-level)
const OrgListTasksController = () =>
  import('#modules/organizations/controllers/current/tasks/list_tasks_controller')

// Workflow Customization
const OrgListTaskStatusesController = () =>
  import('#modules/organizations/controllers/current/workflow/list_task_statuses_controller')
const OrgCreateTaskStatusController = () =>
  import('#modules/organizations/controllers/current/workflow/create_task_status_controller')

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
        router.delete('/:id', [OrgRemoveMemberController, 'handle']).as('org.members.remove')
        router
          .put('/:id/role', [OrgUpdateMemberRoleController, 'handle'])
          .as('org.members.updateRole')
      })
      .prefix('/members')

    // ─── Join Requests & Invitations ───
    router
      .group(() => {
        router.get('/requests', [OrgListJoinRequestsController, 'handle']).as('org.requests.index')
        router
          .put('/requests/:id/approve', [OrgApproveJoinRequestController, 'handle'])
          .as('org.requests.approve')
        router
          .get('/invitations', [OrgListInvitationsController, 'handle'])
          .as('org.invitations.index')
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
        router.get('/', [OrgListProjectsController, 'handle']).as('org.projects.index')
        router.post('/', [OrgCreateProjectController, 'handle']).as('org.projects.create')
      })
      .prefix('/projects')

    // ─── Tasks (Organization-level) ───
    router
      .group(() => {
        router.get('/', [OrgListTasksController, 'handle']).as('org.tasks.index')
      })
      .prefix('/tasks')

    // ─── Workflow Customization ───
    router
      .group(() => {
        router
          .get('/statuses', [OrgListTaskStatusesController, 'handle'])
          .as('org.workflow.statuses')
        router
          .post('/statuses', [OrgCreateTaskStatusController, 'handle'])
          .as('org.workflow.createStatus')
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
