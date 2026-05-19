import { test } from '@japa/runner'

import GovernAccomplishmentLifecycleCommand, {
  ACCOMPLISHMENT_GOVERNANCE_CODES,
  GovernAccomplishmentLifecycleBlockedError,
} from '#modules/accomplishments/actions/commands/lifecycle/govern_accomplishment_lifecycle_command'
import type {
  AccomplishmentLifecycleGovernanceWriter,
  GovernAccomplishmentLifecycleInput,
} from '#modules/accomplishments/actions/ports/outbound/lifecycle/accomplishment_lifecycle_governance_writer'
import { ACCOMPLISHMENT_LIFECYCLE_CODES } from '#modules/accomplishments/domain/lifecycle/accomplishment_lifecycle_rules'
import {
  ACCOMPLISHMENT_TEST_HASHES,
  ACCOMPLISHMENT_TEST_IDS,
} from '#modules/accomplishments/tests/backend/unit/public_contracts/verified-work/accomplishment_contract_fixtures'

function freezeInput(): GovernAccomplishmentLifecycleInput {
  return {
    accomplishmentId: ACCOMPLISHMENT_TEST_IDS.accomplishment,
    expectedLifecycleRevisionId: ACCOMPLISHMENT_TEST_IDS.lifecycleRevision,
    expectedLifecycleSequence: 3,
    expectedLifecycleState: 'verified',
    expectedVisibility: 'internal',
    nextLifecycleState: 'frozen',
    nextVisibility: 'private',
    reasonCode: 'dispute_opened',
    sourceFact: {
      id: ACCOMPLISHMENT_TEST_IDS.sourceFact,
      type: 'dispute',
      hash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
    },
    actor: { type: 'user', userId: ACCOMPLISHMENT_TEST_IDS.user },
    policyVersion: 'accomplishment-policy-v1',
    relatedAccomplishmentId: null,
    occurredAt: '2026-08-01T12:00:00.000Z',
  }
}

