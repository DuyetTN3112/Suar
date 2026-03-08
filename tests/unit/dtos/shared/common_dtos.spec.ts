import { test } from '@japa/runner'
import {
  PaginationDTO,
  PaginatedResult,
  OrganizationContextDTO,
  SortDTO,
  DateRangeDTO,
  SearchDTO,
  IdDTO,
} from '#actions/shared/common_dtos'

// ============================================================================
// PaginationDTO
// ============================================================================
test.group('PaginationDTO', () => {
  test('creates with defaults', ({ assert }) => {
    const dto = new PaginationDTO()
    assert.equal(dto.page, 1)
    assert.equal(dto.limit, 10)
  })

  test('creates with custom values', ({ assert }) => {
    const dto = new PaginationDTO(3, 25)
    assert.equal(dto.page, 3)
    assert.equal(dto.limit, 25)
  })

  test('calculates offset correctly', ({ assert }) => {
    assert.equal(new PaginationDTO(1, 10).offset, 0)
    assert.equal(new PaginationDTO(2, 10).offset, 10)
    assert.equal(new PaginationDTO(3, 20).offset, 40)
    assert.equal(new PaginationDTO(5, 15).offset, 60)
  })

  test('throws for page < 1', ({ assert }) => {
    assert.throws(() => new PaginationDTO(0, 10), /page/i)
    assert.throws(() => new PaginationDTO(-1, 10), /page/i)
  })

  test('throws for limit < 1', ({ assert }) => {
    assert.throws(() => new PaginationDTO(1, 0), /limit/i)
  })

  test('throws for limit > 100', ({ assert }) => {
    assert.throws(() => new PaginationDTO(1, 101), /limit/i)
  })

  test('allows limit of exactly 1', ({ assert }) => {
    const dto = new PaginationDTO(1, 1)
    assert.equal(dto.limit, 1)
  })

  test('allows limit of exactly 100', ({ assert }) => {
    const dto = new PaginationDTO(1, 100)
    assert.equal(dto.limit, 100)
  })
})

// ============================================================================
// PaginatedResult
// ============================================================================
test.group('PaginatedResult', () => {
  test('creates with constructor', ({ assert }) => {
    const result = new PaginatedResult(['a', 'b'], {
      total: 10,
      perPage: 5,
      currentPage: 1,
      lastPage: 2,
      firstPage: 1,
    })
    assert.deepEqual(result.data, ['a', 'b'])
    assert.equal(result.meta.total, 10)
  })

  test('static create computes meta correctly', ({ assert }) => {
    const pagination = new PaginationDTO(2, 10)
    const result = PaginatedResult.create([1, 2, 3], 25, pagination)
    assert.deepEqual(result.data, [1, 2, 3])
    assert.equal(result.meta.total, 25)
    assert.equal(result.meta.perPage, 10)
    assert.equal(result.meta.currentPage, 2)
    assert.equal(result.meta.lastPage, 3) // ceil(25/10)
    assert.equal(result.meta.firstPage, 1)
  })

  test('static create handles empty data', ({ assert }) => {
    const pagination = new PaginationDTO(1, 10)
    const result = PaginatedResult.create([], 0, pagination)
    assert.deepEqual(result.data, [])
    assert.equal(result.meta.total, 0)
    assert.equal(result.meta.lastPage, 0) // ceil(0/10)
  })

  test('static create handles single page', ({ assert }) => {
    const pagination = new PaginationDTO(1, 10)
    const result = PaginatedResult.create([1, 2], 2, pagination)
    assert.equal(result.meta.lastPage, 1)
  })
})

// ============================================================================
// OrganizationContextDTO
// ============================================================================
test.group('OrganizationContextDTO', () => {
  test('creates with organization and user id', ({ assert }) => {
    const dto = new OrganizationContextDTO(1, 42)
    assert.equal(dto.organizationId, 1)
    assert.equal(dto.userId, 42)
  })
})

// ============================================================================
// SortDTO
// ============================================================================
test.group('SortDTO', () => {
  test('creates with field and default asc direction', ({ assert }) => {
    const dto = new SortDTO('name')
    assert.equal(dto.field, 'name')
    assert.equal(dto.direction, 'asc')
  })

  test('creates with explicit desc direction', ({ assert }) => {
    const dto = new SortDTO('created_at', 'desc')
    assert.equal(dto.direction, 'desc')
  })
})

// ============================================================================
// DateRangeDTO
// ============================================================================
test.group('DateRangeDTO', () => {
  test('creates valid date range', ({ assert }) => {
    const from = new Date('2024-01-01')
    const to = new Date('2024-12-31')
    const dto = new DateRangeDTO(from, to)
    assert.equal(dto.from, from)
    assert.equal(dto.to, to)
  })

  test('allows same date for from and to', ({ assert }) => {
    const date = new Date('2024-06-15')
    const dto = new DateRangeDTO(date, date)
    assert.equal(dto.from, date)
  })

  test('throws when from is after to', ({ assert }) => {
    const from = new Date('2024-12-31')
    const to = new Date('2024-01-01')
    assert.throws(() => new DateRangeDTO(from, to), /from/i)
  })
})

// ============================================================================
// SearchDTO
// ============================================================================
test.group('SearchDTO', () => {
  test('creates with valid search term', ({ assert }) => {
    const dto = new SearchDTO('hello')
    assert.equal(dto.searchTerm, 'hello')
  })

  test('allows exactly 2 characters', ({ assert }) => {
    const dto = new SearchDTO('ab')
    assert.equal(dto.searchTerm, 'ab')
  })

  test('throws for single character', ({ assert }) => {
    assert.throws(() => new SearchDTO('a'), /search/i)
  })

  test('throws for empty string', ({ assert }) => {
    assert.throws(() => new SearchDTO(''), /search/i)
  })
})

// ============================================================================
// IdDTO
// ============================================================================
test.group('IdDTO', () => {
  test('creates with valid id', ({ assert }) => {
    const dto = new IdDTO(42)
    assert.equal(dto.id, 42)
  })

  test('allows id of 1', ({ assert }) => {
    const dto = new IdDTO(1)
    assert.equal(dto.id, 1)
  })

  test('throws for id of 0', ({ assert }) => {
    assert.throws(() => new IdDTO(0), /id/i)
  })

  test('throws for negative id', ({ assert }) => {
    assert.throws(() => new IdDTO(-5), /id/i)
  })
})
