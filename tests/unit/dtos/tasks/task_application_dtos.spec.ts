import { test } from '@japa/runner'
import {
  ApplyForTaskDTO,
  ProcessApplicationDTO,
  WithdrawApplicationDTO,
  GetTaskApplicationsDTO,
  GetPublicTasksDTO,
} from '#actions/tasks/dtos/request/task_application_dtos'
import { ApplicationStatus } from '#constants/task_constants'

test.group('ApplyForTaskDTO', () => {
  test('creates correctly with required fields', ({ assert }) => {
    const dto = new ApplyForTaskDTO({ task_id: 'task-123' })
    assert.equal(dto.task_id, 'task-123')
    assert.isNull(dto.message)
    assert.isNull(dto.expected_rate)
    assert.isNull(dto.portfolio_links)
    assert.equal(dto.application_source, 'public_listing')
  })

  test('creates correctly with all fields', ({ assert }) => {
    const dto = new ApplyForTaskDTO({
      task_id: 'task-123',
      message: 'I am interested',
      expected_rate: 5000000,
      portfolio_links: ['https://github.com/user'],
      application_source: 'referral',
    })
    assert.equal(dto.task_id, 'task-123')
    assert.equal(dto.message, 'I am interested')
    assert.equal(dto.expected_rate, 5000000)
    assert.deepEqual(dto.portfolio_links, ['https://github.com/user'])
    assert.equal(dto.application_source, 'referral')
  })

  test('throws when task_id is missing', ({ assert }) => {
    assert.throws(() => new ApplyForTaskDTO({}), 'task_id is required')
  })

  test('defaults application_source to public_listing', ({ assert }) => {
    const dto = new ApplyForTaskDTO({ task_id: 'task-1' })
    assert.equal(dto.application_source, 'public_listing')
  })
})

test.group('ProcessApplicationDTO', () => {
  test('creates correctly with required fields', ({ assert }) => {
    const dto = new ProcessApplicationDTO({
      application_id: 'app-123',
      action: 'approve',
    })
    assert.equal(dto.application_id, 'app-123')
    assert.equal(dto.action, 'approve')
    assert.isNull(dto.rejection_reason)
    assert.equal(dto.assignment_type, 'freelancer')
    assert.isNull(dto.estimated_hours)
  })

  test('creates correctly with all fields', ({ assert }) => {
    const dto = new ProcessApplicationDTO({
      application_id: 'app-123',
      action: 'reject',
      rejection_reason: 'Not qualified',
      assignment_type: 'member',
      estimated_hours: 40,
    })
    assert.equal(dto.action, 'reject')
    assert.equal(dto.rejection_reason, 'Not qualified')
    assert.equal(dto.assignment_type, 'member')
    assert.equal(dto.estimated_hours, 40)
  })

  test('throws when application_id is missing', ({ assert }) => {
    assert.throws(
      () => new ProcessApplicationDTO({ action: 'approve' }),
      'application_id is required'
    )
  })

  test('throws when action is missing', ({ assert }) => {
    assert.throws(
      () => new ProcessApplicationDTO({ application_id: 'app-1' }),
      'action is required'
    )
  })
})

test.group('WithdrawApplicationDTO', () => {
  test('creates correctly', ({ assert }) => {
    const dto = new WithdrawApplicationDTO('app-123')
    assert.equal(dto.application_id, 'app-123')
  })
})

test.group('GetTaskApplicationsDTO', () => {
  test('creates correctly with required fields', ({ assert }) => {
    const dto = new GetTaskApplicationsDTO({ task_id: 'task-123' })
    assert.equal(dto.task_id, 'task-123')
    assert.equal(dto.status, 'all')
    assert.equal(dto.page, 1)
    assert.isAbove(dto.per_page, 0)
  })

  test('creates correctly with all fields', ({ assert }) => {
    const dto = new GetTaskApplicationsDTO({
      task_id: 'task-123',
      status: ApplicationStatus.PENDING,
      page: 3,
      per_page: 50,
    })
    assert.equal(dto.task_id, 'task-123')
    assert.equal(dto.status, 'pending')
    assert.equal(dto.page, 3)
    assert.equal(dto.per_page, 50)
  })

  test('throws when task_id is missing', ({ assert }) => {
    assert.throws(() => new GetTaskApplicationsDTO({}), 'task_id is required')
  })
})

test.group('GetPublicTasksDTO', () => {
  test('creates correctly with defaults', ({ assert }) => {
    const dto = new GetPublicTasksDTO({})
    assert.equal(dto.page, 1)
    assert.isAbove(dto.per_page, 0)
    assert.isNull(dto.skill_ids)
    assert.isNull(dto.difficulty)
    assert.isNull(dto.min_budget)
    assert.isNull(dto.max_budget)
    assert.equal(dto.sort_by, 'created_at')
    assert.equal(dto.sort_order, 'desc')
  })

  test('creates correctly with all filters', ({ assert }) => {
    const dto = new GetPublicTasksDTO({
      page: 2,
      per_page: 10,
      skill_ids: ['skill-1', 'skill-2'],
      difficulty: 'hard',
      min_budget: 1000000,
      max_budget: 5000000,
      sort_by: 'budget',
      sort_order: 'asc',
    })
    assert.equal(dto.page, 2)
    assert.equal(dto.per_page, 10)
    assert.deepEqual(dto.skill_ids, ['skill-1', 'skill-2'])
    assert.equal(dto.difficulty, 'hard')
    assert.equal(dto.min_budget, 1000000)
    assert.equal(dto.max_budget, 5000000)
    assert.equal(dto.sort_by, 'budget')
    assert.equal(dto.sort_order, 'asc')
  })

  test('sort_by defaults to created_at', ({ assert }) => {
    const dto = new GetPublicTasksDTO({ sort_by: undefined })
    assert.equal(dto.sort_by, 'created_at')
  })

  test('sort_order defaults to desc', ({ assert }) => {
    const dto = new GetPublicTasksDTO({ sort_order: undefined })
    assert.equal(dto.sort_order, 'desc')
  })
})
