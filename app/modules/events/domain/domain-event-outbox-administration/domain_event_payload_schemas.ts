import { z } from 'zod'

import {
  authSessionObservedOutboxPayloadSchema,
  boundedIdentifier,
  disputeResolvedOutboxPayloadSchema,
  projectContextChangedOutboxPayloadSchema,
  projectLifecycleChangedOutboxPayloadSchema,
  reviewConfirmedOutboxPayloadSchema,
  talentExplainabilityProjectionChangedOutboxPayloadSchema,
  talentReindexRequestedOutboxPayloadSchema,
  taskAssignmentCompletedOutboxPayloadSchema,
  taskReviewFinalizedOutboxPayloadSchema,
  userAccountLifecycleChangedOutboxPayloadSchema,
  userProfileChangedOutboxPayloadSchema,
  workPackageChangedOutboxPayloadSchema,
} from './domain_event_payload_definitions.js'

import type {
  AuthSessionObservedOutboxPayload,
  DisputeResolvedOutboxPayload,
  ProjectContextChangedOutboxPayload,
  ProjectLifecycleChangedOutboxPayload,
  ReviewConfirmedOutboxPayload,
  ReviewSubmittedOutboxPayload,
  TalentExplainabilityProjectionChangedOutboxPayload,
  TalentReindexRequestedOutboxPayload,
  TaskAssignmentCompletedOutboxPayload,
  TaskReviewFinalizedOutboxPayload,
  UserAccountLifecycleChangedOutboxPayload,
  UserProfileChangedOutboxPayload,
  WorkPackageChangedOutboxPayload,
} from '#modules/events/public_contracts/domain_event_outbox'
import { reviewSubmittedOutboxPayloadSchema } from '#modules/events/public_contracts/review_submitted_outbox_protocol'

export * from './domain_event_payload_definitions.js'

export const durableDomainEventInputSchema = z
  .discriminatedUnion('eventName', [
    z
      .object({
        eventName: z.literal('auth:session:observed:v1'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('auth_session'),
        aggregateId: boundedIdentifier,
        payload: authSessionObservedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('task:assignment:completed'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('task_assignment'),
        aggregateId: boundedIdentifier,
        payload: taskAssignmentCompletedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('project:lifecycle:changed:v1'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('project'),
        aggregateId: boundedIdentifier,
        payload: projectLifecycleChangedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('project:context:changed:v1'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('project'),
        aggregateId: boundedIdentifier,
        payload: projectContextChangedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('project:work-package:changed:v1'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('project'),
        aggregateId: boundedIdentifier,
        payload: workPackageChangedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('user:account:lifecycle:changed:v1'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('user'),
        aggregateId: boundedIdentifier,
        payload: userAccountLifecycleChangedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('user:profile:changed:v1'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('user'),
        aggregateId: boundedIdentifier,
        payload: userProfileChangedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('review:submitted'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('review_session'),
        aggregateId: boundedIdentifier,
        payload: reviewSubmittedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('review:confirmed'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('review_session'),
        aggregateId: boundedIdentifier,
        payload: reviewConfirmedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('task-review:finalized'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('task_review_workflow'),
        aggregateId: boundedIdentifier,
        payload: taskReviewFinalizedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('dispute:resolved'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('review_dispute'),
        aggregateId: boundedIdentifier,
        payload: disputeResolvedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal(
          'reviews:talent-explainability-projection:changed:v1'
        ),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('user_talent'),
        aggregateId: boundedIdentifier,
        payload: talentExplainabilityProjectionChangedOutboxPayloadSchema,
      })
      .strict(),
    z
      .object({
        eventName: z.literal('search:talent-reindex-requested'),
        dedupeKey: boundedIdentifier,
        aggregateType: z.literal('user_talent'),
        aggregateId: boundedIdentifier,
        payload: talentReindexRequestedOutboxPayloadSchema,
      })
      .strict(),
  ])
  .superRefine((input, context) => {
    const payloadAggregateId = (() => {
      switch (input.eventName) {
        case 'auth:session:observed:v1':
          return input.payload.userId
        case 'task:assignment:completed':
          return input.payload.assignmentId
        case 'project:lifecycle:changed:v1':
        case 'project:context:changed:v1':
        case 'project:work-package:changed:v1':
          return input.payload.projectId
        case 'user:account:lifecycle:changed:v1':
        case 'user:profile:changed:v1':
          return input.payload.userId
        case 'review:submitted':
          return input.payload.reviewSessionId
        case 'review:confirmed':
          return input.payload.reviewSessionId
        case 'task-review:finalized':
          return input.payload.workflowId
        case 'dispute:resolved':
          return input.payload.disputeId
        case 'reviews:talent-explainability-projection:changed:v1':
          return input.payload.revieweeUserId
        case 'search:talent-reindex-requested':
          return input.payload.userId
      }
    })()
    if (input.aggregateId !== payloadAggregateId) {
      context.addIssue({
        code: 'custom',
        path: ['aggregateId'],
        message: 'aggregateId must match the aggregate identity in the event payload',
      })
    }
    if (
      (input.eventName === 'auth:session:observed:v1' ||
        input.eventName === 'project:lifecycle:changed:v1' ||
        input.eventName === 'user:account:lifecycle:changed:v1' ||
        input.eventName === 'user:profile:changed:v1') &&
      input.dedupeKey !== input.payload.eventId
    ) {
      context.addIssue({
        code: 'custom',
        path: ['dedupeKey'],
        message: 'dedupeKey must match the payload eventId',
      })
    }
  })

export interface DurableDomainEventPayloadByName {
  'auth:session:observed:v1': AuthSessionObservedOutboxPayload
  'task:assignment:completed': TaskAssignmentCompletedOutboxPayload
  'project:lifecycle:changed:v1': ProjectLifecycleChangedOutboxPayload
  'project:context:changed:v1': ProjectContextChangedOutboxPayload
  'project:work-package:changed:v1': WorkPackageChangedOutboxPayload
  'user:account:lifecycle:changed:v1': UserAccountLifecycleChangedOutboxPayload
  'user:profile:changed:v1': UserProfileChangedOutboxPayload
  'review:submitted': ReviewSubmittedOutboxPayload
  'review:confirmed': ReviewConfirmedOutboxPayload
  'task-review:finalized': TaskReviewFinalizedOutboxPayload
  'dispute:resolved': DisputeResolvedOutboxPayload
  'reviews:talent-explainability-projection:changed:v1': TalentExplainabilityProjectionChangedOutboxPayload
  'search:talent-reindex-requested': TalentReindexRequestedOutboxPayload
}

export type DurableDomainEventName = keyof DurableDomainEventPayloadByName
export type DurableDomainEventStatus = 'pending' | 'leased' | 'processed' | 'dead_letter'
export type ValidatedStageDomainEventInput = z.output<typeof durableDomainEventInputSchema>
