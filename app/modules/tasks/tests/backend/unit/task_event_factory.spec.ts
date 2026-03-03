import { test } from '@japa/runner'

import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import {
  buildTaskApplicationEvent,
  buildTaskAssignmentEvent,
} from '#modules/tasks/observability/task_event_factory'

test.group('Unit | Task Event Factory', () => {
  const execCtx = {
    userId: 'user-1',
    ip: '127.0.0.1',
    userAgent: 'unit-test',
    organizationId: 'org-1',
    requestId: 'req-1',
    traceId: 'trace-1',
    workflowId: null,
  }

  test('builds task application event with task/application correlation fields', ({ assert }) => {
    const event = buildTaskApplicationEvent(execCtx, {
      eventName: PLATFORM_EVENT_NAMES.TASK_APPLICATION_SUBMITTED,
      stage: 'completed',
      outcome: 'success',
      taskId: 'task-1',
      applicationId: 'application-1',
      change: {
        application_source: 'public_listing',
      },
    })

    assert.equal(event.module, 'tasks')
    assert.equal(event.workflow, 'task_apply')
    assert.equal(event.target?.type, 'task_application')
    assert.equal(event.target?.id, 'application-1')
    assert.equal(event.target?.parent_id, 'task-1')
    assert.equal(event.change?.['task_id'], 'task-1')
  })

  test('builds task assignment failure event with assignment action metadata', ({ assert }) => {
    const event = buildTaskAssignmentEvent(execCtx, {
      eventName: PLATFORM_EVENT_NAMES.TASK_ASSIGNMENT_FAILED,
      stage: 'failed',
      outcome: 'failure',
      taskId: 'task-2',
      assigneeId: 'user-2',
      previousAssigneeId: 'user-3',
      assignmentAction: 'reassign',
      error: new Error('permission denied token=task-secret\r\nforged=true'),
    })

    assert.equal(event.workflow, 'task_assign')
    assert.equal(event.target?.type, 'task')
    assert.equal(event.target?.id, 'task-2')
    assert.equal(event.change?.['assignment_action'], 'reassign')
    assert.equal(event.error?.['message'], 'permission denied token=[REDACTED]  forged=true')
    assert.isTrue(event.compliance.redaction_applied)
    assert.notInclude(JSON.stringify(event), 'task-secret')
  })
})
