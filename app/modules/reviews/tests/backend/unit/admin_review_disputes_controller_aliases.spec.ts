import { test } from '@japa/runner'

import { reviewActionFactory } from '#composition/reviews/review-core/review_action_factory'
import type { GetAdminReviewDisputeDetailDTO } from '#modules/reviews/actions/queries/get_admin_review_dispute_detail_query'
import GetAdminReviewDisputeDetailQuery from '#modules/reviews/actions/queries/get_admin_review_dispute_detail_query'
import ListAdminReviewDisputesQuery, {
  type ListAdminReviewDisputesDTO,
} from '#modules/reviews/actions/queries/list_admin_review_disputes_query'
import ListAdminReviewDisputesController from '#modules/reviews/controllers/disputes/list_admin_review_disputes_controller'
import ShowAdminReviewDisputeController from '#modules/reviews/controllers/disputes/show_admin_review_dispute_controller'

function fakeRequest(body: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
    header() {
      return null
    },
    ip() {
      return '127.0.0.1'
    },
  }
}

function fakeAuth(userId = 'admin-1') {
  return {
    user: {
      id: userId,
      current_organization_id: null,
    },
  }
}

function toListContext(value: unknown): Parameters<ListAdminReviewDisputesController['handle']>[0] {
  return value as Parameters<ListAdminReviewDisputesController['handle']>[0]
}

function toDetailContext(
  value: unknown
): Parameters<ShowAdminReviewDisputeController['handle']>[0] {
  return value as Parameters<ShowAdminReviewDisputeController['handle']>[0]
}

test.group('Unit | Admin review disputes controller aliases', () => {
  test('admin review disputes API controller reads camelCase perPage alias', async ({ assert }) => {
    const originalExecuteAndWrap: unknown = Reflect.get(
      ListAdminReviewDisputesQuery.prototype,
      'executeAndWrap'
    )
    const capture: { dto: { perPage?: number; status?: string | null } | null } = { dto: null }

    ListAdminReviewDisputesQuery.prototype.executeAndWrap = (function executeAndWrap(
      dto: ListAdminReviewDisputesDTO
    ) {
      capture.dto = dto
      return Promise.resolve({
        getValue() {
          return {
            data: [],
            meta: {
              total: 0,
              per_page: 1,
              current_page: 1,
              last_page: 0,
              cursor: {
                next_cursor: null,
                previous_cursor: null,
                has_next_page: false,
                has_previous_page: false,
              },
            },
          }
        },
      })
    }) as never

    try {
      await new ListAdminReviewDisputesController(reviewActionFactory).handle(
        toListContext({
          request: fakeRequest({
            perPage: 1,
            per_page: 20,
            status: 'pending',
          }),
          auth: fakeAuth(),
          session: {
            get() {
              return null
            },
          },
          currentOrganizationId: null,
        })
      )

      if (!capture.dto) {
        throw new Error('Expected disputes DTO to be captured')
      }
      assert.equal(capture.dto.perPage, 1)
      assert.equal(capture.dto.status, 'pending')
    } finally {
      ListAdminReviewDisputesQuery.prototype.executeAndWrap =
        originalExecuteAndWrap as ListAdminReviewDisputesQuery['executeAndWrap']
    }
  })

  test('admin review dispute detail controller passes canonical disputeId DTO', async ({
    assert,
  }) => {
    const originalExecuteAndWrap: unknown = Reflect.get(
      GetAdminReviewDisputeDetailQuery.prototype,
      'executeAndWrap'
    )
    const capture: { dto: { disputeId: string } | null } = { dto: null }

    GetAdminReviewDisputeDetailQuery.prototype.executeAndWrap = (function executeAndWrap(
      dto: GetAdminReviewDisputeDetailDTO
    ) {
      capture.dto = dto
      return Promise.resolve({
        getValue() {
          return {
            dispute: { id: 'dispute-1' },
            comments: [],
            evidences: [],
            case_files: [],
            ai_evaluations: [],
            timeline: [],
          }
        },
      })
    }) as never

    try {
      await new ShowAdminReviewDisputeController(reviewActionFactory).handle(
        toDetailContext({
          params: { disputeId: 'dispute-1' },
          request: fakeRequest({}),
          response: {
            status() {
              return this
            },
          },
          auth: fakeAuth(),
          session: {
            get() {
              return null
            },
          },
          currentOrganizationId: null,
        })
      )

      assert.deepEqual(capture.dto, { disputeId: 'dispute-1' })
    } finally {
      GetAdminReviewDisputeDetailQuery.prototype.executeAndWrap =
        originalExecuteAndWrap as GetAdminReviewDisputeDetailQuery['executeAndWrap']
    }
  })
})
