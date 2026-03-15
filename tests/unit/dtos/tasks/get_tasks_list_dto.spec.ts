import { test } from '@japa/runner'
import GetTasksListDTO from '#actions/tasks/dtos/request/get_tasks_list_dto'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const USER_UUID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

// ============================================================================
// GetTasksListDTO - Construction
// ============================================================================
test.group('GetTasksListDTO | Construction', () => {
  test('creates with defaults', ({ assert }) => {
    const dto = new GetTasksListDTO({ organization_id: VALID_UUID })
    assert.equal(dto.page, 1)
    assert.equal(dto.limit, 10)
    assert.equal(dto.sort_by, 'due_date')
    assert.equal(dto.sort_order, 'asc')
  })

  test('creates with custom pagination', ({ assert }) => {
    const dto = new GetTasksListDTO({ organization_id: VALID_UUID, page: 3, limit: 25 })
    assert.equal(dto.page, 3)
    assert.equal(dto.limit, 25)
  })

  test('creates with all filters', ({ assert }) => {
    const dto = new GetTasksListDTO({
      organization_id: VALID_UUID,
      status: 'todo',
      priority: 'high',
      label: 'bug',
      assigned_to: USER_UUID,
      search: 'fix',
    })
    assert.equal(dto.status, 'todo')
    assert.equal(dto.priority, 'high')
    assert.equal(dto.label, 'bug')
  })

  test('trims search term', ({ assert }) => {
    const dto = new GetTasksListDTO({ organization_id: VALID_UUID, search: '  query  ' })
    assert.equal(dto.search, 'query')
  })

  test('throws for missing organization_id', ({ assert }) => {
    assert.throws(() => new GetTasksListDTO({ organization_id: '' }))
  })

  test('throws for page < 1', ({ assert }) => {
    assert.throws(() => new GetTasksListDTO({ organization_id: VALID_UUID, page: 0 }))
  })

  test('throws for limit < 1', ({ assert }) => {
    assert.throws(() => new GetTasksListDTO({ organization_id: VALID_UUID, limit: 0 }))
  })

  test('throws for limit > 100', ({ assert }) => {
    assert.throws(() => new GetTasksListDTO({ organization_id: VALID_UUID, limit: 101 }))
  })

  test('throws for empty search', ({ assert }) => {
    assert.throws(() => new GetTasksListDTO({ organization_id: VALID_UUID, search: '' }))
  })

  test('throws for search > 255 chars', ({ assert }) => {
    assert.throws(
      () => new GetTasksListDTO({ organization_id: VALID_UUID, search: 'S'.repeat(256) })
    )
  })
})

// ============================================================================
// GetTasksListDTO - Filter Detection
// ============================================================================
test.group('GetTasksListDTO | Filters', () => {
  test('hasFilters returns false for no filters', ({ assert }) => {
    const dto = new GetTasksListDTO({ organization_id: VALID_UUID })
    assert.isFalse(dto.hasFilters())
  })

  test('hasFilters returns true with status filter', ({ assert }) => {
    const dto = new GetTasksListDTO({ organization_id: VALID_UUID, status: 'todo' })
    assert.isTrue(dto.hasFilters())
  })

  test('hasFilters returns true with search', ({ assert }) => {
    const dto = new GetTasksListDTO({ organization_id: VALID_UUID, search: 'fix' })
    assert.isTrue(dto.hasFilters())
  })

  test('hasStatusFilter detects status', ({ assert }) => {
    assert.isTrue(
      new GetTasksListDTO({ organization_id: VALID_UUID, status: 'todo' }).hasStatusFilter()
    )
    assert.isFalse(new GetTasksListDTO({ organization_id: VALID_UUID }).hasStatusFilter())
  })

  test('hasPriorityFilter detects priority', ({ assert }) => {
    assert.isTrue(
      new GetTasksListDTO({ organization_id: VALID_UUID, priority: 'high' }).hasPriorityFilter()
    )
    assert.isFalse(new GetTasksListDTO({ organization_id: VALID_UUID }).hasPriorityFilter())
  })

  test('hasLabelFilter detects label', ({ assert }) => {
    assert.isTrue(
      new GetTasksListDTO({ organization_id: VALID_UUID, label: 'bug' }).hasLabelFilter()
    )
  })

  test('hasAssigneeFilter detects assignee', ({ assert }) => {
    assert.isTrue(
      new GetTasksListDTO({
        organization_id: VALID_UUID,
        assigned_to: USER_UUID,
      }).hasAssigneeFilter()
    )
  })

  test('hasSearch detects search term', ({ assert }) => {
    assert.isTrue(new GetTasksListDTO({ organization_id: VALID_UUID, search: 'test' }).hasSearch())
    assert.isFalse(new GetTasksListDTO({ organization_id: VALID_UUID }).hasSearch())
  })
})

// ============================================================================
// GetTasksListDTO - Task Type Detection
// ============================================================================
test.group('GetTasksListDTO | Task Types', () => {
  test('isSubtasksOnly when parent_task_id is set', ({ assert }) => {
    const dto = new GetTasksListDTO({
      organization_id: VALID_UUID,
      parent_task_id: VALID_UUID,
    })
    assert.isTrue(dto.isSubtasksOnly())
    assert.isFalse(dto.isRootTasksOnly())
  })

  test('isRootTasksOnly when parent_task_id is null', ({ assert }) => {
    const dto = new GetTasksListDTO({
      organization_id: VALID_UUID,
      parent_task_id: null,
    })
    assert.isTrue(dto.isRootTasksOnly())
    assert.isFalse(dto.isSubtasksOnly())
  })

  test('isWithoutProject when project_id is null', ({ assert }) => {
    const dto = new GetTasksListDTO({
      organization_id: VALID_UUID,
      project_id: null,
    })
    assert.isTrue(dto.isWithoutProject())
  })
})

// ============================================================================
// GetTasksListDTO - Pagination & Caching
// ============================================================================
test.group('GetTasksListDTO | Pagination & Cache', () => {
  test('getOffset calculates correctly', ({ assert }) => {
    assert.equal(new GetTasksListDTO({ organization_id: VALID_UUID, page: 1 }).getOffset(), 0)
    assert.equal(new GetTasksListDTO({ organization_id: VALID_UUID, page: 2 }).getOffset(), 10)
    assert.equal(
      new GetTasksListDTO({ organization_id: VALID_UUID, page: 3, limit: 25 }).getOffset(),
      50
    )
  })

  test('getCacheKey is deterministic', ({ assert }) => {
    const dto1 = new GetTasksListDTO({ organization_id: VALID_UUID, status: 'todo' })
    const dto2 = new GetTasksListDTO({ organization_id: VALID_UUID, status: 'todo' })
    assert.equal(dto1.getCacheKey(), dto2.getCacheKey())
  })

  test('getCacheKey differs with different filters', ({ assert }) => {
    const dto1 = new GetTasksListDTO({ organization_id: VALID_UUID, status: 'todo' })
    const dto2 = new GetTasksListDTO({ organization_id: VALID_UUID, status: 'done' })
    assert.notEqual(dto1.getCacheKey(), dto2.getCacheKey())
  })

  test('getCacheKey includes organization_id', ({ assert }) => {
    const dto = new GetTasksListDTO({ organization_id: VALID_UUID })
    assert.include(dto.getCacheKey(), `org:${VALID_UUID}`)
  })

  test('getCacheKey starts with tasks:list:', ({ assert }) => {
    const dto = new GetTasksListDTO({ organization_id: VALID_UUID })
    assert.isTrue(dto.getCacheKey().startsWith('tasks:list:'))
  })
})
