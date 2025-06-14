import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

/**
 * Organization Admin Routes
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
const OrgDashboardController = () => import('#controllers/organization/dashboard_controller')

// Member Management
const OrgListMembersController = () =>
  import('#controllers/organization/members/list_members_controller')
const OrgInviteMemberController = () =>
  import('#controllers/organization/members/invite_member_controller')
const OrgRemoveMemberController = () =>
  import('#controllers/organization/members/remove_member_controller')
const OrgUpdateMemberRoleController = () =>
  import('#controllers/organization/members/update_member_role_controller')

// Invitations & Join Requests
const OrgListJoinRequestsController = () =>
  import('#controllers/organization/invitations/list_join_requests_controller')
const OrgApproveJoinRequestController = () =>
  import('#controllers/organization/invitations/approve_join_request_controller')
const OrgListInvitationsController = () =>
  import('#controllers/organization/invitations/list_invitations_controller')

// Settings
const OrgShowSettingsController = () =>
  import('#controllers/organization/settings/show_settings_controller')
const OrgUpdateSettingsController = () =>
  import('#controllers/organization/settings/update_settings_controller')

// Projects (Organization-level)
const OrgListProjectsController = () =>
  import('#controllers/organization/projects/list_projects_controller')
const OrgCreateProjectController = () =>
  import('#controllers/organization/projects/create_project_controller')

// Workflow Customization
const OrgListTaskStatusesController = () =>
  import('#controllers/organization/workflow/list_task_statuses_controller')
const OrgCreateTaskStatusController = () =>
  import('#controllers/organization/workflow/create_task_status_controller')

// Billing (Owner only)
const OrgShowBillingController = () =>
  import('#controllers/organization/billing/show_billing_controller')
const OrgUpdatePlanController = () =>
  import('#controllers/organization/billing/update_plan_controller')

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
        router
          .get('/requests', [OrgListJoinRequestsController, 'handle'])
          .as('org.requests.index')
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

    // ─── Projects (Organization-level) ───
    router
      .group(() => {
        router.get('/', [OrgListProjectsController, 'handle']).as('org.projects.index')
        router.post('/', [OrgCreateProjectController, 'handle']).as('org.projects.create')
      })
      .prefix('/projects')

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

    // ─── Billing (Owner only) ───
    router
      .group(() => {
        router.get('/', [OrgShowBillingController, 'handle']).as('org.billing.show')
        router.put('/plan', [OrgUpdatePlanController, 'handle']).as('org.billing.updatePlan')
      })
      .prefix('/billing')
      .use(middleware.requireOrgOwner()) // ← Stricter: Owner only
  })
  .prefix('/org')
  .use([
    middleware.auth(),
    middleware.requireOrg(),
    middleware.requireOrgAdmin(),
    middleware.orgAdminContext(),
  ])
