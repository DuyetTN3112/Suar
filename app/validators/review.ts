import vine from '@vinejs/vine'

import { ReverseReviewTargetType } from '#constants/review_constants'

/**
 * Validator cho gửi đánh giá kỹ năng (skill review)
 */
export const submitReviewValidator = vine.create(
  vine.object({
    reviewer_type: vine.enum(['manager', 'peer'] as const),
    skill_ratings: vine.array(
      vine.object({
        skill_id: vine.string(),
        rating: vine.number(),
        comment: vine.string().optional(),
      })
    ),
  })
)

/**
 * Validator cho gửi đánh giá ngược (reverse review / 360° feedback)
 */
export const submitReverseReviewValidator = vine.create(
  vine.object({
    target_type: vine.enum(Object.values(ReverseReviewTargetType)),
    target_id: vine.string(),
    rating: vine.number(),
    comment: vine.string().optional(),
    is_anonymous: vine.boolean().optional(),
  })
)

/**
 * Validator cho xử lý đánh giá bị gắn cờ bất thường
 */
export const resolveFlaggedReviewValidator = vine.create(
  vine.object({
    action: vine.enum(['dismissed', 'confirmed'] as const),
    notes: vine.string().optional(),
  })
)

/**
 * Validator cho xác nhận kết quả đánh giá
 */
export const confirmReviewValidator = vine.create(
  vine.object({
    action: vine.enum(['confirmed', 'disputed'] as const),
    dispute_reason: vine.string().optional(),
  })
)
