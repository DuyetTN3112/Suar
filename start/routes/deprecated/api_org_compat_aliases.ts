import router from '@adonisjs/core/services/router'

import { middleware } from '../../kernel.js'

import { throttle } from '#start/limiter'

const TalentsSearchController = () => import('#modules/users/controllers/talents_search_controller')
const TalentDetailController = () => import('#modules/users/controllers/talent_detail_controller')
const RecruiterBookmarksController = () =>
  import('#modules/users/controllers/recruiter_bookmarks_controller')

const ListOrgReviewDisputesController = () =>
  import('#modules/reviews/controllers/list_org_review_disputes_controller')
const RespondToReviewDisputeController = () =>
  import('#modules/reviews/controllers/respond_to_review_dispute_controller')

/**
 * Deprecated compatibility aliases under `/api/org/*` and the deprecated
 * pluralized recruiter bookmark dialect. Keep them isolated so the primary
 * route-family files remain easier to read as canonical-first surfaces.
 */

router
  .group(() => {
    router
      .get('/org/talents/search', [TalentsSearchController, 'handle'])
      .as('api.me.organizations.current.talents.search.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/talents/search',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .get('/org/talents/:userId', [TalentDetailController, 'handle'])
      .as('api.me.organizations.current.talents.alias.show')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/talents/:userId',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .post('/org/talents/:userId/bookmarks', [RecruiterBookmarksController, 'store'])
      .as('api.me.organizations.current.talents.bookmarks.alias.store')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/talents/:userId/bookmarks',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .delete('/org/talents/:userId/bookmarks', [RecruiterBookmarksController, 'destroyByTalent'])
      .as('api.me.organizations.current.talents.bookmarks.alias.destroy')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/talents/:userId/bookmarks',
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
      .get('/org/reviews/disputes', [ListOrgReviewDisputesController, 'handle'])
      .as('api.me.organizations.current.reviews.disputes.alias.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/reviews/disputes',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .post('/org/reviews/disputes/:disputeId/respond', [
        RespondToReviewDisputeController,
        'handle',
      ])
      .as('api.me.organizations.current.reviews.disputes.alias.responses.store')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/me/organizations/current/reviews/disputes/:disputeId/respond',
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
      .get('/recruiters/bookmarks', [RecruiterBookmarksController, 'index'])
      .as('api.recruiters.bookmarks.index')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/talent-bookmarks',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .post('/recruiters/bookmarks', [RecruiterBookmarksController, 'store'])
      .as('api.recruiters.bookmarks.store')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/talent-bookmarks',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .patch('/recruiters/bookmarks/:bookmarkId', [RecruiterBookmarksController, 'update'])
      .as('api.recruiters.bookmarks.update')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/talent-bookmarks',
          sunsetDate: '2026-12-31',
        }),
      ])
    router
      .delete('/recruiters/bookmarks/:bookmarkId', [RecruiterBookmarksController, 'destroy'])
      .as('api.recruiters.bookmarks.destroy')
      .use([
        middleware.markDeprecatedRoute({
          replacementPath: '/api/v1/talent-bookmarks',
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
