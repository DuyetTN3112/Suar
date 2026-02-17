import { test } from '@japa/runner'

import {
  handleTalentExplainabilityProjectionChanged,
  type TalentExplainabilityProjectionListenerDependencies,
} from '#modules/users/listeners/talent_explainability_projection_listener'

test.group('Talent explainability projection listener failure semantics', () => {
  test('propagates projection persistence failure with bounded telemetry', async ({
    assert,
  }) => {
    const observations: Record<string, unknown>[] = []
    const failure = new Error('projection persistence failed token=private')
    const dependencies: TalentExplainabilityProjectionListenerDependencies = {
      apply: () => Promise.reject(failure),
      stageSearchReindex: () => Promise.reject(new Error('must not be called')),
      logger: {
        error: (_message, context) => {
          if (context && typeof context === 'object' && !Array.isArray(context)) {
            observations.push({ ...context })
          }
        },
      },
    }

    await assert.rejects(
      () =>
        handleTalentExplainabilityProjectionChanged(
          {
            eventType: 'reviews.talent_explainability_projection_changed.v1',
            contractVersion: 1,
            revieweeUserId: 'user-1',
            underDisputeSkillsCount: 2,
            latestConfidenceSignal: 'high',
            sourceRevision: 'revision-1',
            occurredAt: '2026-07-26T00:00:00.000Z',
          },
          dependencies
        ),
      /projection persistence failed/
    )

    assert.deepEqual(observations, [
      {
        revieweeUserId: 'user-1',
        sourceRevision: 'revision-1',
        errorName: 'Error',
      },
    ])
    assert.notInclude(JSON.stringify(observations), 'private')
  })

  test('propagates search staging failure after projection persistence', async ({
    assert,
  }) => {
    const order: string[] = []
    const event = {
      eventType: 'reviews.talent_explainability_projection_changed.v1' as const,
      contractVersion: 1 as const,
      revieweeUserId: 'user-1',
      underDisputeSkillsCount: 0,
      latestConfidenceSignal: null,
      sourceRevision: '101',
      occurredAt: '2026-07-26T00:00:00.000Z',
    }
    await assert.rejects(
      () =>
        handleTalentExplainabilityProjectionChanged(event, {
          apply: () => {
            order.push('projection-committed')
            return Promise.resolve(true)
          },
          stageSearchReindex: () => {
            order.push('search-stage-attempted')
            return Promise.reject(new Error('search outbox unavailable'))
          },
          logger: { error: () => undefined },
        }),
      /search outbox unavailable/
    )
    assert.deepEqual(order, ['projection-committed', 'search-stage-attempted'])
  })
})
