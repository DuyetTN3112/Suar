import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { LucidProjectTransactionRunner } from '#modules/projects/infra/adapters/project-context/lucid_project_transaction_runner'
import { LucidWorkPackageFactReader } from '#modules/projects/infra/adapters/work-package/lucid_work_package_fact_reader'
import { LucidWorkPackageRepository } from '#modules/projects/infra/adapters/work-package/lucid_work_package_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, ProjectFactory } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Work Package repository and public fact reader', (group) => {
  const transactions = new LucidProjectTransactionRunner()
  const repository = new LucidWorkPackageRepository()
  const factReader = new LucidWorkPackageFactReader()

  group.setup(async () => {
    await setupApp()
  })
  group.each.teardown(async () => {
    await db.from('work_package_versions').delete()
    await db.from('work_packages').delete()
    await db.from('project_context_versions').delete()
    await cleanupTestData()
  })
  group.teardown(async () => teardownApp())

  test('creates, versions, optimistically activates, archives, and preserves immutable history', async ({
    assert,
  }) => {
    const organizationId = testId()
    const actorId = testId()
    const project = await ProjectFactory.create({ organization_id: organizationId })
    const contextVersionId = testId()
    await db.table('project_context_versions').insert({
      id: contextVersionId,
      organization_id: organizationId,
      project_id: project.id,
      version_number: 1,
      title: 'Shared project context',
      summary: 'Shared context',
      rich_content: {},
      plain_text_projection: 'Shared local requirements.',
      structured_defaults: {},
      created_by: actorId,
      confirmed_by: actorId,
      change_class: 'initial',
      privacy_classification: 'internal',
      content_hash: `sha256:${'a'.repeat(64)}`,
      source_provenance: {},
    })

    const result = await transactions.run(async (transaction) => {
      const projectScope = await repository.findProjectScopeForUpdate(project.id, transaction)
      const contextVisible = await repository.isProjectContextVersionVisible(
        { versionId: contextVersionId, projectId: project.id, organizationId },
        transaction
      )
      const workPackage = await repository.createPackage(
        {
          projectId: project.id,
          organizationId,
          key: 'PREORDER',
          title: 'Pre-order lifecycle',
          summary: 'Shared feature context.',
          createdBy: actorId,
        },
        transaction
      )
      const version = await repository.createVersion(
        {
          workPackageId: workPackage.id,
          projectId: project.id,
          projectContextVersionId: contextVersionId,
          versionNumber: 1,
          title: 'Pre-order lifecycle',
          summary: 'Shared feature context.',
          richContent: { type: 'document' },
          plainTextProjection: 'Reserve inventory before payment authorization.',
          structuredOverrides: { environment: 'staging' },
          authorId: actorId,
          confirmedBy: actorId,
          changeClass: 'initial',
          changeReason: 'Initial package',
          privacyClassification: 'internal',
          contentHash: `sha256:${'b'.repeat(64)}`,
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
          workPackageId: workPackage.id,
          expectedActiveVersionId: null,
          nextVersionId: version.id,
          title: version.title,
          summary: version.summary,
        },
        transaction
      )
      const staleActivation = await repository.activateVersion(
        {
          workPackageId: workPackage.id,
          expectedActiveVersionId: null,
          nextVersionId: testId(),
          title: version.title,
          summary: version.summary,
        },
        transaction
      )
      const activeScope = await repository.findPackageScopeForUpdate(workPackage.id, transaction)
      const archived = await repository.archive(
        {
          workPackageId: workPackage.id,
          expectedActiveVersionId: version.id,
          archivedAt: '2026-08-01T10:00:00.000Z',
        },
        transaction
      )
      return {
        projectScope,
        contextVisible,
        workPackage,
        version,
        activated,
        staleActivation,
        activeScope,
        archived,
      }
    })

    assert.equal(result.projectScope.organizationId, organizationId)
    assert.isTrue(result.contextVisible)
    assert.isTrue(result.activated)
    assert.isFalse(result.staleActivation)
    assert.equal(result.activeScope.activeVersionId, result.version.id)
    assert.equal(result.activeScope.activeVersionNumber, 1)
    assert.isTrue(result.archived)
    const versionCount = (await db
      .from('work_package_versions')
      .where('work_package_id', result.workPackage.id)
      .count('* as total')
      .first()) as { total: string | number } | undefined
    assert.equal(Number(versionCount?.total), 1)

    const fact = await factReader.readWorkPackageFact({
      workPackageId: result.workPackage.id,
      projectId: project.id,
      organizationId,
    })
    assert.equal(fact?.workPackage.state, 'archived')
    assert.equal(fact?.activeVersion?.id, result.version.id)
    assert.equal(
      fact?.versionToken,
      `${project.id}:work-package:${result.workPackage.id}:1:archived`
    )
    assert.equal(fact?.activeVersion?.structuredOverrides['environment'], 'staging')
  })

  test('public fact reader and pinned context checks fail closed across tenant/project scope', async ({
    assert,
  }) => {
    const organizationId = testId()
    const project = await ProjectFactory.create({ organization_id: organizationId })

    const missing = await factReader.readWorkPackageFact({
      workPackageId: testId(),
      projectId: project.id,
      organizationId,
    })
    const wrongTenant = await factReader.readWorkPackageFact({
      workPackageId: testId(),
      projectId: project.id,
      organizationId: testId(),
    })

    assert.isNull(missing)
    assert.isNull(wrongTenant)
  })

  test('lists active packages in stable order, omits archived packages, and keeps unversioned packages visible', async ({
    assert,
  }) => {
    const organizationId = testId()
    const actorId = testId()
    const project = await ProjectFactory.create({ organization_id: organizationId })

    const readyPackage = await transactions.run(async (transaction) => {
      const workPackage = await repository.createPackage(
        {
          projectId: project.id,
          organizationId,
          key: 'READY',
          title: 'Ready package',
          summary: 'Has an active version.',
          createdBy: actorId,
        },
        transaction
      )
      const version = await repository.createVersion(
        {
          workPackageId: workPackage.id,
          projectId: project.id,
          projectContextVersionId: null,
          versionNumber: 1,
          title: 'Ready package v1',
          summary: 'Has an active version.',
          richContent: {},
          plainTextProjection: 'Ready package.',
          structuredOverrides: {},
          authorId: actorId,
          confirmedBy: actorId,
          changeClass: 'initial',
          changeReason: null,
          privacyClassification: 'internal',
          contentHash: `sha256:${'c'.repeat(64)}`,
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
      await repository.activateVersion(
        {
          workPackageId: workPackage.id,
          expectedActiveVersionId: null,
          nextVersionId: version.id,
          title: version.title,
          summary: version.summary,
        },
        transaction
      )
      return workPackage
    })

    const unversionedPackage = await transactions.run((transaction) =>
      repository.createPackage(
        {
          projectId: project.id,
          organizationId,
          key: 'DRAFT',
          title: 'Draft package',
          summary: 'No active version yet.',
          createdBy: actorId,
        },
        transaction
      )
    )
    const archivedPackage = await transactions.run((transaction) =>
      repository.createPackage(
        {
          projectId: project.id,
          organizationId,
          key: 'ARCHIVED',
          title: 'Archived package',
          summary: 'Should not be listed.',
          createdBy: actorId,
        },
        transaction
      )
    )
    await transactions.run((transaction) =>
      repository.archive(
        {
          workPackageId: archivedPackage.id,
          expectedActiveVersionId: null,
          archivedAt: '2026-08-01T10:00:00.000Z',
        },
        transaction
      )
    )

    const listed = await factReader.listActiveWorkPackageFacts({
      projectId: project.id,
      organizationId,
    })

    assert.deepEqual(
      listed.map((fact) => fact.workPackage.key),
      [unversionedPackage.key, readyPackage.key]
    )
    assert.isNull(listed[0]?.activeVersion)
    assert.equal(listed[1]?.activeVersion?.versionNumber, 1)
  })
})
