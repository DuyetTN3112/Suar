import { test } from '@japa/runner'

import type { ReviewSprintPackageReader } from '#modules/reviews/actions/ports/outbound/review_sprint_package_reader'
import GetSprintReviewPackageDetailQuery from '#modules/reviews/actions/queries/sprint-review/get_sprint_review_package_detail_query'
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

test.group('Unit | Sprint review package detail Result boundary', () => {
  test('wraps package-detail authorization failures', async ({ assert }) => {
    const result = await new GetSprintReviewPackageDetailQuery(
      anonymousContext,
      packageReader
    ).executeAndWrap('package-1')

    assert.isTrue(result.isFailure())
    const error = result.getError()
    assert.equal(error.code, 'E_UNAUTHORIZED')
  })
})
