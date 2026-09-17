import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { test } from '@japa/runner'

const COMMANDS = [
  'task-review/ensure_task_review_workflow_command.ts',
  'task-review/open_task_review_dispute_command.ts',
  'task-review/report_task_review_dispute_command.ts',
  'task-review/respond_to_task_review_command.ts',
  'task-review/submit_task_review_command.ts',
] as const

test.group('Review task workflow boundary', () => {
  for (const command of COMMANDS) {
    test(`${command} owns orchestration without owning persistence`, async ({ assert }) => {
      const source = await readFile(
        join(process.cwd(), 'app/modules/reviews/actions/commands', command),
        'utf8'
      )

      assert.include(source, 'ReviewTaskWorkflowUnitOfWork')
      assert.notInclude(source, '@adonisjs/lucid')
      assert.notInclude(source, '#modules/reviews/infra/')
      assert.notInclude(source, 'notificationFanoutPublicApi')
      assert.notInclude(source, 'executeInTransaction')
      assert.notInclude(source, '.from(')
      assert.notInclude(source, '.table(')
    })
  }

  test('Lucid adapter owns transaction, SQL, notifications, and AI staging', async ({ assert }) => {
    const source = await readFile(
      join(
        process.cwd(),
        'app/modules/reviews/infra/adapters/task-review/lucid_review_task_workflow_unit_of_work.ts'
      ),
      'utf8'
    )

    assert.include(source, 'db.transaction')
    assert.include(source, 'notificationFanout.stage')
    assert.include(source, 'aiDisputeAutoQueue.stage')
    assert.include(source, "from('task_review_workflows')")
  })
})
