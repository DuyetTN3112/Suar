import type { HttpContext } from '@adonisjs/core/http'

import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'

/**
 * GET /api/redis/keys → List all Redis keys
 */
export default class RedisListKeysController {
  async handle({ request }: HttpContext) {
    const pattern = request.input('pattern', '*') as string
    const cursor = request.input('cursor', '0') as string
    const count = Number(request.input('count', 100))
    if (!Number.isSafeInteger(count) || count < 1 || count > 500) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }
    const page = await cacheStore.scanKeys(pattern, cursor, count)

    return {
      data: page.keys,
      meta: {
        cursor,
        nextCursor: page.nextCursor,
        hasMore: page.nextCursor !== '0',
        count,
      },
    }
  }
}
