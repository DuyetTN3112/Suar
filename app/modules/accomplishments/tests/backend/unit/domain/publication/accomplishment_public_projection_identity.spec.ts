import { test } from '@japa/runner'

import {
  buildAccomplishmentPublicationIdentity,
  hashAccomplishmentDisclosureDecision,
} from '#modules/accomplishments/domain/publication/accomplishment_public_projection_identity'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'

const hasher = new NodeAccomplishmentContentHasher()

test.group('Unit | Accomplishment public projection identity', () => {
  test('is deterministic for an accomplishment, actor and idempotency key', ({ assert }) => {
    const input = {
      accomplishmentId: '10000000-0000-4000-8000-000000000001',
      actorUserId: '10000000-0000-4000-8000-000000000002',
      idempotencyKey: 'publish-after-user-confirmation',
    }

    const first = buildAccomplishmentPublicationIdentity(input, hasher)
    const replay = buildAccomplishmentPublicationIdentity(input, hasher)
    const different = buildAccomplishmentPublicationIdentity(
      { ...input, idempotencyKey: 'publish-corrected-wording' },
      hasher
    )

    assert.deepEqual(replay, first)
    assert.notEqual(different.projectionKey, first.projectionKey)
    assert.match(first.projectionKey, /^appub:v1:[0-9a-f]{64}$/)
  })

  test('hashes every authoritative disclosure decision field canonically', ({ assert }) => {
    const source = {
      decisionId: '10000000-0000-4000-8000-000000000001',
      accomplishmentId: '10000000-0000-4000-8000-000000000002',
      subjectUserId: '10000000-0000-4000-8000-000000000003',
      allowed: true,
      policyVersion: 'public-disclosure-v1',
      decidedAt: '2026-08-01T09:00:00.000Z',
      content: { title: 'Approved wording' },
    }

    const first = hashAccomplishmentDisclosureDecision(source, hasher)
    const replay = hashAccomplishmentDisclosureDecision({ ...source }, hasher)
    const changed = hashAccomplishmentDisclosureDecision(
      { ...source, content: { title: 'Changed wording' } },
      hasher
    )

    assert.equal(replay, first)
    assert.notEqual(changed, first)
  })
})
