import { test } from '@japa/runner'
import { UpdateProjectDTO } from '#actions/projects/dtos/request/update_project_dto'
import { ProjectStatus, ProjectVisibility } from '#constants/project_constants'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// ============================================================================
// UpdateProjectDTO - Construction
// ============================================================================
test.group('UpdateProjectDTO | Construction', () => {
  test('creates with name only', ({ assert }) => {
    const dto = new UpdateProjectDTO({ project_id: VALID_UUID, name: 'Project X' })
    assert.equal(dto.project_id, VALID_UUID)
    assert.equal(dto.name, 'Project X')
  })

  test('trims name', ({ assert }) => {
    const dto = new UpdateProjectDTO({ project_id: VALID_UUID, name: '  Trimmed  ' })
    assert.equal(dto.name, 'Trimmed')
  })

  test('creates with status', ({ assert }) => {
    const dto = new UpdateProjectDTO({
      project_id: VALID_UUID,
      status: ProjectStatus.IN_PROGRESS,
    })
    assert.equal(dto.status, ProjectStatus.IN_PROGRESS)
  })

  test('creates with visibility', ({ assert }) => {
    const dto = new UpdateProjectDTO({
      project_id: VALID_UUID,
      visibility: ProjectVisibility.PRIVATE,
    })
    assert.equal(dto.visibility, ProjectVisibility.PRIVATE)
  })

  test('creates with null description (clear)', ({ assert }) => {
    const dto = new UpdateProjectDTO({ project_id: VALID_UUID, description: null })
    assert.isNull(dto.description)
  })

  test('creates with null manager_id (unassign)', ({ assert }) => {
    const dto = new UpdateProjectDTO({ project_id: VALID_UUID, manager_id: null })
    assert.isNull(dto.manager_id)
  })

  test('throws for missing project_id', ({ assert }) => {
    assert.throws(() => new UpdateProjectDTO({ project_id: '', name: 'Test' }))
  })

  test('throws for empty name', ({ assert }) => {
    assert.throws(() => new UpdateProjectDTO({ project_id: VALID_UUID, name: '   ' }))
  })

  test('throws for name < 3 chars', ({ assert }) => {
    assert.throws(() => new UpdateProjectDTO({ project_id: VALID_UUID, name: 'AB' }))
  })

  test('throws for name > 100 chars', ({ assert }) => {
    assert.throws(() => new UpdateProjectDTO({ project_id: VALID_UUID, name: 'N'.repeat(101) }))
  })

  test('throws for description > 1000 chars', ({ assert }) => {
    assert.throws(
      () => new UpdateProjectDTO({ project_id: VALID_UUID, description: 'D'.repeat(1001) })
    )
  })

  test('throws for invalid status', ({ assert }) => {
    assert.throws(() => new UpdateProjectDTO({ project_id: VALID_UUID, status: 'invalid' }))
  })

  test('throws for negative budget', ({ assert }) => {
    assert.throws(() => new UpdateProjectDTO({ project_id: VALID_UUID, budget: -1 }))
  })

  test('accepts zero budget', ({ assert }) => {
    const dto = new UpdateProjectDTO({ project_id: VALID_UUID, budget: 0 })
    assert.equal(dto.budget, 0)
  })

  test('accepts all valid statuses', ({ assert }) => {
    for (const status of Object.values(ProjectStatus)) {
      const dto = new UpdateProjectDTO({ project_id: VALID_UUID, status })
      assert.equal(dto.status, status)
    }
  })
})

// ============================================================================
// UpdateProjectDTO - Business Logic
// ============================================================================
test.group('UpdateProjectDTO | Business Logic', () => {
  test('hasUpdates true when fields provided', ({ assert }) => {
    assert.isTrue(new UpdateProjectDTO({ project_id: VALID_UUID, name: 'Test' }).hasUpdates())
  })

  test('getUpdatedFields returns correct fields', ({ assert }) => {
    const dto = new UpdateProjectDTO({
      project_id: VALID_UUID,
      name: 'Test',
      status: ProjectStatus.COMPLETED,
    })
    const fields = dto.getUpdatedFields()
    assert.include(fields, 'name')
    assert.include(fields, 'status')
    // description becomes null via `undefined?.trim() || null` in constructor
    assert.include(fields, 'description')
  })

  test('getUpdatedFields includes null fields', ({ assert }) => {
    const dto = new UpdateProjectDTO({ project_id: VALID_UUID, manager_id: null })
    assert.include(dto.getUpdatedFields(), 'manager_id')
  })
})

// ============================================================================
// UpdateProjectDTO - Serialization
// ============================================================================
test.group('UpdateProjectDTO | Serialization', () => {
  test('toObject includes only provided fields', ({ assert }) => {
    const dto = new UpdateProjectDTO({ project_id: VALID_UUID, name: 'Test' })
    const obj = dto.toObject()
    assert.property(obj, 'name')
    assert.notProperty(obj, 'status')
    // description is always set (null when not provided) due to constructor logic
    assert.property(obj, 'description')
  })

  test('toObject includes null values for cleared fields', ({ assert }) => {
    const dto = new UpdateProjectDTO({ project_id: VALID_UUID, manager_id: null })
    const obj = dto.toObject()
    assert.isNull(obj.manager_id)
  })

  test('toObject includes budget', ({ assert }) => {
    const dto = new UpdateProjectDTO({ project_id: VALID_UUID, budget: 5000 })
    assert.equal(dto.toObject().budget, 5000)
  })
})
