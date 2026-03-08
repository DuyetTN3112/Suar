import { test } from '@japa/runner'
import { ProjectRole, ProjectVisibility, ProjectStatus } from '#constants/project_constants'

// ============================================================================
// ProjectRole
// ============================================================================
test.group('ProjectRole', () => {
  test('has OWNER role', ({ assert }) => {
    assert.equal(ProjectRole.OWNER, 'project_owner')
  })

  test('has MANAGER role', ({ assert }) => {
    assert.equal(ProjectRole.MANAGER, 'project_manager')
  })

  test('has MEMBER role', ({ assert }) => {
    assert.equal(ProjectRole.MEMBER, 'project_member')
  })

  test('has VIEWER role', ({ assert }) => {
    assert.equal(ProjectRole.VIEWER, 'project_viewer')
  })

  test('has exactly 4 roles', ({ assert }) => {
    assert.equal(Object.values(ProjectRole).length, 4)
  })

  test('all values start with project_', ({ assert }) => {
    for (const value of Object.values(ProjectRole)) {
      assert.isTrue(value.startsWith('project_'))
    }
  })
})

// ============================================================================
// ProjectVisibility
// ============================================================================
test.group('ProjectVisibility', () => {
  test('has PRIVATE visibility', ({ assert }) => {
    assert.equal(ProjectVisibility.PRIVATE, 'private')
  })

  test('has TEAM visibility', ({ assert }) => {
    assert.equal(ProjectVisibility.TEAM, 'team')
  })

  test('has PUBLIC visibility', ({ assert }) => {
    assert.equal(ProjectVisibility.PUBLIC, 'public')
  })

  test('has exactly 3 values', ({ assert }) => {
    assert.equal(Object.values(ProjectVisibility).length, 3)
  })
})

// ============================================================================
// ProjectStatus
// ============================================================================
test.group('ProjectStatus', () => {
  test('has PENDING status', ({ assert }) => {
    assert.equal(ProjectStatus.PENDING, 'pending')
  })

  test('has IN_PROGRESS status', ({ assert }) => {
    assert.equal(ProjectStatus.IN_PROGRESS, 'in_progress')
  })

  test('has COMPLETED status', ({ assert }) => {
    assert.equal(ProjectStatus.COMPLETED, 'completed')
  })

  test('has CANCELLED status', ({ assert }) => {
    assert.equal(ProjectStatus.CANCELLED, 'cancelled')
  })

  test('has exactly 4 statuses', ({ assert }) => {
    assert.equal(Object.values(ProjectStatus).length, 4)
  })
})
