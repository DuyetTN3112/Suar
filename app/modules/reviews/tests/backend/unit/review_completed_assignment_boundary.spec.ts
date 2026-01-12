import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { test } from '@japa/runner'

test.group('Review completed assignment boundary', () => {
  test('session creation depends on a Reviews-owned runtime port', async ({ assert }) => {
    const command = await readFile(
      join(
        process.cwd(),
        'app/modules/reviews/actions/commands/create_review_session_command.ts'
      ),
      'utf8'
    )
    const controller = await readFile(
      join(process.cwd(), 'app/modules/reviews/controllers/create_review_session_controller.ts'),
      'utf8'
    )

    assert.include(command, 'ReviewCompletedAssignmentReader')
    assert.notInclude(command, 'review_external_dependencies_impl')
    assert.notInclude(command, "from('task_assignments")
    assert.notInclude(command, "join('tasks")
    assert.include(controller, '@inject()')
    assert.include(controller, 'ReviewActionFactory')
    assert.notInclude(controller, 'ReviewCompletedAssignmentReader')
  })

  test('production wiring stays outside the Reviews feature module', async ({ assert }) => {
    const adapter = await readFile(
      join(
        process.cwd(),
        'app/composition/adapters/task_review_completed_assignment_reader_adapter.ts'
      ),
      'utf8'
    )
    const provider = await readFile(
      join(process.cwd(), 'app/composition/review_consumer_ports_provider.ts'),
      'utf8'
    )

    assert.include(adapter, 'findCompletedById')
    assert.include(provider, 'ReviewCompletedAssignmentReader')
    assert.include(provider, 'TaskReviewCompletedAssignmentReaderAdapter')
  })
})
