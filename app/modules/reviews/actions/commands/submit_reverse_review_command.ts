import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { SubmitReverseReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import type { ReverseReviewRecord } from '#modules/reviews/types/review_records'

/**
 * SubmitReverseReviewCommand
 *
 * Task-level review is deprecated.
 * Product decision 2026-07-09: management and work-environment reviews should happen at sprint close,
 * not from an individual task review session.
 */
export default class SubmitReverseReviewCommand extends BaseCommand<
  SubmitReverseReviewDTO,
  ReverseReviewRecord
> {
  handle(dto: SubmitReverseReviewDTO): Promise<ReverseReviewRecord> {
    void dto
    return Promise.reject(
      new BusinessLogicException(
        'Review theo task đã tắt. Hãy dùng review người giao việc hoặc review môi trường làm việc sau khi kết thúc sprint.'
      )
    )
  }
}
