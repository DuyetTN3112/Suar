import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { test } from '@japa/runner'

test.group('Review assignment scope boundary', () => {
  test('Reviews exposes assignment-centric referential checks', async ({ assert }) => {
    const source = await readFile(
      join(process.cwd(), 'app/composition/reviews/public-api/review_public_api_composition.ts'),
      'utf8'
    )

    assert.include(source, 'hasAnyForTaskAssignmentIds')
    assert.include(source, 'countPendingForTaskAssignmentIds')
    assert.notInclude(source, 'DefaultReviewDependencies')
    assert.notInclude(source, 'countPendingForProject')
    assert.notInclude(source, 'hasAnyForTasksWithStatus')
  })

  test('Task orchestration uses narrow assignment queries', async ({ assert }) => {
    const source = await readFile(
      join(process.cwd(), 'app/composition/adapters/tasks/task_review_reader_adapter.ts'),
      'utf8'
    )

    assert.include(source, 'listAssignmentIdsByTaskIds')
    assert.include(source, 'listAssignmentIdsByTaskStatusIds')
    assert.include(source, 'reviewPublicApi.hasAnyForTaskAssignmentIds')
    assert.include(source, '#modules/tasks/actions/queries/task-applications/review_assignment_context_v1_query')
    assert.notInclude(source, 'taskPublicApi')
    assert.notInclude(source, '#modules/reviews/infra/repositories/')
  })
})
