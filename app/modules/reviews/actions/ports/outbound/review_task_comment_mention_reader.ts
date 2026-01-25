import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'

export interface ReviewTaskCommentMention {
  userId: string
  username: string
  mentionToken: string
}

export abstract class ReviewTaskCommentMentionReader {
  abstract loadByCommentIds(
    commentIds: string[],
    trx?: ReviewTransaction
  ): Promise<Map<string, ReviewTaskCommentMention[]>>
}
