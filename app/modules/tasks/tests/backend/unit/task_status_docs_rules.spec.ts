import { test } from '@japa/runner'

import {
  canAssignTaskInStatus,
  canCreateTaskInStatus,
  validateDocumentationTaskStatusTransition,
} from '#modules/tasks/domain/task-status/task_status_rules'
import { toLegacyTaskStatusMirror } from '#modules/tasks/domain/task-status/task_status_mirror'

const docs = { slug: 'docs', category: 'docs' }
const apiDocs = { slug: 'api', category: 'docs' }
const todo = { slug: 'todo', category: 'todo' }

test.group('Docs task status rules', () => {
  test('does not permit assigning a Docs item', ({ assert }) => {
    const result = canAssignTaskInStatus(docs)

    assert.isFalse(result.allowed)
    assert.include(result.reason ?? '', 'không được giao')
  })

  test('does not permit publishing a Docs item into the work lifecycle', ({ assert }) => {
    const result = canCreateTaskInStatus(docs, {
      assigneeId: null,
      authoringIntent: 'publish',
    })

    assert.isFalse(result.allowed)
    assert.include(result.reason ?? '', 'quy trình công việc')
  })

  test('permits creating a Docs item as an information item', ({ assert }) => {
    const result = canCreateTaskInStatus(docs, {
      assigneeId: null,
      authoringIntent: 'save_draft',
    })

    assert.isTrue(result.allowed)
  })

  test('applies Docs safeguards to every status in the Docs group', ({ assert }) => {
    assert.isFalse(canAssignTaskInStatus(apiDocs).allowed)
    assert.isTrue(
      validateDocumentationTaskStatusTransition({
        currentStatus: docs,
        nextStatus: apiDocs,
        isAssigned: false,
      }).allowed
    )
  })

  test('allows no workflow transition into or out of Docs', ({ assert }) => {
    const intoDocs = validateDocumentationTaskStatusTransition({
      currentStatus: todo,
      nextStatus: docs,
      isAssigned: false,
    })
    const outOfDocs = validateDocumentationTaskStatusTransition({
      currentStatus: docs,
      nextStatus: todo,
      isAssigned: false,
    })

    assert.isFalse(intoDocs.allowed)
    assert.isFalse(outOfDocs.allowed)
  })

  test('allows a Docs item to remain where it is', ({ assert }) => {
    const result = validateDocumentationTaskStatusTransition({
      currentStatus: docs,
      nextStatus: docs,
      isAssigned: false,
    })

    assert.isTrue(result.allowed)
  })

  test('keeps Docs out of the legacy work-status mirror', ({ assert }) => {
    assert.equal(toLegacyTaskStatusMirror(docs), 'todo')
  })
})
