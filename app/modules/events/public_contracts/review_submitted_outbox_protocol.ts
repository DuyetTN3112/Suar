import { z } from 'zod'

import type { ReviewSubmittedOutboxPayload } from '#modules/events/public_contracts/domain_event_outbox'

const boundedIdentifier = z.string().trim().min(1).max(255)

export const reviewSubmittedOutboxPayloadSchema: z.ZodType<ReviewSubmittedOutboxPayload> = z
  .object({
    submissionId: boundedIdentifier,
    reviewSessionId: boundedIdentifier,
    reviewerAssignmentId: boundedIdentifier,
    reviewerId: boundedIdentifier,
    reviewerType: z.enum(['manager', 'peer']),
    revieweeId: boundedIdentifier,
    taskId: boundedIdentifier,
    skillReviewIds: z
      .array(boundedIdentifier)
      .min(1)
      .max(500)
      .refine((values) => new Set(values).size === values.length, {
        message: 'skillReviewIds must not contain duplicates',
      })
      .refine(
        (values) =>
          values.every(
            (value, index) => index === 0 || (values[index - 1] ?? '').localeCompare(value) < 0
          ),
        { message: 'skillReviewIds must be in canonical ascending order' }
      ),
    submittedAt: z.iso.datetime({ offset: true }),
  })
  .strict()
