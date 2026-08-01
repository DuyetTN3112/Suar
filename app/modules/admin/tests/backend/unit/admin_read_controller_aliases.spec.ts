import { test } from '@japa/runner'

import type { AdminAuditLogActionFactory } from '#modules/admin/audit_logs/actions/ports/inbound/admin_audit_log_action_factory'
import ListAuditLogsController from '#modules/admin/audit_logs/controllers/list_audit_logs_controller'
import type { AdminReviewActionFactory } from '#modules/admin/reviews/actions/ports/inbound/admin_review_action_factory'
import ListFlaggedReviewsQuery from '#modules/admin/reviews/actions/query/list_flagged_reviews_query'
import ListFlaggedReviewsController from '#modules/admin/reviews/controllers/list_flagged_reviews_controller'

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

const auditActions: AdminAuditLogActionFactory = {
  makeListAuditLogsQuery() {
    throw new Error('List query is not used by the alias parsing tests')
  },
}

test.group('Unit | Admin read controller aliases', () => {
  test('audit logs controller reads camelCase filter aliases first', ({ assert }) => {
    const controller = new ListAuditLogsController(auditActions) as unknown as {
      buildListInput(ctx: { request: ReturnType<typeof fakeRequest> }): {
        resourceType?: string
        actorType?: string
        retentionClass?: string
        traceId?: string
        userId?: string
      }
    }

    const input = controller.buildListInput({
      request: fakeRequest({
        resourceType: 'task',
        resource_type: 'project',
        actorType: 'automation',
        actor_type: 'system',
        retentionClass: 'security_audit',
        retention_class: 'transient_runtime',
        traceId: 'trace-camel',
        trace_id: 'trace-snake',
        userId: 'user-camel',
        user_id: 'user-snake',
      }),
    })

    assert.equal(input.resourceType, 'task')
    assert.equal(input.actorType, 'automation')
    assert.equal(input.retentionClass, 'security_audit')
    assert.equal(input.traceId, 'trace-camel')
    assert.equal(input.userId, 'user-camel')
  })

  test('system audit filters are bounded, allowlisted, and discard an inverted date range', ({
    assert,
  }) => {
    type AuditInput = {
      page: number
      search?: string
      action?: string
      severity?: string
      outcome?: string
      actorType?: string
      traceId?: string
      from?: Date
      to?: Date
    }
    const controller = new ListAuditLogsController(auditActions) as unknown as {
      buildListInput(ctx: { request: ReturnType<typeof fakeRequest> }): AuditInput
      normalizeSystemListInput(input: AuditInput): AuditInput
    }
    const raw = controller.buildListInput({
      request: fakeRequest({
        search: 's'.repeat(200),
        action: 'a'.repeat(160),
        traceId: 't'.repeat(200),
        severity: 'critical',
        outcome: 'unknown',
        actorType: 'browser',
        from: '2026-08-02T00:00:00.000Z',
        to: '2026-08-01T00:00:00.000Z',
      }),
    })
    const normalized = controller.normalizeSystemListInput(raw)

    assert.lengthOf(normalized.search ?? '', 160)
    assert.lengthOf(normalized.action ?? '', 120)
    assert.lengthOf(normalized.traceId ?? '', 160)
    assert.notProperty(normalized, 'severity')
    assert.notProperty(normalized, 'outcome')
    assert.notProperty(normalized, 'actorType')
    assert.notProperty(normalized, 'from')
    assert.notProperty(normalized, 'to')
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
      const actions: AdminReviewActionFactory = {
        makeListFlaggedReviewsQuery: () =>
          Object.create(ListFlaggedReviewsQuery.prototype) as ListFlaggedReviewsQuery,
        makeGetFlaggedReviewDetailQuery() {
          throw new Error('Detail query is not used by the list controller test')
        },
        makeResolveFlaggedReviewCommand() {
          throw new Error('Resolve command is not used by the list controller test')
        },
      }
      const rendered = await new ListFlaggedReviewsController(actions).handle(
        toFlaggedReviewsContext({
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
          session: {
            get() {
              return null
            },
          },
          currentOrganizationId: null,
        })
      )

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
