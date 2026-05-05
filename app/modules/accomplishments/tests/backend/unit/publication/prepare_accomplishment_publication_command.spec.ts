import { test } from '@japa/runner'

import CanonicalVisibilityAccomplishmentDisclosurePolicy from '#composition/adapters/accomplishments/publication/canonical_visibility_accomplishment_disclosure_policy'
import {
  PrepareAccomplishmentPublicationCommand,
  PrepareAccomplishmentPublicationBlockedError,
} from '#modules/accomplishments/actions/commands/publication/prepare_accomplishment_publication_command'
import type {
  AccomplishmentPublicationCanonicalSource,
  AccomplishmentPublicationFactsStore,
  PersistedDisclosureDecision,
  PersistedPublicationConsent,
} from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_publication_facts_store'
import { hashVerifiedAccomplishmentPayload } from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import { parseVerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import {
  ACCOMPLISHMENT_TEST_IDS,
  validVerifiedWorkAccomplishmentV1,
} from '#modules/accomplishments/tests/backend/unit/public_contracts/verified-work/accomplishment_contract_fixtures'

const hasher = new NodeAccomplishmentContentHasher()
const base = parseVerifiedWorkAccomplishmentV1(validVerifiedWorkAccomplishmentV1())
const publicWithoutHash = { ...base, visibility: 'public' as const }
const accomplishment = {
  ...publicWithoutHash,
  canonicalHash: hashVerifiedAccomplishmentPayload(publicWithoutHash, hasher),
}
const source: AccomplishmentPublicationCanonicalSource = {
  accomplishment,
  lifecycleRevisionId: ACCOMPLISHMENT_TEST_IDS.lifecycleRevision,
  lifecycleState: 'verified',
  hasOpenDispute: false,
  allowedCapabilities: [
    {
      capabilityId: ACCOMPLISHMENT_TEST_IDS.capability,
      label: 'API design',
      confidenceBand: 'high',
    },
  ],
}

class Store implements AccomplishmentPublicationFactsStore {
  decision: PersistedDisclosureDecision | null = null
  consent: PersistedPublicationConsent | null = null
  sourceOverride: AccomplishmentPublicationCanonicalSource | null = null

  loadCanonicalSource(id: string) {
    const candidate = this.sourceOverride ?? source
    return Promise.resolve(id === candidate.accomplishment.id ? candidate : null)
  }

  loadForPublication(_id: string) {
    return Promise.resolve(null)
  }

  loadPreparedPublication() {
    return Promise.resolve(null)
  }

  appendDecision(input: PersistedDisclosureDecision) {
    this.decision = input
    return Promise.resolve()
  }

  appendConsent(input: PersistedPublicationConsent) {
    this.consent = input
    return Promise.resolve()
  }
}

test.group('Unit | Prepare accomplishment publication command', () => {
  test('derives disclosure content from canonical facts and persists hashed consent', async ({
    assert,
  }) => {
    const store = new Store()
    const result = await new PrepareAccomplishmentPublicationCommand({
      facts: store,
      hasher,
      disclosurePolicy: new CanonicalVisibilityAccomplishmentDisclosurePolicy(),
    }).execute({
      accomplishmentId: accomplishment.id,
      actorUserId: accomplishment.userId,
      idempotencyKey: 'prepare-publication-test',
      expectedSourceCanonicalHash: accomplishment.canonicalHash,
      expectedLifecycleRevisionId: source.lifecycleRevisionId,
      confirmed: true,
      now: '2026-08-09T12:00:00.000Z',
    })

    assert.isTrue(result.granted)
    assert.equal(store.decision?.content.title, accomplishment.title)
    assert.equal(store.decision?.content.conciseStatement, accomplishment.conciseStatement)
    assert.notInclude(JSON.stringify(store.decision), accomplishment.detailedStatement as string)
    assert.equal(store.consent?.sourceCanonicalHash, accomplishment.canonicalHash)
    assert.equal(result.consent.consentFactHash, store.consent?.consentFactHash)
  })

  test('requires explicit confirmation before writing publication facts', async ({ assert }) => {
    const store = new Store()

    await assert.rejects(
      () =>
        new PrepareAccomplishmentPublicationCommand({
          facts: store,
          hasher,
          disclosurePolicy: new CanonicalVisibilityAccomplishmentDisclosurePolicy(),
        }).execute({
          accomplishmentId: accomplishment.id,
          actorUserId: accomplishment.userId,
          idempotencyKey: 'not-confirmed',
          expectedSourceCanonicalHash: accomplishment.canonicalHash,
          expectedLifecycleRevisionId: source.lifecycleRevisionId,
          confirmed: false,
          now: '2026-08-09T12:00:00.000Z',
        }),
      PrepareAccomplishmentPublicationBlockedError
    )
    assert.isNull(store.decision)
    assert.isNull(store.consent)
  })

  test('denies non-public canonical visibility before writing any publication facts', async ({
    assert,
  }) => {
    const store = new Store()
    const privateWithoutHash = { ...publicWithoutHash, visibility: 'internal' as const }
    const privateAccomplishment = {
      ...privateWithoutHash,
      canonicalHash: hashVerifiedAccomplishmentPayload(privateWithoutHash, hasher),
    }
    const privateSource = { ...source, accomplishment: privateAccomplishment }
    store.sourceOverride = privateSource

    await assert.rejects(
      () =>
        new PrepareAccomplishmentPublicationCommand({
          facts: store,
          hasher,
          disclosurePolicy: new CanonicalVisibilityAccomplishmentDisclosurePolicy(),
        }).execute({
          accomplishmentId: privateAccomplishment.id,
          actorUserId: privateAccomplishment.userId,
          idempotencyKey: 'private-source',
          expectedSourceCanonicalHash: privateAccomplishment.canonicalHash,
          expectedLifecycleRevisionId: privateSource.lifecycleRevisionId,
          confirmed: true,
          now: '2026-08-09T12:00:00.000Z',
        }),
      PrepareAccomplishmentPublicationBlockedError
    )
    assert.isNull(store.decision)
    assert.isNull(store.consent)
  })
})
