import { test } from '@japa/runner'
import { AuditAction, EntityType } from '#constants/audit_constants'

// ============================================================================
// AuditAction enum
// ============================================================================
test.group('AuditAction', () => {
  test('has CRUD actions', ({ assert }) => {
    assert.equal(AuditAction.CREATE, 'create')
    assert.equal(AuditAction.UPDATE, 'update')
    assert.equal(AuditAction.DELETE, 'delete')
  })

  test('has soft/hard delete actions', ({ assert }) => {
    assert.equal(AuditAction.SOFT_DELETE, 'soft_delete')
    assert.equal(AuditAction.HARD_DELETE, 'hard_delete')
    assert.equal(AuditAction.RESTORE, 'restore')
  })

  test('has auth actions', ({ assert }) => {
    assert.equal(AuditAction.LOGIN, 'login')
    assert.equal(AuditAction.LOGOUT, 'logout')
  })

  test('has approval actions', ({ assert }) => {
    assert.equal(AuditAction.APPROVE, 'approve')
    assert.equal(AuditAction.REJECT, 'reject')
  })

  test('has membership actions', ({ assert }) => {
    assert.equal(AuditAction.INVITE, 'invite')
    assert.equal(AuditAction.JOIN, 'join')
    assert.equal(AuditAction.LEAVE, 'leave')
    assert.equal(AuditAction.TRANSFER, 'transfer')
  })

  test('has task-specific actions', ({ assert }) => {
    assert.equal(AuditAction.ASSIGN, 'assign')
    assert.equal(AuditAction.UNASSIGN, 'unassign')
    assert.equal(AuditAction.UPDATE_STATUS, 'update_status')
    assert.equal(AuditAction.UPDATE_TIME, 'update_time')
    assert.equal(AuditAction.REVOKE_ACCESS, 'revoke_task_access')
  })

  test('has organization-specific actions', ({ assert }) => {
    assert.equal(AuditAction.SWITCH_ORGANIZATION, 'switch_organization')
    assert.equal(AuditAction.DEACTIVATE, 'deactivate')
    assert.equal(AuditAction.UPDATE_MEMBER_ROLE, 'update_member_role')
  })

  test('all values are lowercase strings', ({ assert }) => {
    for (const value of Object.values(AuditAction)) {
      assert.match(value, /^[a-z_]+$/)
    }
  })
})

// ============================================================================
// EntityType enum
// ============================================================================
test.group('EntityType', () => {
  test('has core entity types', ({ assert }) => {
    assert.equal(EntityType.USER, 'user')
    assert.equal(EntityType.ORGANIZATION, 'organization')
    assert.equal(EntityType.PROJECT, 'project')
    assert.equal(EntityType.TASK, 'task')
  })

  test('has membership entity types', ({ assert }) => {
    assert.equal(EntityType.ORGANIZATION_USER, 'organization_user')
    assert.equal(EntityType.PROJECT_MEMBER, 'project_member')
  })

  test('has task-related entity types', ({ assert }) => {
    assert.equal(EntityType.TASK_APPLICATION, 'task_application')
    assert.equal(EntityType.TASK_ASSIGNMENT, 'task_assignment')
  })

  test('has communication entity types', ({ assert }) => {
    assert.equal(EntityType.REVIEW, 'review')
    assert.equal(EntityType.NOTIFICATION, 'notification')
    assert.equal(EntityType.CONVERSATION, 'conversation')
    assert.equal(EntityType.MESSAGE, 'message')
  })

  test('all values are lowercase snake_case', ({ assert }) => {
    for (const value of Object.values(EntityType)) {
      assert.match(value, /^[a-z_]+$/)
    }
  })
})
