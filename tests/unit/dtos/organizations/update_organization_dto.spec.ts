import { test } from '@japa/runner'
import { UpdateOrganizationDTO } from '#actions/organizations/dtos/request/update_organization_dto'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// ============================================================================
// UpdateOrganizationDTO - Construction
// ============================================================================
test.group('UpdateOrganizationDTO | Construction', () => {
  test('creates with name only', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(VALID_UUID, 'New Name')
    assert.equal(dto.organizationId, VALID_UUID)
    assert.equal(dto.name, 'New Name')
  })

  test('creates with slug only', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(VALID_UUID, undefined, 'new-slug')
    assert.equal(dto.slug, 'new-slug')
  })

  test('creates with description only', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(VALID_UUID, undefined, undefined, 'A description')
    assert.equal(dto.description, 'A description')
  })

  test('creates with all fields', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(
      VALID_UUID,
      'Name',
      'slug',
      'Desc',
      'https://logo.com/img.png',
      'https://example.com',
      'premium'
    )
    assert.equal(dto.name, 'Name')
    assert.equal(dto.slug, 'slug')
    assert.equal(dto.plan, 'premium')
  })

  test('throws for missing organization_id', ({ assert }) => {
    assert.throws(() => new UpdateOrganizationDTO('', 'Name'))
  })

  test('throws when no fields provided', ({ assert }) => {
    assert.throws(() => new UpdateOrganizationDTO(VALID_UUID))
  })

  test('throws for name < 3 chars', ({ assert }) => {
    assert.throws(() => new UpdateOrganizationDTO(VALID_UUID, 'AB'))
  })

  test('throws for name > 100 chars', ({ assert }) => {
    assert.throws(() => new UpdateOrganizationDTO(VALID_UUID, 'N'.repeat(101)))
  })

  test('throws for slug with uppercase', ({ assert }) => {
    assert.throws(() => new UpdateOrganizationDTO(VALID_UUID, undefined, 'Invalid-Slug'))
  })

  test('throws for slug starting with hyphen', ({ assert }) => {
    assert.throws(() => new UpdateOrganizationDTO(VALID_UUID, undefined, '-bad-slug'))
  })

  test('throws for slug ending with hyphen', ({ assert }) => {
    assert.throws(() => new UpdateOrganizationDTO(VALID_UUID, undefined, 'bad-slug-'))
  })

  test('throws for slug with consecutive hyphens', ({ assert }) => {
    assert.throws(() => new UpdateOrganizationDTO(VALID_UUID, undefined, 'bad--slug'))
  })

  test('throws for description > 500 chars', ({ assert }) => {
    assert.throws(
      () => new UpdateOrganizationDTO(VALID_UUID, undefined, undefined, 'D'.repeat(501))
    )
  })

  test('throws for invalid logo URL', ({ assert }) => {
    assert.throws(
      () => new UpdateOrganizationDTO(VALID_UUID, undefined, undefined, undefined, 'not-a-url')
    )
  })

  test('throws for invalid website URL', ({ assert }) => {
    assert.throws(
      () =>
        new UpdateOrganizationDTO(
          VALID_UUID,
          undefined,
          undefined,
          undefined,
          undefined,
          'not-a-url'
        )
    )
  })

  test('throws for invalid plan', ({ assert }) => {
    assert.throws(
      () =>
        new UpdateOrganizationDTO(
          VALID_UUID,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'invalid-plan'
        )
    )
  })

  test('accepts valid plan values', ({ assert }) => {
    for (const plan of ['free', 'basic', 'premium', 'enterprise']) {
      const dto = new UpdateOrganizationDTO(
        VALID_UUID,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        plan
      )
      assert.equal(dto.plan, plan)
    }
  })
})

// ============================================================================
// UpdateOrganizationDTO - Business Logic
// ============================================================================
test.group('UpdateOrganizationDTO | Business Logic', () => {
  test('hasUpdates returns true when fields provided', ({ assert }) => {
    assert.isTrue(new UpdateOrganizationDTO(VALID_UUID, 'Name').hasUpdates())
  })

  test('getChangedFields returns correct fields', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(VALID_UUID, 'Name', 'slug')
    assert.deepEqual(dto.getChangedFields(), ['name', 'slug'])
  })

  test('getChangedFieldsCount returns correct count', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(VALID_UUID, 'Name', 'slug')
    assert.equal(dto.getChangedFieldsCount(), 2)
  })

  test('isFieldUpdating detects specific fields', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(VALID_UUID, 'Name')
    assert.isTrue(dto.isFieldUpdating('name'))
    assert.isFalse(dto.isFieldUpdating('slug'))
  })

  test('getChangesSummary for single field', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(VALID_UUID, 'Name')
    assert.equal(dto.getChangesSummary(), 'Updated name')
  })

  test('getChangesSummary for two fields', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(VALID_UUID, 'Name', 'slug')
    assert.equal(dto.getChangesSummary(), 'Updated name and slug')
  })

  test('getChangesSummary for three+ fields', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(VALID_UUID, 'Name', 'slug', 'desc')
    assert.include(dto.getChangesSummary(), '3 fields')
  })
})

// ============================================================================
// UpdateOrganizationDTO - Serialization
// ============================================================================
test.group('UpdateOrganizationDTO | Serialization', () => {
  test('toObject includes only provided fields', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(VALID_UUID, 'New Name')
    const obj = dto.toObject()
    assert.property(obj, 'name')
    assert.notProperty(obj, 'slug')
    assert.notProperty(obj, 'description')
  })

  test('toObject trims name', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(VALID_UUID, '  Trimmed  ')
    assert.equal(dto.toObject().name, 'Trimmed')
  })

  test('toObject normalizes plan to lowercase', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(
      VALID_UUID,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'Premium'
    )
    assert.equal(dto.toObject().plan, 'premium')
  })

  test('toObject sets null for empty description', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(VALID_UUID, undefined, undefined, '   ')
    assert.isNull(dto.toObject().description)
  })

  test('toObject sets null for empty logo', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(VALID_UUID, undefined, undefined, undefined, '   ')
    assert.isNull(dto.toObject().logo)
  })
})
