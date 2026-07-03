import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { LucidProjectContextFactReader } from '#modules/projects/infra/adapters/project-context/lucid_project_context_fact_reader'
import ProjectContextVersion from '#modules/projects/infra/models/project-context/project_context_version'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, ProjectFactory } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Project Context public fact reader', (group) => {
  const reader = new LucidProjectContextFactReader()

  group.setup(async () => {
    await setupApp()
  })
  group.each.teardown(async () => {
    await db.from('project_context_versions').delete()
    await cleanupTestData()
  })
  group.teardown(async () => teardownApp())

  test('TC-TVA-006 returns the pinned active version without exposing a Project infra model', async ({
    assert,
  }) => {
    const organizationId = testId()
    const actorId = testId()
    const project = await ProjectFactory.create({ organization_id: organizationId })
    const version = await ProjectContextVersion.create({
      schema_version: 'suar.project_context_version.v1',
      organization_id: organizationId,
      project_id: project.id,
      version_number: 1,
      title: 'Pre-order platform context',
      summary: 'Shared architecture constraints.',
      rich_content: { type: 'document' },
      plain_text_projection: 'Use OpenAPI 3.1 and idempotency keys.',
      structured_defaults: { environment: 'staging' },
      active_from: DateTime.fromISO('2026-08-01T09:00:00.000Z'),
      retired_at: null,
      created_by: actorId,
      confirmed_by: actorId,
      change_class: 'initial',
      change_reason: 'Initial context',
      privacy_classification: 'internal',
      content_hash: `sha256:${'e'.repeat(64)}`,
      source_provenance: {
        class: 'native_prework',
        sourceType: 'authored',
        sourceReferenceIds: [],
        confirmedBy: actorId,
        confirmedAt: '2026-08-01T09:00:00.000Z',
      },
    })
    await db
      .from('projects')
      .where('id', project.id)
      .update({ active_project_context_version_id: version.id })

    const fact = await reader.readProjectContextFact({ projectId: project.id, organizationId })

    assert.equal(fact?.schemaVersion, 'suar.project_context_fact.v1')
    assert.equal(fact?.activeVersionId, version.id)
    assert.equal(fact?.versionToken, `${project.id}:context:1`)
    assert.equal(fact?.context?.plainTextProjection, 'Use OpenAPI 3.1 and idempotency keys.')
    assert.notProperty(fact?.context ?? {}, '$trx')
  })

  test('AR-012 returns an honest empty fact but denies a cross-organization lookup', async ({
    assert,
  }) => {
    const organizationId = testId()
    const project = await ProjectFactory.create({ organization_id: organizationId })

    const emptyFact = await reader.readProjectContextFact({
      projectId: project.id,
      organizationId,
    })
    const foreignFact = await reader.readProjectContextFact({
      projectId: project.id,
      organizationId: testId(),
    })

    assert.equal(emptyFact?.activeVersionNumber, 0)
    assert.equal(emptyFact?.versionToken, `${project.id}:context:0`)
    assert.isNull(emptyFact?.context ?? null)
    assert.isNull(foreignFact)
  })
})
