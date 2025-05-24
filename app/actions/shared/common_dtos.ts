/**
 * Common Data Transfer Objects (DTOs)
 * These are reusable DTOs used across multiple Commands/Queries
 */

import type { Query } from './interfaces.js'

/**
 * Pagination DTO
 * Used for paginated queries
 */
export class PaginationDTO implements Query {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10
  ) {
    if (page < 1) throw new Error('Page must be greater than 0')
    if (limit < 1 || limit > 100) throw new Error('Limit must be between 1 and 100')
  }

  get offset(): number {
    return (this.page - 1) * this.limit
  }
}

/**
 * Paginated Result
 * Standard structure for paginated query results
 */
export class PaginatedResult<T> {
  constructor(
    public readonly data: T[],
    public readonly meta: PaginationMeta
  ) {}

  static create<T>(data: T[], total: number, pagination: PaginationDTO): PaginatedResult<T> {
    return new PaginatedResult(data, {
      total,
      perPage: pagination.limit,
      currentPage: pagination.page,
      lastPage: Math.ceil(total / pagination.limit),
      firstPage: 1,
    })
  }
}

export interface PaginationMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
}

/**
 * Organization Context DTO
 * Contains information about the current organization context
 */
export class OrganizationContextDTO implements Query {
  constructor(
    public readonly organizationId: number,
    public readonly userId: number
  ) {}
}

/**
 * Sort DTO
 * Used for sorting queries
 */
export class SortDTO implements Query {
  constructor(
    public readonly field: string,
    public readonly direction: 'asc' | 'desc' = 'asc'
  ) {}
}

/**
 * Date Range DTO
 * Used for filtering by date range
 */
export class DateRangeDTO implements Query {
  constructor(
    public readonly from: Date,
    public readonly to: Date
  ) {
    if (from > to) {
      throw new Error('From date must be before To date')
    }
  }
}

/**
 * Search DTO
 * Used for search queries
 */
export class SearchDTO implements Query {
  constructor(public readonly searchTerm: string) {
    if (searchTerm.length < 2) {
      throw new Error('Search term must be at least 2 characters')
    }
  }
}

/**
 * ID DTO
 * Simple DTO for operations that only need an ID
 */
export class IdDTO implements Query {
  constructor(public readonly id: number) {
    if (id < 1) throw new Error('ID must be greater than 0')
  }
}
