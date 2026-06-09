import { test } from '@japa/runner'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { Result } from '#modules/errors/public_contracts/result'
import { ApplyMarketplaceTaskCommand } from '#modules/marketplace/actions/commands/marketplace-application/apply_marketplace_task_command'
import { ProcessMarketplaceApplicationCommand } from '#modules/marketplace/actions/commands/marketplace-application/process_marketplace_application_command'
import { WithdrawMarketplaceApplicationCommand } from '#modules/marketplace/actions/commands/marketplace-application/withdraw_marketplace_application_command'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/marketplace-application/task_application_flow_port'

const context = {
  userId: 'user-1',
  ip: '127.0.0.1',
  userAgent: 'unit-test',
  organizationId: null,
}

test.group('Marketplace application command Results', () => {
  test('preserves expected submit failures', async ({ assert }) => {
    const failure = new ConflictException('Application already exists')
    const flow = {
      submit: () => Promise.resolve(Result.fail(failure)),
    } as unknown as TaskApplicationFlowPort

    const result = await new ApplyMarketplaceTaskCommand(flow, context).handle({
      taskId: 'task-1',
      message: 'I can help with this task',
      portfolioLinks: null,
      applicationSource: 'public_listing',
    })

    assert.isTrue(result.isFailure())
    assert.strictEqual(result.getError(), failure)
  })

  test('preserves expected decision failures', async ({ assert }) => {
    const failure = new ConflictException('Application cannot be processed')
    const flow = {
      decide: () => Promise.resolve(Result.fail(failure)),
    } as unknown as TaskApplicationFlowPort

    const result = await new ProcessMarketplaceApplicationCommand(flow, context).handle({
      applicationId: 'application-1',
      action: 'reject',
      rejectionReason: 'Not a fit',
      assignmentType: 'member',
      estimatedHours: null,
    })

    assert.isTrue(result.isFailure())
    assert.strictEqual(result.getError(), failure)
  })

  test('preserves expected withdrawal failures', async ({ assert }) => {
    const failure = new ConflictException('Application already withdrawn')
    const flow = {
      withdraw: () => Promise.resolve(Result.fail(failure)),
    } as unknown as TaskApplicationFlowPort

    const result = await new WithdrawMarketplaceApplicationCommand(flow, context).handle({
      applicationId: 'application-1',
    })

    assert.isTrue(result.isFailure())
    assert.strictEqual(result.getError(), failure)
  })
})
