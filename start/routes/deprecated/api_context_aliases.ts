import router from '@adonisjs/core/services/router'

import { middleware } from '../../kernel.js'

import { apiThrottle, throttle } from '#start/limiter'

const GetOrganizationMembersApiController = () =>
  import('#modules/http/controllers/organization/get_organization_members_api_controller')
const GetUsersInOrganizationApiController = () =>
  import('#modules/http/controllers/organization/get_users_in_organization_api_controller')
const PendingApprovalUsersApiController = () =>
  import('#modules/users/controllers/administration/pending_approval_users_api_controller')
const PendingApprovalCountApiController = () =>
  import('#modules/users/controllers/administration/pending_approval_count_api_controller')

/**
 * Deprecated organization-context aliases isolated from canonical route
 * modules so primary route files remain canonical-first for human readers.
 */
router
  .group(() => {
    router
      .get('/organization-members/:organizationId', [
        GetOrganizationMembersApiController,
        'handle',
      ])
      .as('api.organizations.members.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/organizations/:organizationId/members',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .get('/users-in-organization', [GetUsersInOrganizationApiController, 'handle'])
      .as('api.me.organizations.current.users.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/me/organizations/current/users',
          sunsetDate: '2026-12-31',
        }),
      ])
  })
  .prefix('/api')
  .use([
    middleware.bindHttpTransport('api-compat'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
    apiThrottle,
  ])

router
  .group(() => {
    router
      .get('/users/pending-approval', [PendingApprovalUsersApiController, 'handle'])
      .as('api.users.pending_approvals.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/users/pending-approvals',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .get('/users/pending-approval/count', [PendingApprovalCountApiController, 'handle'])
      .as('api.users.pending_approvals.count.alias.show')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/users/pending-approvals/count',
          sunsetDate: '2026-12-31',
        }),
      ])
  })
  .prefix('/api')
  .use([
    middleware.bindHttpTransport('api-compat'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
    middleware.requireOrg(),
    throttle,
  ])

router
  .group(() => {
    router
      .get('/users/pending-approval', [PendingApprovalUsersApiController, 'handle'])
      .as('api.v1.users.pending_approvals.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/users/pending-approvals',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .get('/users/pending-approval/count', [PendingApprovalCountApiController, 'handle'])
      .as('api.v1.users.pending_approvals.count.alias.show')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/users/pending-approvals/count',
          sunsetDate: '2026-12-31',
        }),
      ])
  })
  .prefix('/api/v1')
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
      .get('/organization-members/:organizationId', [
        GetOrganizationMembersApiController,
        'handle',
      ])
      .as('api.v1.organizations.members.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/organizations/:organizationId/members',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .get('/users-in-organization', [GetUsersInOrganizationApiController, 'handle'])
      .as('api.v1.me.organizations.current.users.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/users',
          sunsetDate: '2026-12-31',
        }),
      ])
  })
  .prefix('/api/v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    apiThrottle,
  ])
