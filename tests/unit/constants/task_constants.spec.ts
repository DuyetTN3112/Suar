import { test } from '@japa/runner'
import {
  TaskStatus,
  TaskLabel,
  TaskPriority,
  TaskDifficulty,
  TaskVisibility,
  ApplicationStatus,
  ApplicationSource,
  AssignmentStatus,
  AssignmentType,
  INCOMPLETE_TASK_STATUSES,
  TERMINAL_TASK_STATUSES,
} from '#constants/task_constants'

test.group('TaskConstants', () => {
  test('TaskStatus enum has correct values', ({ assert }) => {
    assert.equal(TaskStatus.TODO, 'todo')
    assert.equal(TaskStatus.IN_PROGRESS, 'in_progress')
    assert.equal(TaskStatus.DONE, 'done')
    assert.equal(TaskStatus.CANCELLED, 'cancelled')
    assert.equal(TaskStatus.IN_REVIEW, 'in_review')
    assert.equal(Object.values(TaskStatus).length, 5)
  })

  test('TaskLabel enum has correct values', ({ assert }) => {
    assert.equal(TaskLabel.BUG, 'bug')
    assert.equal(TaskLabel.FEATURE, 'feature')
    assert.equal(TaskLabel.ENHANCEMENT, 'enhancement')
    assert.equal(TaskLabel.DOCUMENTATION, 'documentation')
    assert.equal(Object.values(TaskLabel).length, 4)
  })

  test('TaskPriority enum has correct values', ({ assert }) => {
    assert.equal(TaskPriority.LOW, 'low')
    assert.equal(TaskPriority.MEDIUM, 'medium')
    assert.equal(TaskPriority.HIGH, 'high')
    assert.equal(TaskPriority.URGENT, 'urgent')
    assert.equal(Object.values(TaskPriority).length, 4)
  })

  test('TaskDifficulty enum has correct values matching DB CHECK', ({ assert }) => {
    assert.equal(TaskDifficulty.EASY, 'easy')
    assert.equal(TaskDifficulty.MEDIUM, 'medium')
    assert.equal(TaskDifficulty.HARD, 'hard')
    assert.equal(TaskDifficulty.EXPERT, 'expert')
    assert.equal(Object.values(TaskDifficulty).length, 4)
  })

  test('TaskVisibility enum has correct values', ({ assert }) => {
    assert.equal(TaskVisibility.INTERNAL, 'internal')
    assert.equal(TaskVisibility.EXTERNAL, 'external')
    assert.equal(TaskVisibility.ALL, 'all')
    assert.equal(Object.values(TaskVisibility).length, 3)
  })

  test('ApplicationStatus enum has correct values', ({ assert }) => {
    assert.equal(ApplicationStatus.PENDING, 'pending')
    assert.equal(ApplicationStatus.APPROVED, 'approved')
    assert.equal(ApplicationStatus.REJECTED, 'rejected')
    assert.equal(ApplicationStatus.WITHDRAWN, 'withdrawn')
    assert.equal(Object.values(ApplicationStatus).length, 4)
  })

  test('ApplicationSource enum has correct values', ({ assert }) => {
    assert.equal(ApplicationSource.PUBLIC_LISTING, 'public_listing')
    assert.equal(ApplicationSource.INVITATION, 'invitation')
    assert.equal(ApplicationSource.REFERRAL, 'referral')
    assert.equal(Object.values(ApplicationSource).length, 3)
  })

  test('AssignmentStatus enum has correct values', ({ assert }) => {
    assert.equal(AssignmentStatus.ACTIVE, 'active')
    assert.equal(AssignmentStatus.COMPLETED, 'completed')
    assert.equal(AssignmentStatus.CANCELLED, 'cancelled')
    assert.equal(Object.values(AssignmentStatus).length, 3)
  })

  test('AssignmentType enum has correct values', ({ assert }) => {
    assert.equal(AssignmentType.MEMBER, 'member')
    assert.equal(AssignmentType.FREELANCER, 'freelancer')
    assert.equal(AssignmentType.VOLUNTEER, 'volunteer')
    assert.equal(Object.values(AssignmentType).length, 3)
  })

  test('INCOMPLETE_TASK_STATUSES contains non-terminal statuses', ({ assert }) => {
    const incomplete = [...INCOMPLETE_TASK_STATUSES]
    assert.include(incomplete, TaskStatus.TODO)
    assert.include(incomplete, TaskStatus.IN_PROGRESS)
    assert.include(incomplete, TaskStatus.IN_REVIEW)
    assert.notInclude(incomplete, TaskStatus.DONE)
    assert.notInclude(incomplete, TaskStatus.CANCELLED)
  })

  test('TERMINAL_TASK_STATUSES contains only final statuses', ({ assert }) => {
    const terminal = [...TERMINAL_TASK_STATUSES]
    assert.include(terminal, TaskStatus.DONE)
    assert.include(terminal, TaskStatus.CANCELLED)
    assert.notInclude(terminal, TaskStatus.TODO)
    assert.notInclude(terminal, TaskStatus.IN_PROGRESS)
  })

  test('INCOMPLETE + TERMINAL statuses cover all TaskStatus values', ({ assert }) => {
    const allStatuses = new Set([...INCOMPLETE_TASK_STATUSES, ...TERMINAL_TASK_STATUSES])
    assert.equal(allStatuses.size, Object.values(TaskStatus).length)
  })
})
