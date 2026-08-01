import { test } from '@japa/runner'

import {
  parseDurableDomainEventPayload,
  parseStageDomainEventInput,
} from '#modules/events/domain/domain_event_outbox'
import type { StageDomainEventInput } from '#modules/events/public_contracts/domain_event_outbox'

test.group('Unit | Domain event outbox contract', () => {
  test('validates durable auth session identity and action semantics', ({ assert }) => {
    const input = parseStageDomainEventInput({
      eventName: 'auth:session:observed:v1',
      dedupeKey: '9b8c272e-384b-4f8b-bbce-2f55bb432079',
      aggregateType: 'auth_session',
      aggregateId: 'user-1',
      payload: {
        eventId: '9b8c272e-384b-4f8b-bbce-2f55bb432079',
        userId: 'user-1',
        action: 'login',
        occurredAt: '2026-07-26T10:00:00.000Z',
        ipAddress: '203.0.113.7',
        userAgent: 'contract-test',
        method: 'oauth',
        requestId: 'request-1',
        traceId: 'trace-1',
      },
    })

    assert.deepEqual(
      parseDurableDomainEventPayload(input.eventName, input.payload),
      input.payload
    )
    assert.throws(() =>
      parseStageDomainEventInput({
        ...input,
        aggregateId: 'different-user',
      })
    )
    assert.throws(() =>
      parseDurableDomainEventPayload('auth:session:observed:v1', {
        ...input.payload,
        action: 'logout',
        method: 'oauth',
      })
    )
  })

  test('validates bounded, aggregate-correlated project lifecycle events', ({
    assert,
  }) => {
    const input = parseStageDomainEventInput({
      eventName: 'project:lifecycle:changed:v1',
      dedupeKey: '4bb40a33-f683-5c80-a178-c46af83f17ab',
      aggregateType: 'project',
      aggregateId: 'project-1',
      payload: {
        eventId: '4bb40a33-f683-5c80-a178-c46af83f17ab',
        action: 'created',
        projectId: 'project-1',
        organizationId: 'org-1',
        actorId: 'user-1',
        projectName: 'Enterprise Platform',
        occurredAt: '2026-07-26T10:00:00.000Z',
      },
    })

    assert.deepEqual(
      parseDurableDomainEventPayload(input.eventName, input.payload),
      input.payload
    )
    assert.throws(() =>
      parseStageDomainEventInput({ ...input, aggregateId: 'different-project' })
    )
    assert.throws(() =>
      parseStageDomainEventInput({ ...input, dedupeKey: 'different-event-id' })
    )
    assert.throws(() =>
      parseDurableDomainEventPayload('project:lifecycle:changed:v1', {
        ...input.payload,
        action: 'updated',
      })
    )
  })

  test('validates user account and PII-free profile lifecycle contracts', ({
    assert,
  }) => {
    const account = parseStageDomainEventInput({
      eventName: 'user:account:lifecycle:changed:v1',
      dedupeKey: 'ed546f74-67a4-54db-9469-1b27d5d6f607',
      aggregateType: 'user',
      aggregateId: 'user-1',
      payload: {
        eventId: 'ed546f74-67a4-54db-9469-1b27d5d6f607',
        action: 'deactivated',
        userId: 'user-1',
        actorId: 'admin-1',
        occurredAt: '2026-07-26T10:00:00.000Z',
      },
    })
    const profile = parseStageDomainEventInput({
      eventName: 'user:profile:changed:v1',
      dedupeKey: '224bf40f-56dd-5f8d-ac6d-7cab66fbca77',
      aggregateType: 'user',
      aggregateId: 'user-1',
      payload: {
        eventId: '224bf40f-56dd-5f8d-ac6d-7cab66fbca77',
        userId: 'user-1',
        actorId: 'user-1',
        changedFields: ['bio', 'email'],
        occurredAt: '2026-07-26T10:01:00.000Z',
      },
    })

    assert.equal(account.aggregateType, 'user')
    assert.equal(profile.aggregateId, 'user-1')
    if (profile.eventName !== 'user:profile:changed:v1') {
      assert.fail('Expected user profile event')
      return
    }
    assert.throws(() =>
      parseStageDomainEventInput({
        ...profile,
        payload: {
          ...profile.payload,
          changedFields: ['email', 'bio'],
        },
      })
    )
    assert.throws(() =>
      parseDurableDomainEventPayload('user:profile:changed:v1', {
        ...profile.payload,
        email: 'private@example.com',
      })
    )
  })

  test('validates review submission identities and canonical skill reviews', ({
    assert,
  }) => {
    const input = parseStageDomainEventInput({
      eventName: 'review:submitted',
      dedupeKey: 'review-submitted:v1:assignment-1',
      aggregateType: 'review_session',
      aggregateId: 'session-1',
      payload: {
        submissionId: 'assignment-1',
        reviewSessionId: 'session-1',
        reviewerAssignmentId: 'assignment-1',
        reviewerId: 'reviewer-1',
        reviewerType: 'peer',
        revieweeId: 'reviewee-1',
        taskId: 'task-1',
        skillReviewIds: ['review-1', 'review-2'],
        submittedAt: '2026-07-26T10:00:00.000Z',
      },
    })

    assert.equal(input.eventName, 'review:submitted')
    assert.deepEqual(
      parseDurableDomainEventPayload(input.eventName, input.payload),
      input.payload
    )
    assert.throws(() =>
      parseStageDomainEventInput({
        ...input,
        aggregateId: 'different-session',
      })
    )
    assert.throws(() =>
      parseDurableDomainEventPayload('review:submitted', {
        ...input.payload,
        skillReviewIds: ['review-2', 'review-1'],
      })
    )
  })

  test('validates the review confirmation event as a correlated durable contract', ({
    assert,
  }) => {
    const input = parseStageDomainEventInput({
      eventName: 'review:confirmed',
      dedupeKey: 'review-confirmed:session-1:user-1',
      aggregateType: 'review_session',
      aggregateId: 'session-1',
      payload: {
        confirmationId: 'confirmation-1',
        reviewSessionId: 'session-1',
        revieweeId: 'reviewee-1',
        reviewerIds: ['reviewer-1', 'reviewer-2'],
        confirmedBy: 'user-1',
        action: 'confirmed',
      },
    })

    assert.equal(input.eventName, 'review:confirmed')
    assert.equal(input.aggregateType, 'review_session')
    assert.deepEqual(
      parseDurableDomainEventPayload(input.eventName, input.payload),
      input.payload
    )
  })

  test('rejects mismatched aggregates, identities, and non-canonical reviewers', ({
    assert,
  }) => {
    assert.throws(() =>
      parseStageDomainEventInput(
        {
          eventName: 'review:confirmed',
          dedupeKey: 'review-confirmed:session-1:user-1',
          aggregateType: 'task_assignment',
          aggregateId: 'session-1',
          payload: {
            confirmationId: 'confirmation-1',
            reviewSessionId: 'session-1',
            revieweeId: 'reviewee-1',
            reviewerIds: ['reviewer-1'],
            confirmedBy: 'user-1',
            action: 'confirmed',
          },
        } as unknown as StageDomainEventInput
      )
    )

    assert.throws(() =>
      parseDurableDomainEventPayload('review:confirmed', {
        confirmationId: 'confirmation-1',
        reviewSessionId: 'session-1',
        revieweeId: 'reviewee-1',
        reviewerIds: ['reviewer-1', 'reviewer-1'],
        confirmedBy: 'user-1',
        action: 'confirmed',
      })
    )

    assert.throws(() =>
      parseStageDomainEventInput({
        eventName: 'review:confirmed',
        dedupeKey: 'review-confirmed:session-1:user-1',
        aggregateType: 'review_session',
        aggregateId: 'different-session',
        payload: {
          confirmationId: 'confirmation-1',
          reviewSessionId: 'session-1',
          revieweeId: 'reviewee-1',
          reviewerIds: ['reviewer-1'],
          confirmedBy: 'user-1',
          action: 'confirmed',
        },
      })
    )

    assert.throws(() =>
      parseDurableDomainEventPayload('review:confirmed', {
        confirmationId: 'confirmation-1',
        reviewSessionId: 'session-1',
        revieweeId: 'reviewee-1',
        reviewerIds: ['reviewer-2', 'reviewer-1'],
        confirmedBy: 'user-1',
        action: 'confirmed',
      })
    )
  })

  test('validates dispute resolution as a correlated durable contract', ({ assert }) => {
    const input = parseStageDomainEventInput({
      eventName: 'dispute:resolved',
      dedupeKey: 'dispute-resolved:dispute-1',
      aggregateType: 'review_dispute',
      aggregateId: 'dispute-1',
      payload: {
        disputeId: 'dispute-1',
        reviewSessionId: 'session-1',
        revieweeId: 'reviewee-1',
        reviewerIds: ['reviewer-1', 'reviewer-2'],
        resolvedBy: 'admin-1',
        finalDecision: 'adjust_score',
        profileUpdateAction: 'recalculate_after_adjustment',
        reviewerCredibilityAction: 'mark_disputed_review',
      },
    })

    assert.equal(input.eventName, 'dispute:resolved')
    assert.equal(input.aggregateType, 'review_dispute')
    assert.deepEqual(
      parseDurableDomainEventPayload(input.eventName, input.payload),
      input.payload
    )
  })

  test('rejects malformed or non-canonical dispute resolution payloads', ({ assert }) => {
    assert.throws(() =>
      parseStageDomainEventInput({
        eventName: 'dispute:resolved',
        dedupeKey: 'dispute-resolved:dispute-1',
        aggregateType: 'review_dispute',
        aggregateId: 'different-dispute',
        payload: {
          disputeId: 'dispute-1',
          reviewSessionId: 'session-1',
          revieweeId: 'reviewee-1',
          reviewerIds: ['reviewer-2', 'reviewer-1'],
          resolvedBy: 'admin-1',
          finalDecision: 'adjust_score',
        },
      })
    )
  })

  test('validates a correlated durable talent reindex request', ({ assert }) => {
    const input = parseStageDomainEventInput({
      eventName: 'search:talent-reindex-requested',
      dedupeKey: 'talent-reindex-request-1',
      aggregateType: 'user_talent',
      aggregateId: 'user-1',
      payload: {
        userId: 'user-1',
        sourceEventName: 'review:confirmed',
        sourceEventId: 'confirmation-1',
      },
    })
    assert.equal(input.eventName, 'search:talent-reindex-requested')
    assert.deepEqual(
      parseDurableDomainEventPayload(input.eventName, input.payload),
      input.payload
    )
    assert.throws(() =>
      parseStageDomainEventInput({
        ...input,
        aggregateId: 'different-user',
      })
    )
  })

  test('validates a correlated durable talent explainability projection', ({
    assert,
  }) => {
    const input = parseStageDomainEventInput({
      eventName: 'reviews:talent-explainability-projection:changed:v1',
      dedupeKey: 'talent-projection-1',
      aggregateType: 'user_talent',
      aggregateId: 'user-1',
      payload: {
        contractVersion: 1,
        eventType: 'reviews.talent_explainability_projection_changed.v1',
        revieweeUserId: 'user-1',
        underDisputeSkillsCount: 2,
        latestConfidenceSignal: 'high',
        sourceRevision: '101',
        occurredAt: '2026-07-26T10:00:00.000Z',
      },
    })
    assert.deepEqual(
      parseDurableDomainEventPayload(input.eventName, input.payload),
      input.payload
    )
    assert.throws(() =>
      parseStageDomainEventInput({
        ...input,
        aggregateId: 'different-user',
      })
    )
  })
})
