import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { test } from '@japa/runner'

const COMMANDS = [
  'sprint-review/accept_sprint_reverse_review_workflow_command.ts',
  'sprint-review/report_sprint_reverse_review_workflow_command.ts',
  'disputes/respond_sprint_reverse_review_workflow_command.ts',
  'sprint-review/submit_sprint_reverse_review_workflow_command.ts',
] as const

test.group('Review sprint reverse workflow boundary', () => {
  for (const command of COMMANDS) {
    test(`${command} owns policy without owning persistence`, async ({ assert }) => {
      const source = await readFile(
        join(process.cwd(), 'app/modules/reviews/actions/commands', command),
        'utf8'
      )

      assert.include(source, 'ReviewSprintReverseWorkflowUnitOfWork')
      assert.notInclude(source, '@adonisjs/lucid')
      assert.notInclude(source, '#modules/reviews/infra/')
      assert.notInclude(source, 'notificationFanoutPublicApi')
      assert.notInclude(source, 'rollbackWithoutMaskingOriginalError')
    })
  }

  test('Lucid adapter owns the transaction and transactional staging', async ({ assert }) => {
    const source = await readFile(
      join(
        process.cwd(),
        'app/modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_reverse_workflow_unit_of_work.ts'
      ),
      'utf8'
    )

    assert.include(source, 'db.transaction')
    assert.include(source, 'notificationFanout.stage')
    assert.include(source, 'aiDisputeAutoQueue.stage')
  })
})
