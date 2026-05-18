import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { accomplishmentPublicProjectionReader } from '#modules/accomplishments/infra/repositories/publication/accomplishment_public_projection_reader'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'
import { seedPublicTalentAccomplishment } from '#tests/helpers/seed_public_talent_accomplishment'

test.group('Integration | Accomplishment publication HTTP privacy boundary', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await db.from('search_projection_entity_revisions').where('entity_type', 'accomplishment_publication').delete()
    await cleanupTestData()
  })

  test('rejects a publication attempt by an authenticated non-owner', async ({
    assert,
    client,
  }) => {
    const owner = await UserFactory.create({ username: 'publication_http_owner' })
    const foreignActor = await UserFactory.create({ username: 'publication_http_foreign' })
    const seeded = await seedPublicTalentAccomplishment({
      userId: owner.id,
      organizationId: null,
      seedKey: 'foreign-actor',
    })

    const response = await client
      .post(`/api/v1/accomplishments/${seeded.accomplishmentId}/publication`)
      .loginAs(foreignActor)
      .json({
        idempotencyKey: 'foreign-actor-publication',
        expectedSourceCanonicalHash: seeded.canonicalHash,
        expectedLifecycleRevisionId: seeded.lifecycleRevisionId,
        confirmed: true,
      })

    response.assertStatus(400)
    assert.equal((response.body() as { code?: string }).code, 'E_BUSINESS_LOGIC')
  })

  test('requires explicit confirmation before any publication fact is written', async ({
    assert,
    client,
  }) => {
    const owner = await UserFactory.create({ username: 'publication_http_confirmation' })
    const seeded = await seedPublicTalentAccomplishment({
      userId: owner.id,
      organizationId: null,
      seedKey: 'confirmation-required',
    })

    const response = await client
      .post(`/api/v1/accomplishments/${seeded.accomplishmentId}/publication`)
      .loginAs(owner)
      .json({
        idempotencyKey: 'confirmation-required',
        expectedSourceCanonicalHash: seeded.canonicalHash,
        expectedLifecycleRevisionId: seeded.lifecycleRevisionId,
        confirmed: false,
      })

    response.assertStatus(400)
    assert.equal((response.body() as { code?: string }).code, 'E_BUSINESS_LOGIC')
    assert.equal(
      await db
        .from('accomplishment_publication_consents')
        .where('accomplishment_id', seeded.accomplishmentId)
        .count('* as total')
        .first()
        .then((row) => Number((row as { total?: string | number } | undefined)?.total ?? 0)),
      0
    )
  })

  test('fails closed for an internal canonical source before writing disclosure facts', async ({
    assert,
    client,
  }) => {
    const owner = await UserFactory.create({ username: 'publication_http_internal_source' })
    const seeded = await seedPublicTalentAccomplishment({
      userId: owner.id,
      organizationId: null,
      seedKey: 'internal-source',
      visibility: 'internal',
    })

    const response = await client
      .post(`/api/v1/accomplishments/${seeded.accomplishmentId}/publication`)
      .loginAs(owner)
      .json({
        idempotencyKey: 'internal-source-publication',
        expectedSourceCanonicalHash: seeded.canonicalHash,
        expectedLifecycleRevisionId: seeded.lifecycleRevisionId,
        confirmed: true,
      })

    response.assertStatus(400)
    assert.equal(
      await db
        .from('accomplishment_disclosure_decisions')
        .where('accomplishment_id', seeded.accomplishmentId)
        .count('* as total')
        .first()
        .then((row) => Number((row as { total?: string | number } | undefined)?.total ?? 0)),
      0
    )
    assert.equal(
      await db
        .from('accomplishment_publication_consents')
        .where('accomplishment_id', seeded.accomplishmentId)
        .count('* as total')
        .first()
        .then((row) => Number((row as { total?: string | number } | undefined)?.total ?? 0)),
      0
    )
  })

  test('publishes through the authenticated HTTP boundary and records a minimized audit event', async ({
    assert,
    client,
  }) => {
    const owner = await UserFactory.create({ username: 'publication_http_success' })
    const seeded = await seedPublicTalentAccomplishment({
      userId: owner.id,
      organizationId: null,
      seedKey: 'successful-publication',
    })

    const response = await client
      .post(`/api/v1/accomplishments/${seeded.accomplishmentId}/publication`)
      .loginAs(owner)
      .json({
        idempotencyKey: 'successful-publication',
        expectedSourceCanonicalHash: seeded.canonicalHash,
        expectedLifecycleRevisionId: seeded.lifecycleRevisionId,
        confirmed: true,
      })

    response.assertStatus(201)
    assert.isTrue((response.body() as { inserted?: boolean }).inserted)

    const reindex = (await db
      .from('domain_event_outbox')
      .where('event_name', 'search:talent-reindex-requested')
      .where('aggregate_id', owner.id)
      .first()) as { status: string; aggregate_type: string; payload: Record<string, unknown> } | null
    assert.isNotNull(reindex)
    assert.equal(reindex?.status, 'pending')
    assert.equal(reindex?.aggregate_type, 'user_talent')
    assert.deepInclude(reindex?.payload, {
      userId: owner.id,
      sourceEventName: 'accomplishment:publication:changed:v1',
    })
    const publicationReceipt = (await db
      .from('search_projection_entity_revisions')
      .where('entity_type', 'accomplishment_publication')
      .where('source_revision', reindex?.payload['sourceEventId'] as string)
      .first()) as { operation: string; processed_at: Date | string | null } | null
    assert.isNotNull(publicationReceipt)
    assert.equal(publicationReceipt?.operation, 'upsert')
    assert.isNull(publicationReceipt?.processed_at)

    const audit = (await db
      .from('audit_events')
      .where('event_name', 'accomplishment.publication.publish')
      .where('entity_id', seeded.accomplishmentId)
      .select('outcome', 'target_id', 'redaction_applied', 'new_values')
      .orderBy('created_at', 'desc')
      .first()) as {
      outcome: string
      target_id: string
      redaction_applied: boolean
      new_values: Record<string, unknown>
    } | null

    assert.isNotNull(audit)
    if (!audit) return
    assert.equal(audit.outcome, 'success')
    assert.isTrue(audit.redaction_applied)
    assert.isString(audit.target_id)
    assert.deepEqual(audit.new_values, {
      publication_version: 1,
      source_canonical_hash: seeded.canonicalHash,
      lifecycle_revision_id: seeded.lifecycleRevisionId,
      disclosure_policy_version: 'public-disclosure-v1',
      changed: true,
    })
    assert.notInclude(JSON.stringify(audit), seeded.title)
    assert.notInclude(JSON.stringify(audit), seeded.privateSourceMarker)
  })

  test('owner unpublishes through the authenticated HTTP boundary by retiring the active projection', async ({
    assert,
    client,
  }) => {
    const owner = await UserFactory.create({ username: 'publication_http_unpublish_owner' })
    const seeded = await seedPublicTalentAccomplishment({
      userId: owner.id,
      organizationId: null,
      seedKey: 'successful-unpublication',
    })

    const published = await client
      .post(`/api/v1/accomplishments/${seeded.accomplishmentId}/publication`)
      .loginAs(owner)
      .json({
        idempotencyKey: 'successful-unpublication',
        expectedSourceCanonicalHash: seeded.canonicalHash,
        expectedLifecycleRevisionId: seeded.lifecycleRevisionId,
        confirmed: true,
      })
    published.assertStatus(201)

    const publication = published.body() as {
      projection?: { id?: string; publicationVersion?: number }
    }
    const projectionId = publication.projection?.id
    const publicationVersion = publication.projection?.publicationVersion
    assert.isString(projectionId)
    assert.equal(publicationVersion, 1)
    if (typeof projectionId !== 'string' || publicationVersion !== 1) return

    const response = await client
      .delete(`/api/v1/accomplishments/${seeded.accomplishmentId}/publication`)
      .loginAs(owner)
      .json({ projectionId, publicationVersion, confirmed: true })

    response.assertStatus(200)
    const unpublication = response.body() as {
      changed: boolean
      projectionId: string
      publicationVersion: number
      retiredAt: string
    }
    assert.isTrue(unpublication.changed)
    assert.isString(unpublication.retiredAt)
    assert.deepEqual(unpublication, {
      changed: true,
      projectionId,
      publicationVersion: 1,
      retiredAt: unpublication.retiredAt,
    })

    const row = (await db
      .from('accomplishment_public_projections')
      .where('id', projectionId)
      .select('retired_at')
      .first()) as { retired_at: Date | string | null } | null
    assert.isNotNull(row)
    assert.isNotNull(row?.retired_at)
    const activeForOwner = await accomplishmentPublicProjectionReader.listActiveForUser({
      userId: owner.id,
      limit: 10,
    })
    assert.notInclude(
      activeForOwner.items.map((item) => item.id),
      projectionId
    )

    const unpublishAudit = (await db
      .from('audit_events')
      .where('event_name', 'accomplishment.publication.unpublish')
      .where('entity_id', seeded.accomplishmentId)
      .select('outcome', 'target_id', 'redaction_applied', 'new_values')
      .first()) as {
      outcome: string
      target_id: string
      redaction_applied: boolean
      new_values: Record<string, unknown>
    } | null
    assert.isNotNull(unpublishAudit)
    if (!unpublishAudit) return
    assert.equal(unpublishAudit.outcome, 'success')
    assert.equal(unpublishAudit.target_id, projectionId)
    assert.isTrue(unpublishAudit.redaction_applied)
    assert.deepEqual(unpublishAudit.new_values, {
      publication_version: 1,
      source_canonical_hash: null,
      lifecycle_revision_id: null,
      disclosure_policy_version: null,
      changed: true,
    })
    assert.notInclude(JSON.stringify(unpublishAudit), seeded.title)
    assert.notInclude(JSON.stringify(unpublishAudit), seeded.privateSourceMarker)

    const reindexEvents = await db
      .from('domain_event_outbox')
      .where('event_name', 'search:talent-reindex-requested')
      .where('aggregate_id', owner.id)
      .count('* as total')
    assert.equal(Number((reindexEvents[0] as { total: number | string }).total), 2)
    const publicationReceipts = await db
      .from('search_projection_entity_revisions')
      .where('entity_type', 'accomplishment_publication')
      .where('entity_id', owner.id)
      .count('* as total')
    assert.equal(Number((publicationReceipts[0] as { total: number | string }).total), 2)

    const replay = await client
      .delete(`/api/v1/accomplishments/${seeded.accomplishmentId}/publication`)
      .loginAs(owner)
      .json({ projectionId, publicationVersion, confirmed: true })
    replay.assertStatus(200)
    assert.isFalse((replay.body() as { changed?: boolean }).changed)

    const replayAudit = (await db
      .from('audit_events')
      .where('event_name', 'accomplishment.publication.unpublish')
      .where('entity_id', seeded.accomplishmentId)
      .select('outcome', 'new_values')
      .orderBy('created_at', 'desc')
      .first()) as { outcome: string; new_values: Record<string, unknown> } | null
    assert.isNotNull(replayAudit)
    if (!replayAudit) return
    assert.equal(replayAudit.outcome, 'replayed')
    assert.equal(replayAudit.new_values['changed'], false)
  })

  test('rejects foreign-owner unpublish without retiring the public projection or writing an unpublish audit', async ({
    assert,
    client,
  }) => {
    const owner = await UserFactory.create({ username: 'publication_http_unpublish_owner_foreign' })
    const foreignActor = await UserFactory.create({ username: 'publication_http_unpublish_foreign' })
    const seeded = await seedPublicTalentAccomplishment({
      userId: owner.id,
      organizationId: null,
      seedKey: 'foreign-unpublication',
    })

    const published = await client
      .post(`/api/v1/accomplishments/${seeded.accomplishmentId}/publication`)
      .loginAs(owner)
      .json({
        idempotencyKey: 'foreign-unpublication',
        expectedSourceCanonicalHash: seeded.canonicalHash,
        expectedLifecycleRevisionId: seeded.lifecycleRevisionId,
        confirmed: true,
      })
    published.assertStatus(201)
    const projection = published.body() as {
      projection: { id: string; publicationVersion: number }
    }

    const response = await client
      .delete(`/api/v1/accomplishments/${seeded.accomplishmentId}/publication`)
      .loginAs(foreignActor)
      .json({
        projectionId: projection.projection.id,
        publicationVersion: projection.projection.publicationVersion,
        confirmed: true,
      })

    response.assertStatus(400)
    assert.equal((response.body() as { code?: string }).code, 'E_BUSINESS_LOGIC')
    assert.notInclude(JSON.stringify(response.body()), seeded.privateSourceMarker)

    const row = (await db
      .from('accomplishment_public_projections')
      .where('id', projection.projection.id)
      .select('retired_at')
      .first()) as { retired_at: Date | string | null } | null
    assert.isNull(row?.retired_at)

    const unpublishAudit = (await db
      .from('audit_events')
      .where('event_name', 'accomplishment.publication.unpublish')
      .where('entity_id', seeded.accomplishmentId)
      .count('* as total')
      .first()) as { total?: string | number } | null
    assert.equal(Number(unpublishAudit?.total ?? 0), 0)
  })

  test('requires confirmation before unpublish can mutate an active projection', async ({
    assert,
    client,
  }) => {
    const owner = await UserFactory.create({ username: 'publication_http_unpublish_confirmation' })
    const seeded = await seedPublicTalentAccomplishment({
      userId: owner.id,
      organizationId: null,
      seedKey: 'unpublication-confirmation-required',
    })

    const published = await client
      .post(`/api/v1/accomplishments/${seeded.accomplishmentId}/publication`)
      .loginAs(owner)
      .json({
        idempotencyKey: 'unpublication-confirmation-required',
        expectedSourceCanonicalHash: seeded.canonicalHash,
        expectedLifecycleRevisionId: seeded.lifecycleRevisionId,
        confirmed: true,
      })
    published.assertStatus(201)
    const projection = published.body() as {
      projection: { id: string; publicationVersion: number }
    }

    const response = await client
      .delete(`/api/v1/accomplishments/${seeded.accomplishmentId}/publication`)
      .loginAs(owner)
      .json({
        projectionId: projection.projection.id,
        publicationVersion: projection.projection.publicationVersion,
        confirmed: false,
      })

    response.assertStatus(400)
    assert.equal((response.body() as { code?: string }).code, 'E_BUSINESS_LOGIC')

    const row = (await db
      .from('accomplishment_public_projections')
      .where('id', projection.projection.id)
      .select('retired_at')
      .first()) as { retired_at: Date | string | null } | null
    assert.isNull(row?.retired_at)
  })

  test('rejects malformed unpublish request bodies at the HTTP validation boundary', async ({
    assert,
    client,
  }) => {
    const owner = await UserFactory.create({ username: 'publication_http_unpublish_validation' })
    const seeded = await seedPublicTalentAccomplishment({
      userId: owner.id,
      organizationId: null,
      seedKey: 'unpublication-validation',
    })

    const response = await client
      .delete(`/api/v1/accomplishments/${seeded.accomplishmentId}/publication`)
      .loginAs(owner)
      .json({ projectionId: '', publicationVersion: 0, confirmed: 'yes' })

    response.assertStatus(422)
    assert.equal((response.body() as { code?: string }).code, 'E_VALIDATION')
    assert.equal(
      await db
        .from('accomplishment_public_projections')
        .where('accomplishment_id', seeded.accomplishmentId)
        .count('* as total')
        .first()
        .then((row) => Number((row as { total?: string | number } | undefined)?.total ?? 0)),
      0
    )
  })
})
