import { test } from '@japa/runner'
import { GetOrganizationMembersDTO } from '#actions/organizations/dtos/request/get_organization_members_dto'
import { OrganizationRole } from '#constants/organization_constants'

const ORG_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// ============================================================================
// GetOrganizationMembersDTO - Construction
// ============================================================================
test.group('GetOrganizationMembersDTO | Construction', () => {
  test('creates with defaults', ({ assert }) => {
    const dto = new GetOrganizationMembersDTO(ORG_UUID)
    assert.equal(dto.organizationId, ORG_UUID)
    assert.equal(dto.page, 1)
    assert.equal(dto.sortBy, 'joined_at')
    assert.equal(dto.sortOrder, 'desc')
  })

  test('creates with custom pagination', ({ assert }) => {
    const dto = new GetOrganizationMembersDTO(ORG_UUID, 3, 25)
    assert.equal(dto.page, 3)
    assert.equal(dto.limit, 25)
  })

  test('creates with role filter', ({ assert }) => {
    const dto = new GetOrganizationMembersDTO(ORG_UUID, 1, 10, OrganizationRole.ADMIN)
    assert.equal(dto.roleId, OrganizationRole.ADMIN)
  })

  test('creates with search', ({ assert }) => {
    const dto = new GetOrganizationMembersDTO(ORG_UUID, 1, 10, undefined, 'john')
    assert.equal(dto.search, 'john')
  })

  test('throws for missing organizationId', ({ assert }) => {
    assert.throws(() => new GetOrganizationMembersDTO(''))
  })

  test('throws for page < 1', ({ assert }) => {
    assert.throws(() => new GetOrganizationMembersDTO(ORG_UUID, 0))
  })

  test('throws for limit > 100', ({ assert }) => {
    assert.throws(() => new GetOrganizationMembersDTO(ORG_UUID, 1, 101))
  })

  test('throws for invalid role filter', ({ assert }) => {
    assert.throws(() => new GetOrganizationMembersDTO(ORG_UUID, 1, 10, 'superadmin'))
  })

  test('throws for search > 100 chars', ({ assert }) => {
    assert.throws(() => new GetOrganizationMembersDTO(ORG_UUID, 1, 10, undefined, 'S'.repeat(101)))
  })

  test('throws for invalid sortBy', ({ assert }) => {
    assert.throws(
      () => new GetOrganizationMembersDTO(ORG_UUID, 1, 10, undefined, undefined, 'invalid')
    )
  })
})

// ============================================================================
// GetOrganizationMembersDTO - Business Logic
// ============================================================================
test.group('GetOrganizationMembersDTO | Business Logic', () => {
  test('getOffset calculates correctly', ({ assert }) => {
    assert.equal(new GetOrganizationMembersDTO(ORG_UUID, 1).getOffset(), 0)
    assert.equal(new GetOrganizationMembersDTO(ORG_UUID, 2, 10).getOffset(), 10)
    assert.equal(new GetOrganizationMembersDTO(ORG_UUID, 3, 25).getOffset(), 50)
  })

  test('hasRoleFilter detects role', ({ assert }) => {
    assert.isTrue(
      new GetOrganizationMembersDTO(ORG_UUID, 1, 10, OrganizationRole.ADMIN).hasRoleFilter()
    )
    assert.isFalse(new GetOrganizationMembersDTO(ORG_UUID).hasRoleFilter())
  })

  test('hasSearch detects search', ({ assert }) => {
    assert.isTrue(new GetOrganizationMembersDTO(ORG_UUID, 1, 10, undefined, 'test').hasSearch())
    assert.isFalse(new GetOrganizationMembersDTO(ORG_UUID).hasSearch())
  })

  test('getNormalizedSearch trims', ({ assert }) => {
    const dto = new GetOrganizationMembersDTO(ORG_UUID, 1, 10, undefined, '  query  ')
    assert.equal(dto.getNormalizedSearch(), 'query')
  })

  test('getNormalizedSearch returns null without search', ({ assert }) => {
    assert.isNull(new GetOrganizationMembersDTO(ORG_UUID).getNormalizedSearch())
  })

  test('getRoleName returns display name', ({ assert }) => {
    assert.equal(
      new GetOrganizationMembersDTO(ORG_UUID, 1, 10, OrganizationRole.ADMIN).getRoleName(),
      'Admin'
    )
  })

  test('getRoleName returns null without filter', ({ assert }) => {
    assert.isNull(new GetOrganizationMembersDTO(ORG_UUID).getRoleName())
  })

  test('getCacheTTL returns 180', ({ assert }) => {
    assert.equal(new GetOrganizationMembersDTO(ORG_UUID).getCacheTTL(), 180)
  })
})

