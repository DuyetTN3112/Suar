import ValidationException from '#modules/http/exceptions/validation_exception'
import { USER_PAGINATION } from '#modules/users/application/dtos/common/user_pagination'

export class UserPaginationDTO {
  constructor(
    public readonly page = 1,
    public readonly limit = 10
  ) {
    if (page < 1) throw ValidationException.field('page', 'Page must be greater than 0')
    if (limit < 1 || limit > USER_PAGINATION.MAX_PER_PAGE) {
      throw ValidationException.field('limit', 'Limit must be between 1 and 100')
    }
  }

  get offset(): number {
    return (this.page - 1) * this.limit
  }
}

export interface UserPaginationMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
}

export class UserPaginatedResult<T> {
  constructor(
    public readonly data: T[],
    public readonly meta: UserPaginationMeta
  ) {}

  static create<T>(
    data: T[],
    total: number,
    pagination: UserPaginationDTO
  ): UserPaginatedResult<T> {
    return new UserPaginatedResult(data, {
      total,
      perPage: pagination.limit,
      currentPage: pagination.page,
      lastPage: Math.ceil(total / pagination.limit),
      firstPage: 1,
    })
  }
}

const USER_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUserId(id: string): boolean {
  return USER_UUID_PATTERN.test(id)
}

export class UserIdDTO {
  constructor(public readonly id: string) {
    if (!isValidUserId(id)) {
      throw ValidationException.field('id', 'ID must be a valid UUID')
    }
  }
}
