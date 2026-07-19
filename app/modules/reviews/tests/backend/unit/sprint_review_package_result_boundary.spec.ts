import { test } from '@japa/runner'

import type { ReviewSprintPackageReader } from '#modules/reviews/actions/ports/outbound/review_sprint_package_reader'
import ListPendingSprintReviewPackagesQuery from '#modules/reviews/actions/queries/sprint-review/list_pending_sprint_review_packages_query'
import ListSprintReviewPackagesQuery from '#modules/reviews/actions/queries/sprint-review/list_sprint_review_packages_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

const anonymousContext: ReviewActionContext = {
  userId: null,
  ip: '',
  userAgent: '',
  organizationId: null,
}

const packageReader: ReviewSprintPackageReader = {
  listForReviewer: () => Promise.resolve({ rows: [], total: 0 }),
  listPendingForReviewer: () => Promise.resolve({ rows: [], total: 0 }),
  findDetail: () => Promise.resolve(null),
  listManagerReviews: () => Promise.resolve([]),
  listEnvironmentReviews: () => Promise.resolve([]),
  listManagerEvidence: () => Promise.resolve([]),
  findDispute: () => Promise.resolve(null),
}

test.group('Unit | Sprint review package Result boundary', () => {
  test('wraps pending-package authorization failures', async ({ assert }) => {
    const result = await new ListPendingSprintReviewPackagesQuery(
      anonymousContext,
      packageReader
    ).executeAndWrap({})

    assert.isTrue(result.isFailure())
    const error = result.getError()
    assert.equal(error.code, 'E_UNAUTHORIZED')
  })

  test('wraps submitted-package authorization failures', async ({ assert }) => {
    const result = await new ListSprintReviewPackagesQuery(
      anonymousContext,
      packageReader
    ).executeAndWrap({})

    assert.isTrue(result.isFailure())
    const error = result.getError()
    assert.equal(error.code, 'E_UNAUTHORIZED')
  })
})