// ============================================================================
// GetOrganizationMembersDTO - Cache & Query
// ============================================================================
test.group('GetOrganizationMembersDTO | Cache & Query', () => {
  test('getCacheKey includes org id', ({ assert }) => {
    const key = new GetOrganizationMembersDTO(ORG_UUID).getCacheKey()
    assert.include(key, `org:${ORG_UUID}`)
  })

  test('getCacheKey includes pagination', ({ assert }) => {
    const key = new GetOrganizationMembersDTO(ORG_UUID, 2, 25).getCacheKey()
    assert.include(key, 'page:2')
    assert.include(key, 'limit:25')
  })

  test('getCacheKey includes role filter', ({ assert }) => {
    const key = new GetOrganizationMembersDTO(ORG_UUID, 1, 10, OrganizationRole.ADMIN).getCacheKey()
    assert.include(key, `role:${OrganizationRole.ADMIN}`)
  })

  test('getCacheKey includes search', ({ assert }) => {
    const key = new GetOrganizationMembersDTO(ORG_UUID, 1, 10, undefined, 'test').getCacheKey()
    assert.include(key, 'search:test')
  })

  test('getCacheKey is deterministic', ({ assert }) => {
    const dto1 = new GetOrganizationMembersDTO(ORG_UUID, 1, 10, OrganizationRole.ADMIN)
    const dto2 = new GetOrganizationMembersDTO(ORG_UUID, 1, 10, OrganizationRole.ADMIN)
    assert.equal(dto1.getCacheKey(), dto2.getCacheKey())
  })

  test('getOrderByClause maps to DB columns', ({ assert }) => {
    const clause = new GetOrganizationMembersDTO(ORG_UUID).getOrderByClause()
    assert.equal(clause.column, 'organization_users.created_at')
    assert.equal(clause.direction, 'desc')
  })

  test('getOrderByClause maps name sort', ({ assert }) => {
    const clause = new GetOrganizationMembersDTO(
      ORG_UUID,
      1,
      10,
      undefined,
      undefined,
      'name',
      'asc'
    ).getOrderByClause()
    assert.equal(clause.column, 'users.name')
    assert.equal(clause.direction, 'asc')
  })

  test('getPaginationMetadata calculates correctly', ({ assert }) => {
    const dto = new GetOrganizationMembersDTO(ORG_UUID, 2, 10)
    const meta = dto.getPaginationMetadata(55)
    assert.equal(meta.page, 2)
    assert.equal(meta.limit, 10)
    assert.equal(meta.total, 55)
    assert.equal(meta.totalPages, 6)
    assert.isTrue(meta.hasNextPage)
    assert.isTrue(meta.hasPrevPage)
  })

  test('getPaginationMetadata detects first page', ({ assert }) => {
    const meta = new GetOrganizationMembersDTO(ORG_UUID).getPaginationMetadata(5)
    assert.isFalse(meta.hasPrevPage)
  })

  test('getPaginationMetadata detects last page', ({ assert }) => {
    const meta = new GetOrganizationMembersDTO(ORG_UUID, 3, 10).getPaginationMetadata(30)
    assert.isFalse(meta.hasNextPage)
  })
})
