import { BaseQuery } from '#actions/reviews/base_query'
import type { GetUserReviewsDTO } from '#actions/reviews/dtos/request/review_dtos'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import type { ReviewSessionRecord } from '#types/review_records'

interface UserReviewsResult {
  data: ReviewSessionRecord[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

/**
 * GetUserReviewsQuery
 *
 * Fetches all review sessions for a user (as reviewee).
 */
export default class GetUserReviewsQuery extends BaseQuery<GetUserReviewsDTO, UserReviewsResult> {
  async handle(dto: GetUserReviewsDTO): Promise<UserReviewsResult> {
    const result = await ReviewSessionRepository.paginateByReviewee(
      dto.user_id,
      dto.page,
      dto.per_page
    )

    return {
      data: result.all(),
      meta: {
        total: result.total,
        per_page: result.perPage,
        current_page: result.currentPage,
        last_page: result.lastPage,
      },
    }
  }
}
