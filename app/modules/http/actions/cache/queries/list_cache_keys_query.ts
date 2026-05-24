import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import AppException from '#modules/errors/public_contracts/application_exception'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { Result } from '#modules/errors/public_contracts/result'
import { BaseQuery } from '#modules/http/actions/base_query'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'

export interface ListCacheKeysInput {
  pattern: unknown
  cursor: unknown
  count: unknown
}

export interface ListCacheKeysResult {
  keys: string[]
  cursor: string
  nextCursor: string
  count: number
}

export default class ListCacheKeysQuery extends BaseQuery<[ListCacheKeysInput], ListCacheKeysResult> {
  constructor(protected readonly execCtx: HttpActionContext) {
    super()
  }

  async executeAndWrap(input: ListCacheKeysInput) {
    try {
      return Result.ok(await this.execute(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  async execute(input: ListCacheKeysInput): Promise<ListCacheKeysResult> {
    void this.execCtx

    const count = Number(input.count)
    if (
      typeof input.pattern !== 'string' ||
      typeof input.cursor !== 'string' ||
      !/^\d+$/u.test(input.cursor) ||
      !Number.isSafeInteger(count) ||
      count < 1 ||
      count > 500
    ) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    const page = await cacheStore.scanKeys(input.pattern, input.cursor, count)
    return {
      keys: page.keys,
      cursor: input.cursor,
      nextCursor: page.nextCursor,
      count,
    }
  }
}
