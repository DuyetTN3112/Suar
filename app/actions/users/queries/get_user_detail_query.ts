import { BaseQuery } from '../../shared/base_query.js'
import { GetUserDetailDTO } from '../dtos/get_user_detail_dto.js'
import User from '#models/user'

/**
 * GetUserDetailQuery
 *
 * Retrieves detailed information about a specific user by ID.
 * Includes all relations: role, status, detail, profile, settings.
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
export default class GetUserDetailQuery extends BaseQuery<GetUserDetailDTO, User> {
  /**
   * Main handler - executes the query with caching
   */
  async handle(dto: GetUserDetailDTO): Promise<User> {
    const cacheKey = `users:detail:${dto.id}`

    return await this.executeWithCache(cacheKey, 300, async () => {
      const user = await User.query()
        .where('id', dto.id)
        .whereNull('deleted_at')
        .preload('role')
        .preload('status')
        .preload('user_detail')
        .preload('user_profile')
        .preload('user_setting')
        .firstOrFail()

      return user
    })
  }
}
