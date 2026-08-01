import { BaseQuery } from '../base_query.js'
import type { GetUserDetailDTO } from '../dtos/request/get_user_detail_dto.js'

import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserReviewReader } from '#modules/users/actions/ports/outbound/user_review_reader'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import type { UserRecord } from '#modules/users/types/user_records'

/**
 * GetUserDetailQuery
 *
 * Retrieves detailed information about a specific user by ID.
 * Includes relations: role, status.
 *
 * This is a Query (Read operation) that does NOT change system state.
 * Raw user records are intentionally not cached. They contain PII and mutable
 * authorization context that must remain authoritative in PostgreSQL.
 *
 * @example
 * ```typescript
 * const dto = new GetUserDetailDTO(userId)
 * const user = await getUserDetailQuery.handle(dto)
 * ```
 */
export default class GetUserDetailQuery extends BaseQuery<GetUserDetailDTO, UserRecord> {
  constructor(
    execCtx: UserActionContext,
    private readonly reviews: UserReviewReader,
    private readonly users: UserAccountRepository
  ) {
    super(execCtx)
  }

  /**
   * Main handler - executes an authoritative database read
   */
  async handle(dto: GetUserDetailDTO): Promise<UserRecord> {
    const [user, reverseReviewSummary] = await Promise.all([
      this.users.findNotDeletedOrFail(dto.id),
      this.reviews.loadReverseSummary(dto.id),
    ])

    return {
      ...user,
      reverse_review_summary: reverseReviewSummary,
    }
  }
}
