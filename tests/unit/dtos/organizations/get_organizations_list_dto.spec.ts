import { test } from '@japa/runner'
import { GetOrganizationsListDTO } from '#actions/organizations/dtos/request/get_organizations_list_dto'

const USER_UUID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

// ============================================================================
// GetOrganizationsListDTO - Construction
// ============================================================================
test.group('GetOrganizationsListDTO | Construction', () => {
  test('creates with defaults', ({ assert }) => {
    const dto = new GetOrganizationsListDTO()
    assert.equal(dto.page, 1)
    assert.equal(dto.sortBy, 'created_at')
    assert.equal(dto.sortOrder, 'desc')
  })

  test('creates with custom pagination', ({ assert }) => {
    const dto = new GetOrganizationsListDTO(3, 25)
    assert.equal(dto.page, 3)
    assert.equal(dto.limit, 25)
  })

  test('creates with search', ({ assert }) => {
    const dto = new GetOrganizationsListDTO(1, 10, 'test')
    assert.equal(dto.search, 'test')
  })

  test('creates with plan filter', ({ assert }) => {
    const dto = new GetOrganizationsListDTO(1, 10, undefined, 'premium')
    assert.equal(dto.plan, 'premium')
  })

  test('throws for page < 1', ({ assert }) => {
    assert.throws(() => new GetOrganizationsListDTO(0))
  })

  test('throws for limit > 100', ({ assert }) => {
    assert.throws(() => new GetOrganizationsListDTO(1, 101))
  })

  test('throws for search > 100 chars', ({ assert }) => {
    assert.throws(() => new GetOrganizationsListDTO(1, 10, 'S'.repeat(101)))
  })

  test('throws for invalid plan', ({ assert }) => {
    assert.throws(() => new GetOrganizationsListDTO(1, 10, undefined, 'invalid'))
  })

  test('throws for invalid sortBy', ({ assert }) => {
    assert.throws(() => new GetOrganizationsListDTO(1, 10, undefined, undefined, 'invalid'))
  })
})

// ============================================================================
// GetOrganizationsListDTO - Business Logic
// ============================================================================
test.group('GetOrganizationsListDTO | Business Logic', () => {
  test('getOffset calculates correctly', ({ assert }) => {
    assert.equal(new GetOrganizationsListDTO(1).getOffset(), 0)
    assert.equal(new GetOrganizationsListDTO(2, 10).getOffset(), 10)
    assert.equal(new GetOrganizationsListDTO(3, 25).getOffset(), 50)
  })

  test('hasSearch returns true with search', ({ assert }) => {
    assert.isTrue(new GetOrganizationsListDTO(1, 10, 'test').hasSearch())
  })

  test('hasSearch returns false without search', ({ assert }) => {
    assert.isFalse(new GetOrganizationsListDTO().hasSearch())
  })

  test('getNormalizedSearch trims', ({ assert }) => {
    assert.equal(new GetOrganizationsListDTO(1, 10, '  test  ').getNormalizedSearch(), 'test')
  })

  test('getNormalizedSearch returns null without search', ({ assert }) => {
    assert.isNull(new GetOrganizationsListDTO().getNormalizedSearch())
  })

  test('hasPlanFilter returns true with plan', ({ assert }) => {
    assert.isTrue(new GetOrganizationsListDTO(1, 10, undefined, 'free').hasPlanFilter())
  })

  test('hasPlanFilter returns false without plan', ({ assert }) => {
    assert.isFalse(new GetOrganizationsListDTO().hasPlanFilter())
  })

  test('getNormalizedPlan lowercases', ({ assert }) => {
    assert.equal(
      new GetOrganizationsListDTO(1, 10, undefined, 'Premium').getNormalizedPlan(),
      'premium'
    )
  })

  test('isFirstPage returns true for page 1', ({ assert }) => {
    assert.isTrue(new GetOrganizationsListDTO().isFirstPage())
  })

  test('isFirstPage returns false for page > 1', ({ assert }) => {
    assert.isFalse(new GetOrganizationsListDTO(2).isFirstPage())
  })
})

// ============================================================================
// GetOrganizationsListDTO - Cache & Pagination
// ============================================================================
test.group('GetOrganizationsListDTO | Cache & Pagination', () => {
  test('getCacheKey includes user id', ({ assert }) => {
    const key = new GetOrganizationsListDTO().getCacheKey(USER_UUID)
    assert.include(key, `user:${USER_UUID}`)
  })

  test('getCacheKey includes pagination and sort', ({ assert }) => {
    const key = new GetOrganizationsListDTO(2, 25).getCacheKey(USER_UUID)
    assert.include(key, 'page:2')
    assert.include(key, 'limit:25')
  })

  test('getCacheKey includes search filter', ({ assert }) => {
    const key = new GetOrganizationsListDTO(1, 10, 'test').getCacheKey(USER_UUID)
    assert.include(key, 'search:test')
  })

  test('getCacheKey includes plan filter', ({ assert }) => {
    const key = new GetOrganizationsListDTO(1, 10, undefined, 'free').getCacheKey(USER_UUID)
    assert.include(key, 'plan:free')
  })

  test('getCacheKey is deterministic', ({ assert }) => {
    const dto1 = new GetOrganizationsListDTO(1, 10, 'test')
    const dto2 = new GetOrganizationsListDTO(1, 10, 'test')
    assert.equal(dto1.getCacheKey(USER_UUID), dto2.getCacheKey(USER_UUID))
  })

  test('getOrderByClause returns column and direction', ({ assert }) => {
    const clause = new GetOrganizationsListDTO(
      1,
      10,
      undefined,
      undefined,
      'name',
      'asc'
    ).getOrderByClause()
    assert.equal(clause.column, 'name')
    assert.equal(clause.direction, 'asc')
  })

  test('getPaginationMetadata calculates correctly', ({ assert }) => {
    const meta = new GetOrganizationsListDTO(2, 10).getPaginationMetadata(55)
    assert.equal(meta.page, 2)
    assert.equal(meta.total, 55)
    assert.equal(meta.totalPages, 6)
    assert.isTrue(meta.hasNextPage)
    assert.isTrue(meta.hasPrevPage)
  })
})
