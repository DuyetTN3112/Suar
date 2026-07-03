import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { LucidProjectContextVersionRepository } from '#modules/projects/infra/adapters/project-context/lucid_project_context_version_repository'
import { LucidProjectTransactionRunner } from '#modules/projects/infra/adapters/project-context/lucid_project_transaction_runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, ProjectFactory } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

const HASH = `sha256:${'d'.repeat(64)}` as const

test.group('Integration | Project Context version repository', (group) => {
  const repository = new LucidProjectContextVersionRepository()
  const transactions = new LucidProjectTransactionRunner()

  group.setup(async () => {
    await setupApp()
  })
  group.each.teardown(async () => {
    await db.from('project_context_versions').delete()
    await cleanupTestData()
  })
  group.teardown(async () => teardownApp())

  test('TC-TVA-006 publishes and reads an active version through the public repository boundary', async ({
    assert,
  }) => {
    const organizationId = testId()
    const actorId = testId()
    const project = await ProjectFactory.create({ organization_id: organizationId })

    const created = await transactions.run(async (transaction) => {
      const scope = await repository.findScopeForUpdate(project.id, transaction)
      assert.isNull(scope.activeVersionId)
      assert.equal(scope.activeVersionNumber, 0)

      const version = await repository.createVersion(
        {
          projectId: project.id,
          organizationId,
          versionNumber: 1,
          title: 'Pre-order platform context',
          summary: 'Shared architecture and delivery constraints.',
          richContent: { type: 'document', text: 'Use OpenAPI 3.1.' },
          plainTextProjection: 'All mutating APIs require idempotency keys.',
          structuredDefaults: { environment: 'staging' },
          activeFrom: '2026-08-01T09:00:00.000Z',
          createdBy: actorId,
          confirmedBy: actorId,
          changeClass: 'initial',
          changeReason: 'Initial context',
          privacyClassification: 'internal',
          contentHash: HASH,
          sourceProvenance: {
            class: 'native_prework',
            sourceType: 'authored',
            sourceReferenceIds: [],
            confirmedBy: actorId,
            confirmedAt: '2026-08-01T09:00:00.000Z',
          },
        },
        transaction
      )
      assert.isTrue(
        await repository.activateVersion(
          {
            projectId: project.id,
            expectedActiveVersionId: null,
            nextVersionId: version.id,
          },
          transaction
        )
      )
      return version
    })

    const fact = await repository.findActiveFact(project.id)
    assert.equal(fact?.id, created.id)
    assert.equal(fact?.versionNumber, 1)
    assert.deepEqual(fact?.structuredDefaults, { environment: 'staging' })
    assert.equal(fact?.contentHash, HASH)
  })

  test('AR-018 stale activation returns false and the surrounding transaction can roll back the orphan version', async ({
    assert,
  }) => {
    const organizationId = testId()
    const actorId = testId()
    const project = await ProjectFactory.create({ organization_id: organizationId })

    await assert.rejects(
      () =>
        transactions.run(async (transaction) => {
          const version = await repository.createVersion(
            {
              projectId: project.id,
              organizationId,
              versionNumber: 1,
              title: 'Stale context',
              summary: 'Must roll back.',
              richContent: { type: 'document' },
              plainTextProjection: 'Local critical content.',
              structuredDefaults: {},
              activeFrom: '2026-08-01T09:00:00.000Z',
              createdBy: actorId,
              confirmedBy: actorId,
              changeClass: 'initial',
              changeReason: null,
              privacyClassification: 'internal',
              contentHash: HASH,
              sourceProvenance: {
                class: 'native_prework',
                sourceType: 'authored',
                sourceReferenceIds: [],
                confirmedBy: actorId,
                confirmedAt: '2026-08-01T09:00:00.000Z',
              },
            },
            transaction
          )
          const activated = await repository.activateVersion(
            {
              projectId: project.id,
              expectedActiveVersionId: testId(),
              nextVersionId: version.id,
            },
            transaction
          )
          assert.isFalse(activated)
          throw new Error('injected optimistic conflict rollback')
        }),
      /injected optimistic conflict rollback/
    )

    const count = (await db
      .from('project_context_versions')
      .where('project_id', project.id)
      .count('* as total')
      .first()) as { total?: string | number } | undefined
    assert.equal(Number(count?.['total'] ?? 0), 0)
    assert.isNull(await repository.findActiveFact(project.id))
  })
})
