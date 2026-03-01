import router from '@adonisjs/core/services/router'

import { middleware } from '../../kernel.js'

import { throttle } from '#start/limiter'

const OrgInviteMemberController = () =>
  import('#modules/organizations/invitations/controllers/invite_member_controller')
const OrgRemoveMemberController = () =>
  import('#modules/organizations/members/controllers/remove_member_controller')
const OrgUpdateMemberRoleController = () =>
  import('#modules/organizations/members/controllers/update_member_role_controller')
const OrgApproveJoinRequestController = () =>
  import('#modules/organizations/invitations/controllers/approve_join_request_controller')
const OrgUpdateRolesController = () =>
  import('#modules/organizations/access/controllers/update_roles_controller')
const OrgCreateProjectController = () =>
  import('#modules/organizations/projects/controllers/create_project_controller')
const OrgListTaskStatusesController = () =>
  import('#modules/organizations/workflow/controllers/list_task_statuses_controller')
const OrgCreateTaskStatusController = () =>
  import('#modules/organizations/workflow/controllers/create_task_status_controller')

const ListOrgReviewDisputesController = () =>
  import('#modules/reviews/controllers/list_org_review_disputes_controller')
const RespondToReviewDisputeController = () =>
  import('#modules/reviews/controllers/respond_to_review_dispute_controller')

const TalentsSearchController = () => import('#modules/users/controllers/talents_search_controller')
const TalentDetailController = () => import('#modules/users/controllers/talent_detail_controller')
const RecruiterBookmarksController = () =>
  import('#modules/users/controllers/recruiter_bookmarks_controller')

/**
 * Deprecated canonical-generation aliases under `/api/v1/org/*`.
 *
 * Keep these aliases isolated from the primary route-family files so the
 * canonical `/api/v1/me/organizations/current/*` surface remains the obvious
 * source of truth for humans reading `start/routes/*`.
 */

router
  .group(() => {
    router
      .post('/members/invite', [OrgInviteMemberController, 'handle'])
      .as('api.v1.me.organizations.current.member_invitations.alias.store')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/member-invitations',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .delete('/members/:memberId', [OrgRemoveMemberController, 'handle'])
      .as('api.v1.me.organizations.current.members.alias.destroy')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/members/:memberId',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .put('/members/:memberId/role', [OrgUpdateMemberRoleController, 'handle'])
      .as('api.v1.me.organizations.current.members.role.alias.update')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/members/:memberId/role',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .put('/invitations/requests/:joinRequestId/approve', [
        OrgApproveJoinRequestController,
        'handle',
      ])
      .as('api.v1.me.organizations.current.join_requests.alias.approvals.store')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/join-requests/:joinRequestId/approve',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .put('/roles', [OrgUpdateRolesController, 'handle'])
      .as('api.v1.me.organizations.current.roles.alias.update')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/roles',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .post('/projects', [OrgCreateProjectController, 'handle'])
      .as('api.v1.me.organizations.current.projects.alias.store')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/projects',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .get('/tasks/workflow', [OrgListTaskStatusesController, 'handle'])
      .as('api.v1.me.organizations.current.task_statuses.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/task-statuses',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .post('/tasks/workflow', [OrgCreateTaskStatusController, 'handle'])
      .as('api.v1.me.organizations.current.task_statuses.alias.store')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/task-statuses',
          sunsetDate: '2026-12-31',
        }),
      ])
  })
  .prefix('/api/v1/org')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    middleware.requireOrgAdmin(),
    middleware.orgAdminContext(),
  ])

router
  .group(() => {
    router
      .get('/reviews/disputes', [ListOrgReviewDisputesController, 'handle'])
      .as('api.v1.me.organizations.current.reviews.disputes.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/reviews/disputes',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .post('/reviews/disputes/:disputeId/respond', [RespondToReviewDisputeController, 'handle'])
      .as('api.v1.me.organizations.current.reviews.disputes.alias.responses.store')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/reviews/disputes/:disputeId/respond',
          sunsetDate: '2026-12-31',
        }),
      ])
  })
  .prefix('/api/v1/org')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    throttle,
  ])

router
  .group(() => {
    router
      .get('/talents/search', [TalentsSearchController, 'handle'])
      .as('api.v1.me.organizations.current.talents.search.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/talents/search',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .get('/talents/:userId', [TalentDetailController, 'handle'])
      .as('api.v1.me.organizations.current.talents.alias.show')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/talents/:userId',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .post('/talents/:userId/bookmarks', [RecruiterBookmarksController, 'store'])
      .as('api.v1.me.organizations.current.talents.bookmarks.alias.store')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/talents/:userId/bookmarks',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .delete('/talents/:userId/bookmarks', [RecruiterBookmarksController, 'destroyByTalent'])
      .as('api.v1.me.organizations.current.talents.bookmarks.alias.destroy')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/talents/:userId/bookmarks',
          sunsetDate: '2026-12-31',
        }),
      ])
  })
  .prefix('/api/v1/org')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    throttle,
  ])
