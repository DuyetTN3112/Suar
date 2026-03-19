export interface ReviewRelatedTaskCommentMention {
  userId: string
  username: string
  mentionToken: string
}

export interface ReviewRelatedTaskComment {
  id: string
  taskId: string
  parentCommentId: string | null
  authorId: string
  authorUsername: string | null
  body: string
  commentType: string
  visibility: string
  reviewRelevance: boolean
  editedAt: string | null
  createdAt: string
  updatedAt: string
  mentions: ReviewRelatedTaskCommentMention[]
}
