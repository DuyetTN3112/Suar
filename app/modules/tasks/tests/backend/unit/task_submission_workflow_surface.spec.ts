import { readFileSync } from 'node:fs'

import { test } from '@japa/runner'

test.group('Unit | Task submission workflow surface', () => {
  test('submitting work does not create a hidden IN_REVIEW task status', ({ assert }) => {
    const source = readFileSync(
      'app/modules/tasks/actions/commands/submit_task_submission_command.ts',
      'utf8'
    )

    assert.notInclude(source, "name: 'IN_REVIEW'")
    assert.notInclude(source, "slug: 'in_review'")
    assert.notInclude(source, "color: '#F59E0B'")
    assert.notInclude(source, 'sort_order: 998')
    assert.notInclude(source, '.table(\'task_statuses\')')
  })
})
