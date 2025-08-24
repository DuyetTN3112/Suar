export interface ReviewSubmittedV1 {
  eventType: 'reviews.submitted.v1'
  reviewSessionId: string
  taskId: string
  reviewedUserId: string
  reviewerUserId: string
  submittedAt: string
}

export interface ReviewCompletedV1 {
  eventType: 'reviews.completed.v1'
  reviewSessionId: string
  taskId: string
  reviewedUserId: string
  reviewerUserId: string
  completedAt: string
}
