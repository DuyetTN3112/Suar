import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import ProjectContextVersion from '#modules/projects/infra/models/project-context/project_context_version'
import WorkPackage from '#modules/projects/infra/models/work-package/work_package'
import WorkPackageVersion from '#modules/projects/infra/models/work-package/work_package_version'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, ProjectFactory } from '#tests/helpers/factories'

const CONTEXT_SCHEMA_VERSION = 'suar.project_context_version.v1' as const
const WORK_PACKAGE_SCHEMA_VERSION = 'suar.work_package.v1' as const
const WORK_PACKAGE_VERSION_SCHEMA_VERSION = 'suar.work_package_version.v1' as const
const CONTENT_HASH = `sha256:${'a'.repeat(64)}` as const

const sourceProvenance = (actorId: string) => ({
  class: 'native_prework' as const,
  sourceType: 'authored' as const,
  sourceReferenceIds: [] as string[],
  confirmedBy: actorId,
  confirmedAt: '2026-08-01T08:00:00.000Z',
})

async function tableExists(tableName: string): Promise<boolean> {
  const row = (await db
    .from('information_schema.tables')
    .select('table_name')
    .where('table_schema', 'public')
    .where('table_name', tableName)
    .first()) as { table_name?: string } | undefined

  return row?.table_name === tableName
}

async function cleanupProjectContextData(): Promise<void> {
  for (const tableName of ['work_package_versions', 'work_packages', 'project_context_versions']) {
    if (await tableExists(tableName)) {
      await db.from(tableName).delete()
    }
  }
  await cleanupTestData()
}

async function createContextVersion(input: {
  projectId: string
  organizationId: string
  actorId: string
  versionNumber?: number
  title?: string
}): Promise<ProjectContextVersion> {
  return ProjectContextVersion.create({
    schema_version: CONTEXT_SCHEMA_VERSION,
    organization_id: input.organizationId,
    project_id: input.projectId,
    version_number: input.versionNumber ?? 1,
    title: input.title ?? 'Pre-order platform context',
    summary: 'Shared architecture, security, and delivery defaults.',
    rich_content: {
      type: 'document',
      sections: [{ title: 'Architecture', text: 'Order and inventory services.' }],
    },
    plain_text_projection: 'Architecture: Order and inventory services.',
    structured_defaults: {
      environment: 'staging',
      standards: ['OpenAPI 3.1', 'idempotent commands'],
    },
    active_from: DateTime.fromISO('2026-08-01T08:00:00.000Z'),
    retired_at: null,
    created_by: input.actorId,
    confirmed_by: input.actorId,
    change_class: 'initial',
    change_reason: 'Initial confirmed project context',
    privacy_classification: 'internal',
    content_hash: CONTENT_HASH,
    source_provenance: sourceProvenance(input.actorId),
  })
}

async function createWorkPackage(input: {
  projectId: string
  organizationId: string
  actorId: string
  key?: string
}): Promise<WorkPackage> {
  return WorkPackage.create({
    schema_version: WORK_PACKAGE_SCHEMA_VERSION,
    organization_id: input.organizationId,
    project_id: input.projectId,
    key: input.key ?? `PREORDER-${randomUUID()}`,
    title: 'Pre-order API capability',
    summary: 'Design and implement the pre-order lifecycle API.',
    state: 'active',
    active_version_id: null,
    created_by: input.actorId,
    archived_at: null,
  })
}

