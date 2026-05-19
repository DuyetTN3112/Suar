import { test } from '@japa/runner'

import RebuildVerifiedAccomplishmentCommand, {
  RebuildVerifiedAccomplishmentHashMismatchError,
} from '#modules/accomplishments/actions/commands/verified-work/rebuild_verified_accomplishment_command'
import { ACCOMPLISHMENT_TEST_HASHES } from '#modules/accomplishments/tests/backend/unit/public_contracts/verified-work/accomplishment_contract_fixtures'

const identity = {
  taskAssignmentId: '00000000-0000-4000-8000-000000000006',
  completionClaimId: '00000000-0000-4000-8000-000000000013',
  reviewWorkflowId: '00000000-0000-4000-8000-000000000014',
  reviewFinalizedFactId: '00000000-0000-4000-8000-000000000021',
  reviewFinalizedFactHash: ACCOMPLISHMENT_TEST_HASHES.review,
  projectionPolicyVersion: 'accomplishment-policy-v1',
}

const result = {
  inserted: false,
  accomplishmentId: '00000000-0000-4000-8000-000000000001',
  projectionKey: 'rebuild:test',
  canonicalHash: ACCOMPLISHMENT_TEST_HASHES.canonical,
  lifecycleState: 'verified' as const,
  lifecycleRevisionId: '00000000-0000-4000-8000-000000000020',
  lifecycleSequence: 1,
}

test.group('Unit | Rebuild verified accomplishment command', () => {
  test('rebuilds through the projector and confirms the expected canonical hash', async ({
    assert,
  }) => {
    let calls = 0
    const command = new RebuildVerifiedAccomplishmentCommand({
      execute: (requestedIdentity) => {
        calls += 1
        assert.deepEqual(requestedIdentity, identity)
        return Promise.resolve(result)
      },
    })

    const rebuilt = await command.execute({
      identity,
      expectedCanonicalHash: ACCOMPLISHMENT_TEST_HASHES.canonical,
    })

    assert.equal(calls, 1)
    assert.isTrue(rebuilt.rebuilt)
    assert.isTrue(rebuilt.canonicalHashMatchesExpected)
    assert.equal(rebuilt.canonicalHash, ACCOMPLISHMENT_TEST_HASHES.canonical)
  })

  test('fails closed when the rebuilt canonical hash drifts', async ({ assert }) => {
    const command = new RebuildVerifiedAccomplishmentCommand({
      execute: () => Promise.resolve({
        ...result,
        canonicalHash: `sha256:${'f'.repeat(64)}`,
      }),
    })

    await assert.rejects(
      () =>
      command.execute({
          identity,
          expectedCanonicalHash: ACCOMPLISHMENT_TEST_HASHES.canonical,
        }),
      RebuildVerifiedAccomplishmentHashMismatchError
    )

    let captured: unknown
    try {
      await command.execute({
        identity,
        expectedCanonicalHash: ACCOMPLISHMENT_TEST_HASHES.canonical,
      })
    } catch (error) {
      captured = error
    }
    assert.instanceOf(captured, RebuildVerifiedAccomplishmentHashMismatchError)
    assert.deepEqual((captured as RebuildVerifiedAccomplishmentHashMismatchError).details, {
      reasonCodes: ['TVA.ACCOMPLISHMENT.REBUILD.CANONICAL_HASH_MISMATCH'],
      meta: {
        expectedCanonicalHash: ACCOMPLISHMENT_TEST_HASHES.canonical,
        actualCanonicalHash: `sha256:${'f'.repeat(64)}`,
      },
    })
  })

  test('propagates a projector outage without reporting a rebuilt accomplishment', async ({
    assert,
  }) => {
    const outage = new Error('database connection reset during rebuild')
    let calls = 0
    const command = new RebuildVerifiedAccomplishmentCommand({
      execute: () => {
        calls += 1
        return Promise.reject(outage)
      },
    })

    let captured: unknown
    try {
      await command.execute({ identity })
    } catch (error) {
      captured = error
    }

    assert.equal(captured, outage)
    assert.equal(calls, 1)
  })
})
