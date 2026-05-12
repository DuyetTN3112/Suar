import { test } from '@japa/runner'

import type { AdminDisputeActionFactory } from '#modules/admin/disputes/actions/ports/inbound/disputes/admin_dispute_action_factory'
import AdminDisputesController from '#modules/admin/disputes/controllers/disputes/admin_disputes_controller'

function toAiOperatorContext(value: unknown): Parameters<AdminDisputesController['aiOperator']>[0] {
  return value as Parameters<AdminDisputesController['aiOperator']>[0]
}

test.group('Unit | Admin disputes controller', () => {
  test('renders the AI operator console without dispatching an evaluation', async ({ assert }) => {
    const actions: AdminDisputeActionFactory = {
      makeListAdminDisputesQuery() {
        throw new Error('List query is not used by the redirect test')
      },
      makeGetAdminDisputeDetailQuery() {
        throw new Error('Detail query is not used by the operator test')
      },
      makeGetAiOperatorOverviewQuery() {
        // The factory owns concrete query classes; this controller test only needs its port shape.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return {
          handle() {
            return Promise.resolve({
              disputes: { data: [], meta: {} },
              metrics: {
                totalEvaluations: 0,
                activeEvaluations: 0,
                completedEvaluations: 0,
                failedEvaluations: 0,
                queuedDisputes: 0,
                providers: [],
              },
            })
          },
        } as never
      },
    }
    let rendered: { page: string; props: Record<string, unknown> } | null = null

    await new AdminDisputesController(actions).aiOperator(
      toAiOperatorContext({
        request: {
          input(key: string, fallback?: unknown) {
            const values: Record<string, unknown> = {
              perPage: 25,
            }
            return Object.hasOwn(values, key) ? values[key] : fallback
          },
        },
        inertia: {
          render(page: string, props: Record<string, unknown>) {
            rendered = { page, props }
            return rendered
          },
        },
      })
    )

    const output = rendered as unknown as { page: string; props: Record<string, unknown> }
    assert.equal(output.page, 'admin/disputes/ai_operator')
    assert.equal((output.props['metrics'] as { totalEvaluations: number }).totalEvaluations, 0)
  })
})
