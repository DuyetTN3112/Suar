import { PAGINATION } from '#constants/common_constants'
import ValidationException from '#exceptions/validation_exception'
import type { DatabaseId } from '#types/database'

export class PaginationDTO {
  constructor(
    public readonly page = 1,
    public readonly limit = 10
  ) {
    if (page < 1) throw ValidationException.field('page', 'Page must be greater than 0')
    if (limit < 1 || limit > PAGINATION.MAX_PER_PAGE) {
      throw ValidationException.field('limit', 'Limit must be between 1 and 100')
    }
  }

  get offset(): number {
    return (this.page - 1) * this.limit
  }
}

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

export class SortDTO {
  constructor(
    public readonly field: string,
    public readonly direction: 'asc' | 'desc' = 'asc'
  ) {}
}

export class DateRangeDTO {
  constructor(
    public readonly from: Date,
    public readonly to: Date
  ) {
    if (from > to) {
      throw ValidationException.field('from', 'From date must be before To date')
    }
  }
}

export class SearchDTO {
  constructor(public readonly searchTerm: string) {
    if (searchTerm.length < 2) {
      throw ValidationException.field('searchTerm', 'Search term must be at least 2 characters')
    }
  }
}

export class IdDTO {
  constructor(public readonly id: DatabaseId) {
    if (Number(id) < 1) throw ValidationException.field('id', 'ID must be greater than 0')
  }
}
