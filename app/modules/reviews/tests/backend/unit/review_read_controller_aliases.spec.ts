import { test } from '@japa/runner'

import type { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import ListOrgReviewDisputesQuery from '#modules/reviews/actions/queries/list_org_review_disputes_query'
import ListOrgReviewDisputesController from '#modules/reviews/controllers/list_org_review_disputes_controller'

function fakeRequest(body: Record<string, unknown>, url = '/api/org/reviews/disputes') {
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
    url() {
      return url
    },
  }
}

function fakeAuth(userId = 'user-1', organizationId: string | null = 'org-1') {
  return {
    user: {
      id: userId,
      current_organization_id: organizationId,
    },
  }
}

function requireValue<T>(value: T, message: string): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message)
  }

  return value
}

test.group('Unit | Review read controller aliases', () => {
  test('org review disputes API controller reads camelCase perPage alias', async ({ assert }) => {
    const originalExecute: unknown = Reflect.get(ListOrgReviewDisputesQuery.prototype, 'execute')
    let capturedDto: { perPage?: number; status?: string | null } | null = null

    ListOrgReviewDisputesQuery.prototype.execute = async function execute(dto) {
      await Promise.resolve()
      const resolvedDto: { perPage?: number; status?: string | null } = dto
      capturedDto = resolvedDto
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
    }

    try {
      const ctx = {
        request: fakeRequest({ perPage: 1, per_page: 20, status: 'pending' }),
        auth: fakeAuth(),
        session: {
          get() {
            return null
          },
        },
        currentOrganizationId: 'org-1',
      }
      const query = Object.create(
        ListOrgReviewDisputesQuery.prototype
      ) as ListOrgReviewDisputesQuery
      const actions = {
        makeListOrgReviewDisputesQuery: () => query,
      } as unknown as ReviewActionFactory
      await new ListOrgReviewDisputesController(actions).handle(ctx as never)

      const resolvedDto = requireValue<{ perPage?: number; status?: string | null } | null>(
        capturedDto,
        'Expected org review disputes DTO to be captured'
      )
      assert.equal(resolvedDto.perPage, 1)
      assert.equal(resolvedDto.status, 'pending')
    } finally {
      ListOrgReviewDisputesQuery.prototype.execute =
        originalExecute as ListOrgReviewDisputesQuery['execute']
    }
  })
})
