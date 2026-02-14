import { test } from '@japa/runner'

import type { AdminDisputeActionFactory } from '#modules/admin/disputes/actions/ports/inbound/admin_dispute_action_factory'
import AdminDisputesController from '#modules/admin/disputes/controllers/admin_disputes_controller'

function toAiOperatorContext(value: unknown): Parameters<AdminDisputesController['aiOperator']>[0] {
  return value as Parameters<AdminDisputesController['aiOperator']>[0]
}

test.group('Unit | Admin disputes controller', () => {
  test('redirects the retired AI operator page into the canonical dispute board', ({
    assert,
  }) => {
    const actions: AdminDisputeActionFactory = {
      makeListAdminDisputesQuery() {
        throw new Error('List query is not used by the redirect test')
      },
      makeGetAdminDisputeDetailQuery() {
        throw new Error('Detail query is not used by the redirect test')
      },
    }
    let redirectPath: string | null = null

    new AdminDisputesController(actions).aiOperator(
      toAiOperatorContext({
        request: {
          input(key: string, fallback?: unknown) {
            const values: Record<string, unknown> = {
              perPage: 25,
              search: 'quality',
              status: 'ai_reviewing',
            }
            return Object.hasOwn(values, key) ? values[key] : fallback
          },
        },
        response: {
          redirect(path: string) {
            redirectPath = path
            return path
          },
        },
      })
    )

    assert.equal(
      redirectPath,
      '/admin/disputes?focus=ai&search=quality&status=ai_reviewing'
    )
  })
})
