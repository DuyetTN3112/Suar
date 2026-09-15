import { z } from 'zod'

export const boundedIdentifier = z.string().trim().min(1).max(255)

export const authSessionObservedOutboxPayloadSchema = z
  .object({
    eventId: z.uuid(),
    userId: boundedIdentifier,
    action: z.enum(['login', 'logout']),
    occurredAt: z.iso.datetime({ offset: true }),
    ipAddress: z.string().max(64),
    userAgent: z.string().max(1024),
    method: z.string().trim().min(1).max(64).nullable(),
    requestId: z.string().trim().min(1).max(255).nullable(),
    traceId: z.string().trim().min(1).max(255).nullable(),
  })
  .strict()
  .superRefine((payload, context) => {
    if (
      (payload.action === 'login' && payload.method === null) ||
      (payload.action === 'logout' && payload.method !== null)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['method'],
        message: 'method is required for login and must be null for logout',
      })
    }
  })

export const taskAssignmentCompletedOutboxPayloadSchema = z
  .object({
    taskId: boundedIdentifier,
    assignmentId: boundedIdentifier,
    assigneeId: boundedIdentifier,
  })
  .strict()

export const projectLifecycleChangedOutboxPayloadSchema = z
  .object({
    eventId: z.uuid(),
    action: z.enum(['created', 'updated', 'deleted']),
    projectId: boundedIdentifier,
    organizationId: boundedIdentifier,
    actorId: boundedIdentifier,
    projectName: z.string().trim().min(1).max(255).nullable(),
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((payload, context) => {
    if (
      (payload.action === 'created' && payload.projectName === null) ||
      (payload.action !== 'created' && payload.projectName !== null)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['projectName'],
        message: 'projectName is required only for created lifecycle events',
      })
    }
  })

export const projectContextChangedOutboxPayloadSchema = z
  .object({
    schemaVersion: z.literal('suar.project_context_changed.v1'),
    projectId: boundedIdentifier,
    organizationId: boundedIdentifier,
    previousVersionId: boundedIdentifier.nullable(),
    activeVersionId: boundedIdentifier,
    activeVersionNumber: z.number().int().positive(),
    versionToken: boundedIdentifier,
    actorId: boundedIdentifier,
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export const workPackageChangedOutboxPayloadSchema = z
  .object({
    schemaVersion: z.literal('suar.work_package_changed.v1'),
    projectId: boundedIdentifier,
    organizationId: boundedIdentifier,
    workPackageId: boundedIdentifier,
    activeVersionId: boundedIdentifier,
    activeVersionNumber: z.number().int().positive(),
    versionToken: boundedIdentifier,
    actorId: boundedIdentifier,
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export const userAccountLifecycleChangedOutboxPayloadSchema = z
  .object({
    eventId: z.uuid(),
    action: z.enum([
      'registered',
      'deactivated',
      'deleted',
      'suspended',
      'activated',
    ]),
    userId: boundedIdentifier,
    actorId: boundedIdentifier,
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export const userProfileChangedField = z.enum([
  'username',
  'email',
  'avatar_url',
  'bio',
  'phone',
  'address',
  'timezone',
  'language',
  'is_external_contributor',
])

export const userProfileChangedOutboxPayloadSchema = z
  .object({
    eventId: z.uuid(),
    userId: boundedIdentifier,
    actorId: boundedIdentifier,
    changedFields: z
      .array(userProfileChangedField)
      .min(1)
      .max(32)
      .refine((fields) => new Set(fields).size === fields.length, {
        message: 'changedFields must not contain duplicates',
      })
      .refine(
        (fields) =>
          fields.every(
            (field, index) =>
              index === 0 ||
              (fields[index - 1] ?? '').localeCompare(field) < 0
          ),
        { message: 'changedFields must be in canonical ascending order' }
      ),
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export const reviewConfirmedOutboxPayloadSchema = z
  .object({
    confirmationId: boundedIdentifier,
    reviewSessionId: boundedIdentifier,
    revieweeId: boundedIdentifier,
    reviewerIds: z
      .array(boundedIdentifier)
      .max(500)
      .refine((values) => new Set(values).size === values.length, {
        message: 'reviewerIds must not contain duplicates',
      })
      .refine(
        (values) =>
          values.every(
            (value, index) => index === 0 || (values[index - 1] ?? '').localeCompare(value) < 0
          ),
        {
          message: 'reviewerIds must be in canonical ascending order',
        }
      ),
    confirmedBy: boundedIdentifier,
    action: z.enum(['confirmed', 'disputed']),
    accomplishmentProjection: z
      .object({
        reviewWorkflowId: boundedIdentifier,
        completionClaimId: boundedIdentifier,
        reviewFinalizedFactId: boundedIdentifier,
        reviewFinalizedFactHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
        projectionPolicyVersion: boundedIdentifier,
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict()

export const taskReviewFinalizedOutboxPayloadSchema = z
  .object({
    workflowId: boundedIdentifier,
    taskAssignmentId: boundedIdentifier,
    taskId: boundedIdentifier,
    revieweeId: boundedIdentifier,
    finalizedBy: boundedIdentifier,
    finalizationSource: z.enum(['consensus', 'admin_resolution', 'organization_governance']),
    finalizedAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export const disputeResolvedOutboxPayloadSchema = z
  .object({
    disputeId: boundedIdentifier,
    reviewSessionId: boundedIdentifier,
    revieweeId: boundedIdentifier,
    reviewerIds: z
      .array(boundedIdentifier)
      .max(500)
      .refine((values) => new Set(values).size === values.length, {
        message: 'reviewerIds must not contain duplicates',
      })
      .refine(
        (values) =>
          values.every(
            (value, index) => index === 0 || (values[index - 1] ?? '').localeCompare(value) < 0
          ),
        { message: 'reviewerIds must be in canonical ascending order' }
      ),
    resolvedBy: boundedIdentifier,
    finalDecision: z.enum([
      'uphold_review',
      'adjust_score',
      'request_re_review',
      'dismiss_dispute',
      'partially_accept',
    ]),
    profileUpdateAction: z
      .enum(['recalculate_after_adjustment', 'no_action'])
      .nullable()
      .optional(),
    reviewerCredibilityAction: z.enum(['mark_disputed_review', 'no_action']).nullable().optional(),
  })
  .strict()

export const talentReindexRequestedOutboxPayloadSchema = z
  .object({
    userId: boundedIdentifier,
    sourceEventName: z.enum([
      'review:submitted',
      'review:confirmed',
      'dispute:resolved',
      'reviews:talent-explainability-projection:changed:v1',
      'accomplishment:publication:changed:v1',
    ]),
    sourceEventId: boundedIdentifier,
  })
  .strict()

export const talentExplainabilityProjectionChangedOutboxPayloadSchema = z
  .object({
    contractVersion: z.literal(1),
    eventType: z.literal('reviews.talent_explainability_projection_changed.v1'),
    revieweeUserId: boundedIdentifier,
    underDisputeSkillsCount: z.number().int().nonnegative(),
    latestConfidenceSignal: z.enum(['low', 'medium', 'high']).nullable(),
    sourceRevision: z.string().regex(/^\d+$/).max(255),
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()