async function createWorkPackageVersion(input: {
  workPackageId: string
  projectId: string
  projectContextVersionId: string | null
  actorId: string
  versionNumber?: number
  title?: string
}): Promise<WorkPackageVersion> {
  return WorkPackageVersion.create({
    schema_version: WORK_PACKAGE_VERSION_SCHEMA_VERSION,
    work_package_id: input.workPackageId,
    project_id: input.projectId,
    project_context_version_id: input.projectContextVersionId,
    version_number: input.versionNumber ?? 1,
    title: input.title ?? 'Pre-order API capability',
    summary: 'Shared feature behavior and integration constraints.',
    rich_content: {
      type: 'document',
      sections: [{ title: 'Lifecycle', text: 'Created, confirmed, cancelled.' }],
    },
    plain_text_projection: 'Lifecycle: Created, confirmed, cancelled.',
    structured_overrides: {
      systemArea: 'order-management',
      dependencies: ['inventory reservation'],
    },
    author_id: input.actorId,
    confirmed_by: input.actorId,
    change_class: 'initial',
    change_reason: 'Initial feature context',
    privacy_classification: 'internal',
    content_hash: CONTENT_HASH,
    source_provenance: sourceProvenance(input.actorId),
  })
}

test.group('Integration | Project Context persistence schema', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupProjectContextData())

  test('creates the version tables, active pointers, UUIDv7 defaults, and query indexes', async ({
    assert,
  }) => {
    const requiredColumns: Record<string, string[]> = {
      project_context_versions: [
        'schema_version',
        'organization_id',
        'project_id',
        'version_number',
        'rich_content',
        'structured_defaults',
        'active_from',
        'retired_at',
        'created_by',
        'confirmed_by',
        'privacy_classification',
        'content_hash',
        'source_provenance',
      ],
      work_packages: [
        'schema_version',
        'organization_id',
        'project_id',
        'key',
        'state',
        'active_version_id',
        'created_by',
        'archived_at',
      ],
      work_package_versions: [
        'schema_version',
        'work_package_id',
        'project_id',
        'project_context_version_id',
        'version_number',
        'rich_content',
        'structured_overrides',
        'author_id',
        'confirmed_by',
        'privacy_classification',
        'content_hash',
        'source_provenance',
      ],
    }

    for (const [tableName, columns] of Object.entries(requiredColumns)) {
      const rows = (await db
        .from('information_schema.columns')
        .select('column_name', 'column_default')
        .where('table_schema', 'public')
        .where('table_name', tableName)) as {
        column_name: string
        column_default: string | null
      }[]
      const columnNames = new Set(rows.map((row) => row.column_name))

      assert.isTrue(rows.length > 0, `Missing table ${tableName}`)
      for (const columnName of columns) {
        assert.isTrue(columnNames.has(columnName), `Missing ${tableName}.${columnName}`)
      }
      assert.include(
        rows.find((row) => row.column_name === 'id')?.column_default ?? '',
        'gen_random_uuid_v7()'
      )
    }

    const projectPointer = (await db
      .from('information_schema.columns')
      .select('column_name')
      .where('table_schema', 'public')
      .where('table_name', 'projects')
      .where('column_name', 'active_project_context_version_id')
      .first()) as { column_name?: string } | undefined
    assert.equal(projectPointer?.column_name, 'active_project_context_version_id')

    const indexes = (await db
      .from('pg_indexes')
      .select('indexname')
      .where('schemaname', 'public')
      .whereIn('tablename', [
        'projects',
        'project_context_versions',
        'work_packages',
        'work_package_versions',
      ])) as { indexname: string }[]
    const indexNames = new Set(indexes.map((row) => row.indexname))

    for (const indexName of [
      'idx_projects_active_project_context_version',
      'idx_project_context_versions_org_project',
      'idx_project_context_versions_active',
      'idx_work_packages_org_project_state',
      'idx_work_packages_active_version',
      'idx_work_package_versions_project_package',
      'idx_work_package_versions_context',
    ]) {
      assert.isTrue(indexNames.has(indexName), `Missing index ${indexName}`)
    }
  })

  test('round-trips versioned rich content, provenance, privacy, and nullable inheritance', async ({
    assert,
  }) => {
    const actorId = randomUUID()
    const organizationId = randomUUID()
    const project = await ProjectFactory.create({ organization_id: organizationId })
    const context = await createContextVersion({
      projectId: project.id,
      organizationId,
      actorId,
    })
    const workPackage = await createWorkPackage({
      projectId: project.id,
      organizationId,
      actorId,
    })
    const inheritedVersion = await createWorkPackageVersion({
      workPackageId: workPackage.id,
      projectId: project.id,
      projectContextVersionId: context.id,
      actorId,
    })

    await workPackage.merge({ active_version_id: inheritedVersion.id }).save()
    await db
      .from('projects')
      .where('id', project.id)
      .update({ active_project_context_version_id: context.id })

    await context.refresh()
    await workPackage.refresh()
    await inheritedVersion.refresh()

    assert.equal(context.id.at(14), '7')
    assert.equal(workPackage.id.at(14), '7')
    assert.equal(inheritedVersion.id.at(14), '7')
    assert.deepEqual(context.structured_defaults, {
      environment: 'staging',
      standards: ['OpenAPI 3.1', 'idempotent commands'],
    })
    assert.deepEqual(context.source_provenance, sourceProvenance(actorId))
    assert.equal(context.privacy_classification, 'internal')
    assert.equal(context.content_hash, CONTENT_HASH)
    assert.equal(workPackage.active_version_id, inheritedVersion.id)
    assert.equal(inheritedVersion.project_context_version_id, context.id)
    assert.deepEqual(inheritedVersion.structured_overrides, {
      systemArea: 'order-management',
      dependencies: ['inventory reservation'],
    })

    const projectRow = (await db
      .from('projects')
      .select('active_project_context_version_id')
      .where('id', project.id)
      .first()) as { active_project_context_version_id?: string } | undefined
    assert.equal(projectRow?.active_project_context_version_id, context.id)

    const standalonePackage = await createWorkPackage({
      projectId: project.id,
      organizationId,
      actorId,
    })
    const standaloneVersion = await createWorkPackageVersion({
      workPackageId: standalonePackage.id,
      projectId: project.id,
      projectContextVersionId: null,
      actorId,
    })
    assert.isNull(standaloneVersion.project_context_version_id)
  })

  test('rejects duplicate project and work-package version numbers', async ({ assert }) => {
    const actorId = randomUUID()
    const organizationId = randomUUID()
    const project = await ProjectFactory.create({ organization_id: organizationId })
    const context = await createContextVersion({
      projectId: project.id,
      organizationId,
      actorId,
      versionNumber: 1,
    })

    await assert.rejects(
      () =>
        createContextVersion({
          projectId: project.id,
          organizationId,
          actorId,
          versionNumber: 1,
          title: 'Duplicate context version',
        }),
      /duplicate key|unique constraint/i
    )

    const workPackage = await createWorkPackage({
      projectId: project.id,
      organizationId,
      actorId,
    })
    await createWorkPackageVersion({
      workPackageId: workPackage.id,
      projectId: project.id,
      projectContextVersionId: context.id,
      actorId,
      versionNumber: 1,
    })

    await assert.rejects(
      () =>
        createWorkPackageVersion({
          workPackageId: workPackage.id,
          projectId: project.id,
          projectContextVersionId: context.id,
          actorId,
          versionNumber: 1,
          title: 'Duplicate package version',
        }),
      /duplicate key|unique constraint/i
    )
  })

  test('keeps historical version rows immutable through the canonical model write path', async ({
    assert,
  }) => {
    const actorId = randomUUID()
    const organizationId = randomUUID()
    const project = await ProjectFactory.create({ organization_id: organizationId })
    const context = await createContextVersion({ projectId: project.id, organizationId, actorId })
    const workPackage = await createWorkPackage({
      projectId: project.id,
      organizationId,
      actorId,
    })
    const workPackageVersion = await createWorkPackageVersion({
      workPackageId: workPackage.id,
      projectId: project.id,
      projectContextVersionId: context.id,
      actorId,
    })

    context.title = 'Mutated context'
    await assert.rejects(
      () => context.save(),
      /Project Context versions are immutable; create a new version instead/
    )
    workPackageVersion.title = 'Mutated package'
    await assert.rejects(
      () => workPackageVersion.save(),
      /Work Package versions are immutable; create a new version instead/
    )

    const persistedContext = await ProjectContextVersion.findOrFail(context.id)
    const persistedWorkPackageVersion = await WorkPackageVersion.findOrFail(workPackageVersion.id)
    assert.equal(persistedContext.title, 'Pre-order platform context')
    assert.equal(persistedWorkPackageVersion.title, 'Pre-order API capability')
  })

  test('rolls back new versions and both active pointers when publication fails', async ({
    assert,
  }) => {
    const actorId = randomUUID()
    const organizationId = randomUUID()
    const project = await ProjectFactory.create({ organization_id: organizationId })
    const contextV1 = await createContextVersion({
      projectId: project.id,
      organizationId,
      actorId,
      versionNumber: 1,
    })
    const workPackage = await createWorkPackage({
      projectId: project.id,
      organizationId,
      actorId,
    })
    const packageV1 = await createWorkPackageVersion({
      workPackageId: workPackage.id,
      projectId: project.id,
      projectContextVersionId: contextV1.id,
      actorId,
      versionNumber: 1,
    })
    await workPackage.merge({ active_version_id: packageV1.id }).save()
    await db
      .from('projects')
      .where('id', project.id)
      .update({ active_project_context_version_id: contextV1.id })

    await assert.rejects(
      () =>
        db.transaction(async (trx) => {
          const [contextV2] = (await trx
            .table('project_context_versions')
            .insert({
              schema_version: CONTEXT_SCHEMA_VERSION,
              organization_id: organizationId,
              project_id: project.id,
              version_number: 2,
              title: 'Context v2',
              summary: '',
              rich_content: JSON.stringify({ type: 'document' }),
              plain_text_projection: '',
              structured_defaults: JSON.stringify({}),
              active_from: DateTime.utc().toSQL(),
              created_by: actorId,
              change_class: 'material_scope',
              privacy_classification: 'internal',
              content_hash: `sha256:${'b'.repeat(64)}`,
              source_provenance: JSON.stringify(sourceProvenance(actorId)),
            })
            .returning('id')) as { id: string }[]
          const [packageV2] = (await trx
            .table('work_package_versions')
            .insert({
              schema_version: WORK_PACKAGE_VERSION_SCHEMA_VERSION,
              work_package_id: workPackage.id,
              project_id: project.id,
              project_context_version_id: contextV2?.id,
              version_number: 2,
              title: 'Package v2',
              summary: '',
              rich_content: JSON.stringify({ type: 'document' }),
              plain_text_projection: '',
              structured_overrides: JSON.stringify({}),
              author_id: actorId,
              change_class: 'material_scope',
              privacy_classification: 'internal',
              content_hash: `sha256:${'c'.repeat(64)}`,
              source_provenance: JSON.stringify(sourceProvenance(actorId)),
            })
            .returning('id')) as { id: string }[]

          await trx
            .from('projects')
            .where('id', project.id)
            .update({ active_project_context_version_id: contextV2?.id })
          await trx
            .from('work_packages')
            .where('id', workPackage.id)
            .update({ active_version_id: packageV2?.id })

          throw new Error('injected publication failure')
        }),
      /injected publication failure/
    )

    const projectAfter = (await db
      .from('projects')
      .select('active_project_context_version_id')
      .where('id', project.id)
      .first()) as { active_project_context_version_id?: string } | undefined
    const packageAfter = await WorkPackage.findOrFail(workPackage.id)
    const contextV2Count = (await db
      .from('project_context_versions')
      .where('project_id', project.id)
      .where('version_number', 2)
      .count('* as total')
      .first()) as { total?: number | string } | undefined
    const packageV2Count = (await db
      .from('work_package_versions')
      .where('work_package_id', workPackage.id)
      .where('version_number', 2)
      .count('* as total')
      .first()) as { total?: number | string } | undefined

    assert.equal(projectAfter?.active_project_context_version_id, contextV1.id)
    assert.equal(packageAfter.active_version_id, packageV1.id)
    assert.equal(Number(contextV2Count?.total ?? 0), 0)
    assert.equal(Number(packageV2Count?.total ?? 0), 0)
  })
})
