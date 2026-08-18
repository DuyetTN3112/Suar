import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { LucidTaskAuthoringInheritanceFactReader } from '#modules/projects/infra/adapters/work-package/lucid_task_authoring_inheritance_fact_reader'
import { LucidTaskAuthoringInheritanceReader } from '#modules/tasks/infra/adapters/task-authoring/lucid_task_authoring_inheritance_reader'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const hash = (character: string) => `sha256:${character.repeat(64)}`
const cleanupIds = new Set<string>()

async function cleanup(): Promise<void> {
  if (cleanupIds.size === 0) return
  const ids = [...cleanupIds]
  await db.from('work_package_versions').whereIn('id', ids).delete()
  await db.from('work_packages').whereIn('id', ids).delete()
  await db.from('project_context_versions').whereIn('id', ids).delete()
  cleanupIds.clear()
}

test.group('Lucid Task authoring inheritance reader', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.each.teardown(() => cleanup())
  group.teardown(() => teardownApp())

  test('reads exact Project Context and Work Package pins without leaking another tenant', async ({
    assert,
  }) => {
    const organizationId = randomUUID()
    const projectId = randomUUID()
    const actorId = randomUUID()
    const contextVersionId = randomUUID()
    const workPackageId = randomUUID()
    const workPackageVersionId = randomUUID()
    cleanupIds.add(contextVersionId)
    cleanupIds.add(workPackageId)
    cleanupIds.add(workPackageVersionId)

    await db.table('project_context_versions').insert({
      id: contextVersionId,
      schema_version: 'suar.project_context_version.v1',
      organization_id: organizationId,
      project_id: projectId,
      version_number: 1,
      title: 'Order platform context',
      summary: 'Shared platform defaults.',
      rich_content: { type: 'doc', content: [] },
      plain_text_projection: 'Shared platform defaults.',
      structured_defaults: {
        workContract: {
          action: 'Design and implement',
          environment: 'production-like staging',
        },
      },
      active_from: new Date('2026-08-01T08:00:00.000Z'),
      retired_at: null,
      created_by: actorId,
      confirmed_by: actorId,
      change_class: 'initial',
      change_reason: null,
      privacy_classification: 'internal',
      content_hash: hash('a'),
      source_provenance: {
        class: 'native_prework',
        sourceType: 'authored',
        sourceReferenceIds: [],
        confirmedBy: actorId,
        confirmedAt: '2026-08-01T08:00:00.000Z',
      },
    })
    await db.table('work_packages').insert({
      id: workPackageId,
      schema_version: 'suar.work_package.v1',
      organization_id: organizationId,
      project_id: projectId,
      key: 'PREORDER-API',
      title: 'Pre-order API package',
      summary: 'Order API scope.',
      state: 'active',
      active_version_id: workPackageVersionId,
      created_by: actorId,
    })
    await db.table('work_package_versions').insert({
      id: workPackageVersionId,
      schema_version: 'suar.work_package_version.v1',
      work_package_id: workPackageId,
      project_id: projectId,
      project_context_version_id: contextVersionId,
      version_number: 1,
      title: 'Pre-order API package v1',
      summary: 'Order API override.',
      rich_content: { type: 'doc', content: [] },
      plain_text_projection: 'Order API override.',
      structured_overrides: {
        workContract: {
          object: 'pre-order API',
          impactScope: { modules: ['orders'] },
        },
      },
      author_id: actorId,
      confirmed_by: actorId,
      change_class: 'initial',
      change_reason: null,
      privacy_classification: 'confidential',
      content_hash: hash('b'),
      source_provenance: {
        class: 'native_prework',
        sourceType: 'authored',
        sourceReferenceIds: [],
        confirmedBy: actorId,
        confirmedAt: '2026-08-01T08:00:00.000Z',
      },
    })

    const reader = new LucidTaskAuthoringInheritanceReader(
      new LucidTaskAuthoringInheritanceFactReader()
    )
    const allowed = await reader.readExactPins({
      organizationId,
      projectId,
      projectContextVersionId: contextVersionId,
      workPackageVersionId,
    })
    const denied = await reader.readExactPins({
      organizationId: randomUUID(),
      projectId,
      projectContextVersionId: contextVersionId,
      workPackageVersionId,
    })

    assert.equal(allowed.projectContext?.values.action, 'Design and implement')
    assert.equal(allowed.projectContext?.values.environment, 'production-like staging')
    assert.equal(allowed.workPackage?.values.object, 'pre-order API')
    assert.equal(allowed.workPackage?.privacyClassification, 'confidential')
    assert.deepEqual(allowed.findings, [])
    assert.isNull(denied.projectContext)
    assert.isNull(denied.workPackage)
    assert.includeMembers(
      denied.findings.map((finding) => finding.code),
      [
        'TVA.RESOLUTION.PROJECT_CONTEXT_PIN_FORBIDDEN',
        'TVA.RESOLUTION.WORK_PACKAGE_PIN_FORBIDDEN',
      ]
    )
  })
})
