import { test } from '@japa/runner'

import ProcessTaskAssignmentCompletedEventCommand from '#modules/reviews/actions/commands/task-review/process_task_assignment_completed_event_command'
import {
  handleTaskAssignmentCompleted,
  type AssignmentCompletionListenerDependencies,
} from '#modules/reviews/listeners/assignment_completion_listener'

test.group('Assignment completion listener failure semantics', () => {
  test('does not call persistence after durable delivery has been aborted', async ({
    assert,
  }) => {
    const controller = new AbortController()
    controller.abort(new Error('domain event lease lost'))
    let persistenceCalls = 0

    await assert.rejects(
      () =>
        handleTaskAssignmentCompleted(
          {
            taskId: 'task-1',
            assignmentId: 'assignment-1',
            assigneeId: 'user-1',
            deliveryContext: { signal: controller.signal },
          },
          {
            processTaskAssignmentCompleted: (event) =>
              new ProcessTaskAssignmentCompletedEventCommand({
                createForCompletedAssignmentIfMissing: () => {
                  persistenceCalls += 1
                  return Promise.resolve(true)
                },
              }).handle(event),
            logger: {
              error: () => undefined,
              info: () => undefined,
            },
          }
        ),
      /domain event lease lost/
    )
    assert.equal(persistenceCalls, 0)
  })

  test('does not acknowledge when the lease is lost during persistence', async ({
    assert,
  }) => {
    const controller = new AbortController()
    let persistenceCalls = 0

    await assert.rejects(
      () =>
        handleTaskAssignmentCompleted(
          {
            taskId: 'task-1',
            assignmentId: 'assignment-1',
            assigneeId: 'user-1',
            deliveryContext: { signal: controller.signal },
          },
          {
            processTaskAssignmentCompleted: (event) =>
              new ProcessTaskAssignmentCompletedEventCommand({
                createForCompletedAssignmentIfMissing: () => {
                  persistenceCalls += 1
                  controller.abort(new Error('domain event lease lost'))
                  return Promise.resolve(true)
                },
              }).handle(event),
            logger: {
              error: () => undefined,
              info: () => undefined,
            },
          }
        ),
      /domain event lease lost/
    )
    assert.equal(persistenceCalls, 1)
  })

  test('propagates review-session persistence failure without leaking its message to telemetry', async ({
    assert,
  }) => {
    const telemetry: Record<string, unknown>[] = []
    const dependencyFailure = new Error(
      'review session repository unavailable password=private'
    )
    const dependencies: AssignmentCompletionListenerDependencies = {
      processTaskAssignmentCompleted: (event) =>
        new ProcessTaskAssignmentCompletedEventCommand({
          createForCompletedAssignmentIfMissing: () => Promise.reject(dependencyFailure),
      }).handle(event),
      logger: {
        error: (_message, context) => {
          telemetry.push({ ...context })
        },
        info: () => undefined,
      },
    }

    await assert.rejects(
      () =>
        handleTaskAssignmentCompleted(
          {
            taskId: 'task-1',
            assignmentId: 'assignment-1',
            assigneeId: 'user-1',
          },
          dependencies
        ),
      /review session repository unavailable/
    )

    assert.deepEqual(telemetry, [
      {
        taskId: 'task-1',
        assignmentId: 'assignment-1',
        errorName: 'Error',
      },
    ])
    assert.notInclude(JSON.stringify(telemetry), 'private')
  })
})
