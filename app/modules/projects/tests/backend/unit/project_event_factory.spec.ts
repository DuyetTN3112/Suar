import { test } from '@japa/runner'

import { PLATFORM_EVENT_NAMES } from '#modules/observability/contracts/platform_event_names'
import { buildProjectMembershipEvent } from '#modules/projects/observability/project_event_factory'

test.group('Unit | Project Event Factory', () => {
  const execCtx = {
    userId: 'owner-1',
    ip: '127.0.0.1',
    userAgent: 'unit-test',
    organizationId: 'org-1',
    requestId: 'req-1',
    traceId: 'trace-1',
    workflowId: null,
  }

  test('builds project member completion event with project parent context', ({ assert }) => {
    const event = buildProjectMembershipEvent(execCtx, {
      eventName: PLATFORM_EVENT_NAMES.PROJECT_MEMBER_ADDITION_COMPLETED,
      eventFamily: 'membership',
      subsystem: 'project_membership',
      workflow: 'project_add_member',
      stage: 'completed',
      outcome: 'success',
      projectId: 'project-1',
      targetType: 'project_member',
      targetId: 'user-2',
      change: {
        project_role: 'project_member',
      },
    })

    assert.equal(event.module, 'projects')
    assert.equal(event.target?.type, 'project_member')
    assert.equal(event.target?.id, 'user-2')
    assert.equal(event.target?.parent_id, 'project-1')
    assert.equal(event.change?.['project_id'], 'project-1')
  })

  test('serializes listener cleanup failures safely', ({ assert }) => {
    const event = buildProjectMembershipEvent(execCtx, {
      eventName: PLATFORM_EVENT_NAMES.PROJECT_MEMBER_ORG_CLEANUP_FAILED,
      eventFamily: 'membership',
      subsystem: 'project_membership_listener',
      workflow: 'project_member_org_cleanup',
      stage: 'failed',
      outcome: 'failure',
      projectId: 'project-1',
      targetType: 'project_member_cleanup',
      targetId: 'user-2',
      error: { reason: 'unexpected' },
    })

    assert.equal(event.error?.['class'], 'UnknownError')
    assert.deepEqual(event.error?.['details'], { reason: 'unexpected' })
  })
})
