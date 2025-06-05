import { test } from '@japa/runner'
import {
  validateProjectDates,
  validateProjectStatus,
  canDeleteProjectWithTasks,
  canRemoveMemberFromProject,
} from '#domain/projects/project_state_rules'
import { ProjectStatus } from '#constants/project_constants'

/**
 * Tests for project state rules.
 * All pure functions — no database required.
 */

// ============================================================================
// validateProjectDates
// ============================================================================

test.group('validateProjectDates', () => {
  test('allow: both null', ({ assert }) => {
    const result = validateProjectDates({ startDate: null, endDate: null })
    assert.isTrue(result.allowed)
  })

  test('allow: start is null', ({ assert }) => {
    const result = validateProjectDates({ startDate: null, endDate: '2025-12-31' })
    assert.isTrue(result.allowed)
  })

  test('allow: end is null', ({ assert }) => {
    const result = validateProjectDates({ startDate: '2025-01-01', endDate: null })
    assert.isTrue(result.allowed)
  })

  test('allow: start < end', ({ assert }) => {
    const result = validateProjectDates({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    })
    assert.isTrue(result.allowed)
  })

  test('allow: start == end (same day)', ({ assert }) => {
    const result = validateProjectDates({
      startDate: '2025-06-15',
      endDate: '2025-06-15',
    })
    assert.isTrue(result.allowed)
  })

  test('denied: start > end', ({ assert }) => {
    const result = validateProjectDates({
      startDate: '2025-12-31',
      endDate: '2025-01-01',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('allow: Date objects (start < end)', ({ assert }) => {
    const result = validateProjectDates({
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-06-15'),
    })
    assert.isTrue(result.allowed)
  })

  test('denied: Date objects (start > end)', ({ assert }) => {
    const result = validateProjectDates({
      startDate: new Date('2025-12-31'),
      endDate: new Date('2025-01-01'),
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })
})

// ============================================================================
// validateProjectStatus
// ============================================================================

test.group('validateProjectStatus', () => {
  test('allow: PENDING', ({ assert }) => {
    const result = validateProjectStatus(ProjectStatus.PENDING)
    assert.isTrue(result.allowed)
  })

  test('allow: IN_PROGRESS', ({ assert }) => {
    const result = validateProjectStatus(ProjectStatus.IN_PROGRESS)
    assert.isTrue(result.allowed)
  })

  test('allow: COMPLETED', ({ assert }) => {
    const result = validateProjectStatus(ProjectStatus.COMPLETED)
    assert.isTrue(result.allowed)
  })

  test('allow: CANCELLED', ({ assert }) => {
    const result = validateProjectStatus(ProjectStatus.CANCELLED)
    assert.isTrue(result.allowed)
  })

  test('denied: invalid status', ({ assert }) => {
    const result = validateProjectStatus('invalid_status')
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: empty string', ({ assert }) => {
    const result = validateProjectStatus('')
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })
})

// ============================================================================
// canDeleteProjectWithTasks
// ============================================================================

test.group('canDeleteProjectWithTasks', () => {
  test('allow: 0 incomplete tasks', ({ assert }) => {
    const result = canDeleteProjectWithTasks({ incompleteTaskCount: 0 })
    assert.isTrue(result.allowed)
  })

  test('denied: 1 incomplete task', ({ assert }) => {
    const result = canDeleteProjectWithTasks({ incompleteTaskCount: 1 })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: many incomplete tasks', ({ assert }) => {
    const result = canDeleteProjectWithTasks({ incompleteTaskCount: 50 })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })
})

// ============================================================================
// canRemoveMemberFromProject
// ============================================================================

test.group('canRemoveMemberFromProject', () => {
  test('allow: regular member', ({ assert }) => {
    const result = canRemoveMemberFromProject({
      targetUserId: 'member-001',
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
    })
    assert.isTrue(result.allowed)
  })

  test('denied: target is owner', ({ assert }) => {
    const result = canRemoveMemberFromProject({
      targetUserId: 'owner-001',
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: target is creator', ({ assert }) => {
    const result = canRemoveMemberFromProject({
      targetUserId: 'creator-001',
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })
})
