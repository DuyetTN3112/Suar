import { test } from '@japa/runner'

import {
  classifyLegacyAccomplishmentSource,
  planLegacyAccomplishmentBackfill,
  RunLegacyAccomplishmentBackfillCommand,
  type LegacyAccomplishmentBackfillCheckpoint,
  type LegacyAccomplishmentBackfillCheckpointStore,
  type LegacyAccomplishmentBackfillReader,
  type LegacyAccomplishmentBackfillWriter,
  type LegacyAccomplishmentSource,
} from '#modules/accomplishments/actions/commands/legacy-backfill/run_legacy_accomplishment_backfill_command'

const source = (overrides: Partial<LegacyAccomplishmentSource> = {}): LegacyAccomplishmentSource => ({
  sourceId: 'history-1',
  userId: 'user-1',
  taskAssignmentId: 'assignment-1',
  taskId: 'task-1',
  hasImmutableAssignmentSnapshot: true,
  hasCompletionReport: true,
  hasGovernedReviewConfirmation: true,
  hasVerifiedClaim: true,
  hasSufficientEvidence: true,
  userConfirmedRetrospective: false,
  sourceCorrupt: false,
  ...overrides,
})

test.group('Unit | legacy accomplishment backfill', () => {
  test('classifies complete immutable sources as native candidates', ({ assert }) => {
    assert.equal(classifyLegacyAccomplishmentSource(source()), 'native_immutable_candidate')
  })

  test('never treats a task-only row as a verified candidate', ({ assert }) => {
    assert.equal(
      classifyLegacyAccomplishmentSource(
        source({
          hasImmutableAssignmentSnapshot: false,
          hasCompletionReport: false,
          hasGovernedReviewConfirmation: false,
          hasVerifiedClaim: false,
          hasSufficientEvidence: false,
        })
      ),
      'insufficient_unverified'
    )
  })

  test('labels user-confirmed historical work as retrospective', ({ assert }) => {
    assert.equal(
      classifyLegacyAccomplishmentSource(
        source({
          hasImmutableAssignmentSnapshot: false,
          hasCompletionReport: false,
          hasGovernedReviewConfirmation: false,
          hasVerifiedClaim: false,
          hasSufficientEvidence: false,
          userConfirmedRetrospective: true,
        })
      ),
      'retrospective_user_confirmed'
    )
  })

  test('quarantines corrupt or identity-incomplete records', ({ assert }) => {
    assert.equal(classifyLegacyAccomplishmentSource(source({ sourceCorrupt: true })), 'corrupt_quarantined')
    assert.equal(
      classifyLegacyAccomplishmentSource(source({ taskAssignmentId: null })),
      'corrupt_quarantined'
    )
  })

  test('plans a dry-run page without writing and fences tenant scope', ({ assert }) => {
    const result = planLegacyAccomplishmentBackfill({
      records: [source(), source({ sourceId: 'history-2', userId: 'other-user' })],
      cursor: null,
      limit: 10,
      tenantUserIds: new Set(['user-1']),
      mode: 'dry_run',
    })

    assert.equal(result.processed, 1)
    assert.equal(result.nextCursor, null)
    assert.equal(result.outcomes[0]?.classification, 'native_immutable_candidate')
    assert.isFalse(result.outcomes[0]?.writable)
  })

  test('resumes from cursor and permits only labeled retrospective writes', ({ assert }) => {
    const result = planLegacyAccomplishmentBackfill({
      records: [
        source({ sourceId: 'history-1' }),
        source({ sourceId: 'history-2', userConfirmedRetrospective: true }),
        source({ sourceId: 'history-3' }),
      ],
      cursor: 'history-1',
      limit: 1,
      tenantUserIds: new Set(['user-1']),
      mode: 'apply',
    })

    assert.equal(result.processed, 1)
    assert.equal(result.nextCursor, 'history-3')
    assert.isFalse(result.outcomes[0]?.writable)

    const retrospective = planLegacyAccomplishmentBackfill({
      records: [
        source({
          sourceId: 'history-2',
          userConfirmedRetrospective: true,
          hasVerifiedClaim: false,
        }),
      ],
      cursor: null,
      limit: 1,
      tenantUserIds: new Set(['user-1']),
      mode: 'apply',
    })
    assert.isTrue(retrospective.outcomes[0]?.writable)
    assert.equal(retrospective.outcomes[0]?.classification, 'retrospective_user_confirmed')
  })

  test('dry-run produces a report without writer or checkpoint side effects', async ({ assert }) => {
    const calls = { writes: 0, checkpoints: 0 }
    const command = makeCommand({ calls })

    const result = await command.execute({
      scopeKey: 'tenant:user-1',
      tenantUserIds: new Set(['user-1']),
      limit: 10,
      mode: 'dry_run',
    })

    assert.equal(result.processed, 1)
    assert.equal(calls.writes, 0)
    assert.equal(calls.checkpoints, 0)
  })

  test('apply writes only retrospective facts and checkpoints after success', async ({ assert }) => {
    const calls = { writes: 0, checkpoints: 0 }
    const command = makeCommand({
      calls,
      records: [
        source({
          sourceId: 'history-2',
          hasVerifiedClaim: false,
          userConfirmedRetrospective: true,
        }),
        source({ sourceId: 'history-3' }),
      ],
    })

    const result = await command.execute({
      scopeKey: 'tenant:user-1',
      tenantUserIds: new Set(['user-1']),
      limit: 10,
      mode: 'apply',
    })

    assert.equal(result.processed, 2)
    assert.equal(calls.writes, 1)
    assert.equal(calls.checkpoints, 1)
    assert.equal(result.nextCursor, null)
  })

  test('does not checkpoint a failed retrospective write', async ({ assert }) => {
    const calls = { writes: 0, checkpoints: 0 }
    const command = makeCommand({ calls, writerFails: true })

    await assert.rejects(() =>
      command.execute({
        scopeKey: 'tenant:user-1',
        tenantUserIds: new Set(['user-1']),
        limit: 10,
        mode: 'apply',
      })
    )
    assert.equal(calls.writes, 1)
    assert.equal(calls.checkpoints, 0)
  })
})

function makeCommand(input: {
  calls: { writes: number; checkpoints: number }
  records?: LegacyAccomplishmentSource[]
  writerFails?: boolean
}): RunLegacyAccomplishmentBackfillCommand {
  const records = input.records ?? [source({ hasVerifiedClaim: false, userConfirmedRetrospective: true })]
  const reader: LegacyAccomplishmentBackfillReader = {
    list: () => Promise.resolve(records),
  }
  const checkpoints = new Map<string, LegacyAccomplishmentBackfillCheckpoint>()
  const checkpointStore: LegacyAccomplishmentBackfillCheckpointStore = {
    load: (scopeKey) => Promise.resolve(checkpoints.get(scopeKey) ?? null),
    save: (checkpoint) => {
      input.calls.checkpoints += 1
      checkpoints.set(checkpoint.scopeKey, checkpoint)
      return Promise.resolve()
    },
  }
  const writer: LegacyAccomplishmentBackfillWriter = {
    persistRetrospective: () => {
      input.calls.writes += 1
      return input.writerFails
        ? Promise.reject(new Error('writer failed'))
        : Promise.resolve()
    },
  }
  return new RunLegacyAccomplishmentBackfillCommand(reader, checkpointStore, writer)
}
