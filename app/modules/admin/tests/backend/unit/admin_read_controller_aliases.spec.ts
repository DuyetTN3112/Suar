import { test } from '@japa/runner'

import ListFlaggedReviewsQuery from '#modules/admin/actions/reviews/queries/list_flagged_reviews_query'
import ListAuditLogsController from '#modules/admin/controllers/audit_logs/list_audit_logs_controller'
import ListFlaggedReviewsController from '#modules/admin/controllers/reviews/list_flagged_reviews_controller'

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

function toFlaggedReviewsContext(
  value: unknown
): Parameters<ListFlaggedReviewsController['handle']>[0] {
  return value as Parameters<ListFlaggedReviewsController['handle']>[0]
}

test.group('Unit | Admin read controller aliases', () => {
  test('audit logs controller reads camelCase filter aliases first', ({ assert }) => {
    const controller = new ListAuditLogsController() as unknown as {
      buildListInput(ctx: {
        request: ReturnType<typeof fakeRequest>
      }): {
        resourceType?: string
        userId?: string
      }
    }

    const input = controller.buildListInput({
      request: fakeRequest({
        resourceType: 'task',
        resource_type: 'project',
        userId: 'user-camel',
        user_id: 'user-snake',
      }),
    })

    assert.equal(input.resourceType, 'task')
    assert.equal(input.userId, 'user-camel')
  })

  test('flagged reviews controller accepts camelCase flagType alias and keeps page props stable', async ({
    assert,
  }) => {
    const originalHandle = Reflect.get(ListFlaggedReviewsQuery.prototype, 'handle')
    const capture: { dto: { flagType?: string } | null } = { dto: null }

    ListFlaggedReviewsQuery.prototype.handle = function handle(dto) {
      capture.dto = dto
      return Promise.resolve({
        data: [],
        meta: {
          total: 0,
          perPage: 50,
          currentPage: 1,
          lastPage: 1,
          cursor: {
            nextCursor: null,
            previousCursor: null,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      })
    }

    try {
      const rendered = await new ListFlaggedReviewsController().handle(toFlaggedReviewsContext({
        request: fakeRequest({
          flagType: 'bulk_same_level',
          flag_type: 'new_account_high',
        }),
        inertia: {
          render(component: string, props: Record<string, unknown>) {
            return { component, props }
          },
        },
        auth: fakeAuth(),
        session: { get() { return null } },
        currentOrganizationId: null,
      }))

      if (!capture.dto) {
        throw new Error('Expected flagged reviews DTO to be captured')
      }
      assert.equal(capture.dto.flagType, 'bulk_same_level')
      const page = rendered as unknown as { props: { filters: { flag_type: string | null } } }
      assert.equal(page.props.filters.flag_type, 'bulk_same_level')
    } finally {
      ListFlaggedReviewsQuery.prototype.handle = originalHandle
    }
  })
})
