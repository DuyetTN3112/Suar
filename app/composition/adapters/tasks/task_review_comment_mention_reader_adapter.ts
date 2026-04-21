import {
  type ReviewTaskCommentMention,
  ReviewTaskCommentMentionReader,
} from '#modules/reviews/actions/ports/outbound/review_task_comment_mention_reader'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'
import { LucidTaskCompletionRepository } from '#modules/tasks/infra/adapters/task-submissions/lucid_task_completion_repository'

export class TaskReviewCommentMentionReaderAdapter extends ReviewTaskCommentMentionReader {
  private readonly comments = new LucidTaskCompletionRepository()

  override async loadByCommentIds(
    commentIds: string[],
    trx?: ReviewTransaction
  ): Promise<Map<string, ReviewTaskCommentMention[]>> {
    return (await this.comments.loadCommentMentions(
      commentIds,
      toLucidReviewTransaction(trx)
    )) as Map<string, ReviewTaskCommentMention[]>
  }
}
