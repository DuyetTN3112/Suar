import { test } from '@japa/runner'

import { CACHE_COLLECTION_GENERATION_NAMESPACES } from '#modules/cache/public_contracts/cache_contract'
import GetPendingReviewsQuery, {
  type GetPendingReviewsDependencies,
} from '#modules/reviews/actions/queries/review-submission/get_pending_reviews_query'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'

const unusedDependencies: GetPendingReviewsDependencies = {
  projectMembership: {
    listProjectIdsForMember: () => Promise.resolve([]),
  },
  taskAssignment: {
    findReviewAssignmentContextsV1: () => Promise.resolve([]),
    listAssignmentIdsByProjectIdsIncludingDeletedTasks: () => Promise.resolve([]),
  },
  moderatorIdentity: {
    findByIds: () => Promise.resolve([]),
  },
  sessions: {
    loadActorAccess: () => Promise.reject(new Error('unused session actor access')),
    paginateEvidence: () => Promise.reject(new Error('unused evidence pagination')),
    findProjectionSource: () => Promise.reject(new Error('unused session projection')),
    findIdentity: () => Promise.reject(new Error('unused session identity')),
    findConfirmationSource: () => Promise.reject(new Error('unused confirmation source')),
    findSelfAssessment: () => Promise.reject(new Error('unused self assessment')),
    findPendingForReviewer: () =>
      Promise.resolve({
        data: [],
        total: 0,
        nextCursor: null,
        previousCursor: null,
        hasNextPage: false,
        hasPreviousPage: false,
      }),
    paginateByReviewee: () =>
      Promise.resolve({
        data: [],
        total: 0,
        perPage: 20,
        currentPage: 1,
        lastPage: 1,
      }),
  },
}

class InspectableGetPendingReviewsQuery extends GetPendingReviewsQuery {
  cacheKey: string | null = null
  logicalCacheKey: string | null = null
  generationNamespaces: readonly string[] = []
  ttl: number | null = null

  protected override resolveVersionedCacheKey(
    namespaces: readonly string[],
    logicalKey: string
  ): Promise<string | null> {
    this.generationNamespaces = namespaces
    this.logicalCacheKey = logicalKey
    return Promise.resolve(`physical:${logicalKey}`)
  }

  protected override executeWithCache<T>(
    cacheKey: string,
    ttl: number,
    callback: () => Promise<T>
  ): Promise<T> {
    this.cacheKey = cacheKey
    this.ttl = ttl
    return callback()
  }
}

test.group('Get pending reviews cache generation', () => {
  test('partitions every cursor window by global and reviewer generations', async ({ assert }) => {
    const query = new InspectableGetPendingReviewsQuery(
      makeSystemReviewActionContext('reviewer-1'),
      unusedDependencies
    )

    const result = await query.handle({
      page: 1,
      per_page: 20,
      after: 'opaque-cursor',
    })

    assert.deepEqual(query.generationNamespaces, [
      CACHE_COLLECTION_GENERATION_NAMESPACES.pendingReviews,
      `${CACHE_COLLECTION_GENERATION_NAMESPACES.pendingReviews}:user:reviewer-1`,
    ])
    assert.equal(
      query.logicalCacheKey,
      'user:pending_reviews:v3:after:opaque-cursor:before::perPage:20:userId:reviewer-1'
    )
    assert.equal(query.cacheKey, `physical:${query.logicalCacheKey ?? ''}`)
    assert.equal(query.ttl, 60)
    assert.deepEqual(result.data, [])
  })

  test('does not consult cache generation for an anonymous viewer', async ({ assert }) => {
    const query = new InspectableGetPendingReviewsQuery(
      {
        userId: null,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: null,
      },
      unusedDependencies
    )

    const result = await query.handle({ page: 3, per_page: 10 })

    assert.deepEqual(query.generationNamespaces, [])
    assert.isNull(query.cacheKey)
    assert.deepEqual(result.data, [])
    assert.equal(result.meta.current_page, 3)
  })
})
