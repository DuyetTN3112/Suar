import { test } from '@japa/runner'
import { CreateProjectDTO } from '#actions/projects/dtos/request/create_project_dto'
import { DeleteProjectDTO } from '#actions/projects/dtos/request/delete_project_dto'
import { UpdateProjectDTO } from '#actions/projects/dtos/request/update_project_dto'
import { ProjectStatus, ProjectVisibility } from '#constants/project_constants'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// ============================================================================
// CreateProjectDTO
// ============================================================================
test.group('CreateProjectDTO', () => {
  test('creates with valid minimal data', ({ assert }) => {
    const dto = new CreateProjectDTO({ name: 'Test Project', organization_id: VALID_UUID })
    assert.equal(dto.name, 'Test Project')
    assert.equal(dto.organization_id, VALID_UUID)
    assert.equal(dto.status, ProjectStatus.PENDING)
    assert.equal(dto.visibility, ProjectVisibility.TEAM)
    assert.equal(dto.budget, 0)
  })

  test('creates with all fields', ({ assert }) => {
    const dto = new CreateProjectDTO({
      name: 'Full Project',
      description: 'A test project',
      organization_id: VALID_UUID,
      status: ProjectStatus.IN_PROGRESS,
      visibility: ProjectVisibility.PUBLIC,
      budget: 5000000,
    })
    assert.equal(dto.status, ProjectStatus.IN_PROGRESS)
    assert.equal(dto.visibility, ProjectVisibility.PUBLIC)
    assert.equal(dto.budget, 5000000)
  })

  test('throws for empty name', ({ assert }) => {
    assert.throws(() => new CreateProjectDTO({ name: '', organization_id: VALID_UUID }), /bắt buộc/)
  })

  test('throws for name shorter than 3 characters', ({ assert }) => {
    assert.throws(
      () => new CreateProjectDTO({ name: 'AB', organization_id: VALID_UUID }),
      /ít nhất 3/
    )
  })

  test('throws for name longer than 100 characters', ({ assert }) => {
    assert.throws(
      () => new CreateProjectDTO({ name: 'A'.repeat(101), organization_id: VALID_UUID }),
      /vượt quá 100/
    )
  })

  test('throws for missing organization_id', ({ assert }) => {
    assert.throws(() => new CreateProjectDTO({ name: 'Test', organization_id: '' }), /tổ chức/)
  })

  test('throws for invalid status', ({ assert }) => {
    assert.throws(
      () => new CreateProjectDTO({ name: 'Test', organization_id: VALID_UUID, status: 'invalid' }),
      /không hợp lệ/
    )
  })

  test('throws for negative budget', ({ assert }) => {
    assert.throws(
      () => new CreateProjectDTO({ name: 'Test', organization_id: VALID_UUID, budget: -100 }),
      /số âm/
    )
  })

  test('throws for description longer than 1000 characters', ({ assert }) => {
    assert.throws(
      () =>
        new CreateProjectDTO({
          name: 'Test',
          organization_id: VALID_UUID,
          description: 'A'.repeat(1001),
        }),
      /vượt quá 1000/
    )
  })

  test('toObject returns correct structure', ({ assert }) => {
    const dto = new CreateProjectDTO({ name: 'Test', organization_id: VALID_UUID })
    const obj = dto.toObject()
    assert.equal(obj.name, 'Test')
    assert.equal(obj.organization_id, VALID_UUID)
    assert.equal(obj.status, ProjectStatus.PENDING)
    assert.equal(obj.budget, 0)
  })

  test('getSummary returns project info', ({ assert }) => {
    const dto = new CreateProjectDTO({ name: 'My Project', organization_id: VALID_UUID })
    const summary = dto.getSummary()
    assert.include(summary, 'My Project')
  })
})

// ============================================================================
// DeleteProjectDTO
// ============================================================================
test.group('DeleteProjectDTO', () => {
  test('creates with valid project ID', ({ assert }) => {
    const dto = new DeleteProjectDTO({ project_id: VALID_UUID })
    assert.equal(dto.project_id, VALID_UUID)
    assert.isFalse(dto.permanent)
  })

  test('creates with permanent flag', ({ assert }) => {
    const dto = new DeleteProjectDTO({ project_id: VALID_UUID, permanent: true })
    assert.isTrue(dto.isPermanentDelete())
  })

  test('throws for missing project ID', ({ assert }) => {
    assert.throws(() => new DeleteProjectDTO({ project_id: '' }), /không hợp lệ/)
  })

  test('throws for reason exceeding 500 characters', ({ assert }) => {
    assert.throws(
      () => new DeleteProjectDTO({ project_id: VALID_UUID, reason: 'A'.repeat(501) }),
      /vượt quá 500/
    )
  })

  test('hasReason returns correct value', ({ assert }) => {
    const withReason = new DeleteProjectDTO({ project_id: VALID_UUID, reason: 'No longer needed' })
    assert.isTrue(withReason.hasReason())

    const withoutReason = new DeleteProjectDTO({ project_id: VALID_UUID })
    assert.isFalse(withoutReason.hasReason())
  })
})

// ============================================================================
// UpdateProjectDTO
// ============================================================================
test.group('UpdateProjectDTO', () => {
  test('creates with valid update data', ({ assert }) => {
    const dto = new UpdateProjectDTO({ project_id: VALID_UUID, name: 'Updated Name' })
    assert.equal(dto.name, 'Updated Name')
  })

  test('throws for missing project ID', ({ assert }) => {
    assert.throws(() => new UpdateProjectDTO({ project_id: '', name: 'Test' }), /không hợp lệ/)
  })

  test('throws for name shorter than 3 characters', ({ assert }) => {
    assert.throws(() => new UpdateProjectDTO({ project_id: VALID_UUID, name: 'AB' }), /ít nhất 3/)
  })

  test('throws for invalid status', ({ assert }) => {
    assert.throws(
      () => new UpdateProjectDTO({ project_id: VALID_UUID, status: 'invalid' }),
      /không hợp lệ/
    )
  })

  test('accepts valid status update', ({ assert }) => {
    const dto = new UpdateProjectDTO({ project_id: VALID_UUID, status: ProjectStatus.COMPLETED })
    assert.equal(dto.status, ProjectStatus.COMPLETED)
  })

  test('throws for negative budget', ({ assert }) => {
    assert.throws(() => new UpdateProjectDTO({ project_id: VALID_UUID, budget: -100 }), /số âm/)
  })
})