test.group('Unit | Command | Govern accomplishment lifecycle', () => {
  test('delegates a governed dispute freeze to the atomic writer', async ({ assert }) => {
    const input = freezeInput()
    let received: GovernAccomplishmentLifecycleInput | null = null
    const writer: AccomplishmentLifecycleGovernanceWriter = {
      transition(value) {
        received = value
        return Promise.resolve({
          inserted: true,
          revision: {
            contractVersion: 1,
            id: ACCOMPLISHMENT_TEST_IDS.lifecycleRevision,
            accomplishmentId: value.accomplishmentId,
            sequence: 4,
            previousState: value.expectedLifecycleState,
            nextState: value.nextLifecycleState,
            visibility: value.nextVisibility,
            reasonCode: value.reasonCode,
            sourceFact: value.sourceFact,
            actor: value.actor,
            policyVersion: value.policyVersion,
            supersedesRevisionId: null,
            relatedAccomplishmentId: null,
            occurredAt: value.occurredAt,
          },
          currentLifecycleState: 'frozen',
          currentVisibility: 'private',
          currentCanonicalHash: ACCOMPLISHMENT_TEST_HASHES.canonical,
        })
      },
    }

    const result = await new GovernAccomplishmentLifecycleCommand(writer).execute(input)

    assert.deepEqual(received, input)
    assert.isTrue(result.inserted)
  })

  test('rejects invalid lifecycle movement before touching persistence', async ({ assert }) => {
    let calls = 0
    const writer: AccomplishmentLifecycleGovernanceWriter = {
      transition() {
        calls += 1
        return Promise.reject(new Error('must not be called'))
      },
    }
    const input: GovernAccomplishmentLifecycleInput = {
      ...freezeInput(),
      expectedLifecycleState: 'revoked',
      nextLifecycleState: 'verified',
      reasonCode: 'dispute_resolved',
      actor: { type: 'governance', userId: ACCOMPLISHMENT_TEST_IDS.reviewer },
    }

    let error: GovernAccomplishmentLifecycleBlockedError | null = null
    try {
      await new GovernAccomplishmentLifecycleCommand(writer).execute(input)
    } catch (caught) {
      assert.instanceOf(caught, GovernAccomplishmentLifecycleBlockedError)
      error = caught as GovernAccomplishmentLifecycleBlockedError
    }

    assert.include(error?.blockerCodes ?? [], ACCOMPLISHMENT_LIFECYCLE_CODES.terminalState)
    assert.equal(calls, 0)
  })

  test('exposes expected governance blockers through the canonical Result boundary', async ({
    assert,
  }) => {
    const writer: AccomplishmentLifecycleGovernanceWriter = {
      transition: () => Promise.reject(new Error('must not be called')),
    }
    const command = new GovernAccomplishmentLifecycleCommand(writer)
    const result = await command.executeAndWrap({
      ...freezeInput(),
      expectedLifecycleState: 'revoked',
      nextLifecycleState: 'verified',
    })

    assert.isFalse(result.isSuccess())
    assert.instanceOf(result.getError(), GovernAccomplishmentLifecycleBlockedError)
  })

  test('requires governed source and actor semantics for resolution and revocation', async ({
    assert,
  }) => {
    const writer: AccomplishmentLifecycleGovernanceWriter = {
      transition() {
        return Promise.reject(new Error('must not be called'))
      },
    }
    const input: GovernAccomplishmentLifecycleInput = {
      ...freezeInput(),
      expectedLifecycleState: 'frozen',
      expectedVisibility: 'private',
      nextLifecycleState: 'verified',
      nextVisibility: 'private',
      reasonCode: 'dispute_resolved',
      sourceFact: { ...freezeInput().sourceFact, type: 'governance' },
      actor: { type: 'system', userId: null },
    }

    let error: GovernAccomplishmentLifecycleBlockedError | null = null
    try {
      await new GovernAccomplishmentLifecycleCommand(writer).execute(input)
    } catch (caught) {
      assert.instanceOf(caught, GovernAccomplishmentLifecycleBlockedError)
      error = caught as GovernAccomplishmentLifecycleBlockedError
    }

    assert.include(error?.blockerCodes ?? [], ACCOMPLISHMENT_GOVERNANCE_CODES.sourceTypeMismatch)
    assert.include(
      error?.blockerCodes ?? [],
      ACCOMPLISHMENT_GOVERNANCE_CODES.governanceActorRequired
    )
  })

  test('requires correction to point at a successor and rejects unrelated links on revoke', async ({
    assert,
  }) => {
    const writer: AccomplishmentLifecycleGovernanceWriter = {
      transition() {
        return Promise.reject(new Error('must not be called'))
      },
    }
    const command = new GovernAccomplishmentLifecycleCommand(writer)
    const correction: GovernAccomplishmentLifecycleInput = {
      ...freezeInput(),
      nextLifecycleState: 'superseded',
      nextVisibility: 'internal',
      reasonCode: 'correction_issued',
      sourceFact: { ...freezeInput().sourceFact, type: 'correction' },
      actor: { type: 'governance', userId: ACCOMPLISHMENT_TEST_IDS.reviewer },
    }
    let correctionError: GovernAccomplishmentLifecycleBlockedError | null = null
    try {
      await command.execute(correction)
    } catch (caught) {
      assert.instanceOf(caught, GovernAccomplishmentLifecycleBlockedError)
      correctionError = caught as GovernAccomplishmentLifecycleBlockedError
    }
    assert.include(
      correctionError?.blockerCodes ?? [],
      ACCOMPLISHMENT_GOVERNANCE_CODES.relatedSuccessorRequired
    )

    const revoke: GovernAccomplishmentLifecycleInput = {
      ...freezeInput(),
      nextLifecycleState: 'revoked',
      nextVisibility: 'internal',
      reasonCode: 'governance_revoked',
      sourceFact: { ...freezeInput().sourceFact, type: 'governance' },
      actor: { type: 'governance', userId: ACCOMPLISHMENT_TEST_IDS.reviewer },
      relatedAccomplishmentId: '00000000-0000-4000-8000-000000000099',
    }
    let revokeError: GovernAccomplishmentLifecycleBlockedError | null = null
    try {
      await command.execute(revoke)
    } catch (caught) {
      assert.instanceOf(caught, GovernAccomplishmentLifecycleBlockedError)
      revokeError = caught as GovernAccomplishmentLifecycleBlockedError
    }
    assert.include(
      revokeError?.blockerCodes ?? [],
      ACCOMPLISHMENT_GOVERNANCE_CODES.unexpectedRelatedAccomplishment
    )
  })
})
