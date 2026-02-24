import { z } from 'zod'

export const reviewSubmittedV1Schema = z.object({
  eventType: z.literal('reviews.submitted.v1'),
  reviewSessionId: z.string(),
  taskId: z.string(),
  reviewedUserId: z.string(),
  reviewerUserId: z.string(),
  submittedAt: z.string(),
})

export const reviewCompletedV1Schema = z.object({
  eventType: z.literal('reviews.completed.v1'),
  reviewSessionId: z.string(),
  taskId: z.string(),
  reviewedUserId: z.string(),
  reviewerUserId: z.string(),
  completedAt: z.string(),
})
