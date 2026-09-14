import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  source,
  createNativeProjectionFixture,
  cleanupAccomplishments,
} from './support/accomplishment_projection_test_fixtures.js'

import { rebuildVerifiedAccomplishment } from '#composition/accomplishments/verified-work/accomplishment_projection_composition'
import ProjectVerifiedAccomplishmentCommand from '#modules/accomplishments/actions/commands/verified-work/project_verified_accomplishment_command'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import { VerifiedAccomplishmentRepository } from '#modules/accomplishments/infra/repositories/verified-work/verified_accomplishment_repository'
import { ReviewObservationRepository } from '#modules/reviews/infra/repositories/observation/review_observation_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'


test.group('Integration | Review-confirmed accomplishment projector transaction', (group) => {
  const sourceFact = source()
  const command = new ProjectVerifiedAccomplishmentCommand({
    sources: { load: () => Promise.resolve(sourceFact) },
    writer: new VerifiedAccomplishmentRepository(new NodeAccomplishmentContentHasher()),
    hasher: new NodeAccomplishmentContentHasher(),
  })

  group.setup(async () => {
    await setupApp()
  })
  group.each.setup(cleanupAccomplishments)
  group.each.teardown(cleanupAccomplishments)
  group.teardown(async () => {
    await teardownApp()
  })

  test('writes the accomplishment aggregate in the supplied transaction', async ({ assert }) => {
    const rollback = new Error('intentional integration rollback')

    try {
      await db.transaction(async (transaction) => {
        const persisted = await command.execute(sourceFact.identity, transaction)
        const insideAggregate: unknown = await transaction
          .from('verified_work_accomplishments')
          .where('id', persisted.accomplishmentId)
          .first()
        const insideChildren = await transaction
          .from('accomplishment_lifecycle_revisions')
          .where('accomplishment_id', persisted.accomplishmentId)

        assert.exists(insideAggregate)
        assert.lengthOf(insideChildren, 3)
        throw rollback
      })
      assert.fail('The transaction should have rolled back.')
    } catch (error) {
      assert.equal(error, rollback)
    }

    const rolledBackCount = (await db
      .from('verified_work_accomplishments')
      .where('title', 'Proved review-confirmed accomplishment projection')
      .count('* as total')
      .first()) as { total?: string | number } | null
    assert.equal(Number(rolledBackCount?.total ?? 0), 0)

    const committed = await db.transaction((transaction) =>
      command.execute(sourceFact.identity, transaction)
    )
    const aggregate = (await db
      .from('verified_work_accomplishments')
      .where('id', committed.accomplishmentId)
      .first()) as { projection_key?: string } | null
    const [claims, evidence, observations, lifecycle] = await Promise.all([
      db.from('accomplishment_claim_links').where('accomplishment_id', committed.accomplishmentId),
      db
        .from('accomplishment_evidence_links')
        .where('accomplishment_id', committed.accomplishmentId),
      db
        .from('accomplishment_review_observation_links')
        .where('accomplishment_id', committed.accomplishmentId),
      db
        .from('accomplishment_lifecycle_revisions')
        .where('accomplishment_id', committed.accomplishmentId),
    ])

    assert.exists(aggregate)
    assert.equal(aggregate?.projection_key, committed.projectionKey)
    assert.lengthOf(claims, 1)
    assert.lengthOf(evidence, 1)
    assert.lengthOf(observations, 1)
    assert.lengthOf(lifecycle, 3)

    const replayed = await db.transaction((transaction) =>
      command.execute(sourceFact.identity, transaction)
    )
    assert.equal(replayed.accomplishmentId, committed.accomplishmentId)
    assert.equal(replayed.projectionKey, committed.projectionKey)
    assert.lengthOf(
      await db
        .from('verified_work_accomplishments')
        .where('projection_key', committed.projectionKey),
      1
    )
    assert.lengthOf(
      await db
        .from('accomplishment_lifecycle_revisions')
        .where('accomplishment_id', committed.accomplishmentId),
      3
    )
  })

  test('loads a native task/review source and projects it with the actual writer', async ({
    assert,
  }) => {
    try {
      const fixture = await createNativeProjectionFixture()
      const loaded = await fixture.sourceReader.load(fixture.identity)
      assert.exists(loaded)
      if (!loaded) return
      assert.equal(loaded.gateInput.completionReportId, loaded.completionReport.id)
      assert.equal(loaded.governedClaimRef.claimId, fixture.identity.completionClaimId)
      assert.equal(
        loaded.observationFacts[0]?.observation.id,
        fixture.identity.reviewFinalizedFactId
      )

      const hasher = new NodeAccomplishmentContentHasher()
      const projector = new ProjectVerifiedAccomplishmentCommand({
        sources: fixture.sourceReader,
        writer: new VerifiedAccomplishmentRepository(hasher),
        hasher,
      })
      const persisted = await db.transaction((transaction) =>
        projector.execute(fixture.identity, transaction)
      )
      const aggregate = (await db
        .from('verified_work_accomplishments')
        .where('id', persisted.accomplishmentId)
        .first()) as { task_assignment_id?: string; completion_report_id?: string } | null
      assert.exists(aggregate)
      assert.equal(aggregate?.task_assignment_id, loaded.gateInput.taskAssignmentId)
      assert.equal(aggregate?.completion_report_id, loaded.completionReport.id)
      assert.lengthOf(
        await db
          .from('accomplishment_review_observation_links')
          .where('accomplishment_id', persisted.accomplishmentId),
        1
      )

      const rebuilt = await rebuildVerifiedAccomplishment(fixture.identity, persisted.canonicalHash)
      assert.isTrue(rebuilt.rebuilt)
      assert.isTrue(rebuilt.canonicalHashMatchesExpected)
      assert.isFalse(rebuilt.inserted)
      assert.equal(rebuilt.canonicalHash, persisted.canonicalHash)
      assert.lengthOf(
        await db.from('verified_work_accomplishments').where('id', persisted.accomplishmentId),
        1
      )
    } finally {
      await db.from('task_completion_evidence_mappings').delete()
      await db.from('accomplishment_review_observation_links').delete()
      await cleanupTestData()
    }
  }).timeout(15_000)

  test('does not project a resolved task review before final board completion', async ({ assert }) => {
    try {
      const fixture = await createNativeProjectionFixture()
      await db.from('task_review_workflows').where('id', fixture.identity.reviewWorkflowId).update({
        status: 'resolved',
      })

      assert.isNull(await fixture.sourceReader.load(fixture.identity))
    } finally {
      await db.from('task_completion_evidence_mappings').delete()
      await db.from('accomplishment_review_observation_links').delete()
      await cleanupTestData()
    }
  }).timeout(15_000)

  test('fails closed when the current observation revision is frozen', async ({ assert }) => {
    try {
      const fixture = await createNativeProjectionFixture()
      await new ReviewObservationRepository().appendRevision({
        ...fixture.observationInput,
        observationId: fixture.persistedObservation.observationId,
        expectedRevisionNumber: 1,
        observation: {
          ...fixture.observation,
          id: randomUUID(),
          reviewRevision: fixture.observation.reviewRevision + 1,
          disposition: 'refine',
          rationale: 'The original observation is frozen while the dispute is reviewed.',
          supersedesObservationId: fixture.observation.id,
          governanceState: 'frozen',
          createdAt: '2026-08-08T09:00:00.000Z',
          finalizedAt: '2026-08-08T09:05:00.000Z',
        },
        disputeId: randomUUID(),
        disputeFrozenAt: '2026-08-08T09:05:00.000Z',
      })

      const loaded = await fixture.sourceReader.load(fixture.identity)
      assert.isNull(loaded)
    } finally {
      await db.from('task_completion_evidence_mappings').delete()
      await db.from('accomplishment_review_observation_links').delete()
      await cleanupTestData()
    }
  }).timeout(15_000)
})
