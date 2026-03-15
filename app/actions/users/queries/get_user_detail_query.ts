import { inject } from '@adonisjs/core'
import { BaseQuery } from '../../shared/base_query.js'
import type { GetUserDetailDTO } from '../dtos/request/get_user_detail_dto.js'
import User from '#models/user'
import UserRepository from '#infra/users/repositories/user_repository'

/**
 * GetUserDetailQuery
 *
 * Retrieves detailed information about a specific user by ID.
 * Includes relations: role, status.
 *
 * This is a Query (Read operation) that does NOT change system state.
 * Results can be cached for performance.
 *
 * @example
 * ```typescript
 * const dto = new GetUserDetailDTO(userId)
 * const user = await getUserDetailQuery.handle(dto)
 * ```
 */
@inject()
export default class GetUserDetailQuery extends BaseQuery<GetUserDetailDTO, User> {
  /**
   * Main handler - executes the query with caching
   */
  async handle(dto: GetUserDetailDTO): Promise<User> {
    const cacheKey = `users:detail:${String(dto.id)}`

    return await this.executeWithCache(cacheKey, 300, async () => {
      return await UserRepository.findNotDeletedOrFail(dto.id)
    })
  }
}
