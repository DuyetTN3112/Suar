import { test } from '@japa/runner'
import { NotificationType, NotificationPriority } from '#constants/notification_constants'

// ============================================================================
// NotificationType
// ============================================================================
test.group('NotificationType', () => {
  test('has organization notification types', ({ assert }) => {
    assert.equal(NotificationType.ORGANIZATION_CREATED, 'organization_created')
    assert.equal(NotificationType.ORGANIZATION_INVITATION, 'organization_invitation')
    assert.equal(NotificationType.ORGANIZATION_JOIN_REQUEST, 'organization_join_request')
    assert.equal(NotificationType.ORGANIZATION_JOIN_APPROVED, 'organization_join_approved')
    assert.equal(NotificationType.ORGANIZATION_JOIN_REJECTED, 'organization_join_rejected')
    assert.equal(NotificationType.ORGANIZATION_MEMBER_ADDED, 'organization_member_added')
    assert.equal(NotificationType.ORGANIZATION_MEMBER_REMOVED, 'organization_member_removed')
    assert.equal(NotificationType.ORGANIZATION_ROLE_CHANGED, 'organization_role_changed')
  })

  test('has project notification types', ({ assert }) => {
    assert.equal(NotificationType.PROJECT_CREATED, 'project_created')
    assert.equal(NotificationType.PROJECT_INVITATION, 'project_invitation')
    assert.equal(NotificationType.PROJECT_MEMBER_ADDED, 'project_member_added')
    assert.equal(NotificationType.PROJECT_MEMBER_REMOVED, 'project_member_removed')
  })

  test('has task notification types', ({ assert }) => {
    assert.equal(NotificationType.TASK_ASSIGNED, 'task_assigned')
    assert.equal(NotificationType.TASK_UPDATED, 'task_updated')
    assert.equal(NotificationType.TASK_COMPLETED, 'task_completed')
    assert.equal(NotificationType.TASK_DUE_SOON, 'task_due_soon')
    assert.equal(NotificationType.TASK_OVERDUE, 'task_overdue')
    assert.equal(NotificationType.TASK_APPLICATION_RECEIVED, 'task_application_received')
    assert.equal(NotificationType.TASK_APPLICATION_APPROVED, 'task_application_approved')
    assert.equal(NotificationType.TASK_APPLICATION_REJECTED, 'task_application_rejected')
  })

  test('has review notification types', ({ assert }) => {
    assert.equal(NotificationType.REVIEW_RECEIVED, 'review_received')
    assert.equal(NotificationType.REVIEW_REQUESTED, 'review_requested')
  })

  test('has message notification types', ({ assert }) => {
    assert.equal(NotificationType.NEW_MESSAGE, 'new_message')
    assert.equal(NotificationType.MESSAGE_MENTION, 'message_mention')
  })

  test('has system notification types', ({ assert }) => {
    assert.equal(NotificationType.SYSTEM_ANNOUNCEMENT, 'system_announcement')
    assert.equal(NotificationType.ACCOUNT_VERIFIED, 'account_verified')
  })

  test('all values are lowercase snake_case', ({ assert }) => {
    for (const value of Object.values(NotificationType)) {
      assert.match(value, /^[a-z_]+$/)
    }
  })
})

// ============================================================================
// NotificationPriority
// ============================================================================
test.group('NotificationPriority', () => {
  test('has LOW priority', ({ assert }) => {
    assert.equal(NotificationPriority.LOW, 'low')
  })

  test('has NORMAL priority', ({ assert }) => {
    assert.equal(NotificationPriority.NORMAL, 'normal')
  })

  test('has HIGH priority', ({ assert }) => {
    assert.equal(NotificationPriority.HIGH, 'high')
  })

  test('has URGENT priority', ({ assert }) => {
    assert.equal(NotificationPriority.URGENT, 'urgent')
  })

  test('has exactly 4 values', ({ assert }) => {
    const values = Object.values(NotificationPriority)
    assert.equal(values.length, 4)
  })
})
