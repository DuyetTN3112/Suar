import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import AccomplishmentPublicationAuditWriterAdapter from '#composition/adapters/accomplishments/publication/accomplishment_publication_audit_writer'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | Accomplishment publication audit writer', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(async () => {
    await teardownApp()
  })
  group.each.teardown(() => cleanupTestData())

  test('persists a redacted publication audit event without accomplishment wording', async ({ assert }) => {
    const actor = await UserFactory.create({ username: 'publication_audit_actor' })
    const accomplishmentId = '00000000-0000-4000-8000-000000000101'
    const projectionId = '00000000-0000-4000-8000-000000000102'
    const sourceCanonicalHash = 'sha256:publication-source'

    await new AccomplishmentPublicationAuditWriterAdapter().record(
      {
        action: 'publish',
        accomplishmentId,
        actorUserId: actor.id,
        projectionId,
        publicationVersion: 3,
        insertedOrChanged: true,
        sourceCanonicalHash,
        lifecycleRevisionId: 'revision-3',
        disclosurePolicyVersion: 'policy-2',
      },
      {
        userId: actor.id,
        ip: '127.0.0.1',
        userAgent: 'integration-test',
        organizationId: null,
        requestId: 'publication-audit-request',
        traceId: 'publication-audit-trace',
      }
    )

    const row = (await db
      .from('audit_events')
      .where('event_name', 'accomplishment.publication.publish')
      .where('entity_id', accomplishmentId)
      .select(
        'action',
        'entity_type',
        'entity_id',
        'module',
        'subsystem',
        'outcome',
        'target_type',
        'target_id',
        'redaction_applied',
        'new_values'
      )
      .orderBy('created_at', 'desc')
      .first()) as {
      action: string
      entity_type: string
      entity_id: string
      module: string
      subsystem: string
      outcome: string
      target_type: string
      target_id: string
      redaction_applied: boolean
      new_values: Record<string, unknown>
    } | null

    assert.isNotNull(row)
    if (!row) return
    assert.deepEqual(row, {
      action: 'accomplishment_publish',
      entity_type: 'accomplishment_publication',
      entity_id: accomplishmentId,
      module: 'accomplishments',
      subsystem: 'publication',
      outcome: 'success',
      target_type: 'accomplishment_publication',
      target_id: projectionId,
      redaction_applied: true,
      new_values: {
        publication_version: 3,
        source_canonical_hash: sourceCanonicalHash,
        lifecycle_revision_id: 'revision-3',
        disclosure_policy_version: 'policy-2',
        changed: true,
      },
    })
    assert.notInclude(JSON.stringify(row), 'accomplishment wording')
    assert.notInclude(JSON.stringify(row), 'evidence wording')
  })

  test('records unpublish and links consecutive publication events in the audit chain', async ({
    assert,
  }) => {
    const actor = await UserFactory.create({ username: 'publication_audit_chain_actor' })
    const accomplishmentId = '00000000-0000-4000-8000-000000000103'
    const adapter = new AccomplishmentPublicationAuditWriterAdapter()
    const execCtx = {
      userId: actor.id,
      ip: '127.0.0.1',
      userAgent: 'integration-test',
      organizationId: null,
      requestId: 'publication-audit-chain-request',
      traceId: 'publication-audit-chain-trace',
    }

    await adapter.record(
      {
        action: 'publish',
        accomplishmentId,
        actorUserId: actor.id,
        projectionId: '00000000-0000-4000-8000-000000000104',
        publicationVersion: 1,
        insertedOrChanged: true,
        sourceCanonicalHash: 'sha256:chain-source-1',
        lifecycleRevisionId: 'revision-1',
        disclosurePolicyVersion: 'policy-1',
      },
      execCtx
    )
    await adapter.record(
      {
        action: 'unpublish',
        accomplishmentId,
        actorUserId: actor.id,
        projectionId: null,
        publicationVersion: 1,
        insertedOrChanged: true,
        sourceCanonicalHash: 'sha256:chain-source-1',
        lifecycleRevisionId: 'revision-1',
        disclosurePolicyVersion: 'policy-1',
      },
      execCtx
    )

    const rows = (await db
      .from('audit_events')
      .where('entity_type', 'accomplishment_publication')
      .where('entity_id', accomplishmentId)
      .whereIn('event_name', [
        'accomplishment.publication.publish',
        'accomplishment.publication.unpublish',
      ])
      .orderBy('created_at', 'asc')
      .select('event_name', 'outcome', 'redaction_applied', 'event_hash', 'prev_hash')) as {
      event_name: string
      outcome: string
      redaction_applied: boolean
      event_hash: string
      prev_hash: string | null
    }[]

    assert.lengthOf(rows, 2)
    const first = rows[0]
    const second = rows[1]
    if (!first || !second) return
    assert.equal(first.event_name, 'accomplishment.publication.publish')
    assert.equal(second.event_name, 'accomplishment.publication.unpublish')
    assert.equal(first.outcome, 'success')
    assert.equal(second.outcome, 'success')
    assert.isTrue(first.redaction_applied)
    assert.isTrue(second.redaction_applied)
    assert.match(first.event_hash, /^[0-9a-f]{64}$/)
    assert.equal(second.prev_hash, first.event_hash)
  })
})
