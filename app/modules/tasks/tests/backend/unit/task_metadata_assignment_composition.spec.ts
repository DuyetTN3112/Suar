import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import TaskApplicationProvider from '#composition/tasks/task-application/task_application_provider'
import { taskMetadataAssignmentProvider } from '#composition/tasks/task-metadata/task_metadata_assignment_composition'
import { TaskMetadataAssignmentProvider } from '#modules/tasks/infra/adapters/task-assignment/task_metadata_assignment_provider'

test.group('Task metadata assignment composition', () => {
  test('composes the real source reader and production taxonomy version boundary', ({ assert }) => {
    assert.instanceOf(taskMetadataAssignmentProvider, TaskMetadataAssignmentProvider)
  })

  test('registers the provider in the application container', async ({ assert }) => {
    new TaskApplicationProvider(app).register()

    assert.strictEqual(
      await app.container.make(TaskMetadataAssignmentProvider),
      taskMetadataAssignmentProvider
    )
  })

  test('fails closed when a canonical namespace has no production source yet', async ({ assert }) => {
    await assert.rejects(() =>
      taskMetadataAssignmentProvider.getAssignments({
        resource: 'task',
        entityIds: ['task-1'],
        namespaces: ['business-domains'],
      })
    )
  })
})
