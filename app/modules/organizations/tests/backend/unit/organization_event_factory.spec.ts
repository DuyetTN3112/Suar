import { test } from '@japa/runner'

import { PLATFORM_EVENT_NAMES } from '#modules/observability/contracts/platform_event_names'
import { buildOrganizationMembershipEvent } from '#modules/organizations/observability/organization_event_factory'

test.group('Unit | Organization Event Factory', () => {
  const execCtx = {
    userId: 'owner-1',
    ip: '127.0.0.1',
    userAgent: 'unit-test',
    organizationId: 'org-1',
    requestId: 'req-1',
    traceId: 'trace-1',
    workflowId: null,
  }

  test('builds invitation completed event with parent organization context', ({ assert }) => {
    const event = buildOrganizationMembershipEvent(execCtx, {
      eventName: PLATFORM_EVENT_NAMES.ORGANIZATION_INVITATION_COMPLETED,
      eventFamily: 'membership',
      subsystem: 'organization_membership',
      workflow: 'organization_invite_user',
      stage: 'completed',
      outcome: 'success',
      organizationId: 'org-1',
      targetType: 'organization_invitation',
      targetId: 'member-1',
      change: {
        invited_email: 'member@example.com',
      },
    })

    assert.equal(event.module, 'organizations')
    assert.equal(event.workflow, 'organization_invite_user')
    assert.equal(event.target?.type, 'organization_invitation')
    assert.equal(event.target?.id, 'member-1')
    assert.equal(event.target?.parent_id, 'org-1')
    assert.equal(event.change?.['organization_id'], 'org-1')
  })

  test('builds failure event with serialized object error details', ({ assert }) => {
    const event = buildOrganizationMembershipEvent(execCtx, {
      eventName: PLATFORM_EVENT_NAMES.ORGANIZATION_MEMBER_REMOVAL_FAILED,
      eventFamily: 'membership',
      subsystem: 'organization_membership',
      workflow: 'organization_remove_member',
      stage: 'failed',
      outcome: 'failure',
      organizationId: 'org-1',
      targetType: 'organization_membership',
      targetId: 'member-2',
      error: { reason: 'unexpected' },
    })

    assert.equal(event.error?.['class'], 'UnknownError')
    assert.deepEqual(event.error?.['details'], { reason: 'unexpected' })
  })
})
