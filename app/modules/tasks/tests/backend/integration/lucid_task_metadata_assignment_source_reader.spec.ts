import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import type { TaskMetadataTaxonomyVersionReader } from '#modules/tasks/actions/ports/outbound/task_metadata_assignment_source_reader'
import { LucidTaskMetadataAssignmentSourceReader } from '#modules/tasks/infra/adapters/task-assignment/lucid_task_metadata_assignment_source_reader'
import TaskRequiredSkill from '#modules/tasks/infra/models/task-requirements/task_required_skill'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  SkillFactory,
  TaskFactory,
} from '#tests/helpers/factories'

const versions: TaskMetadataTaxonomyVersionReader = {
  getVersions: (namespaces) =>
    Promise.resolve({
      taxonomyVersions: Object.fromEntries(
        namespaces.map((namespace, index) => [namespace, index + 10])
      ),
      enrichmentVersions: { technologies: 3 },
    }),
}

test.group('Integration | Lucid task metadata assignment source reader', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('reads all persisted canonical sources and applies public/private visibility in SQL', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const publicTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'external',
    })
    const privateTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'internal',
    })
    const [typescript, postgresql] = await Promise.all([
      SkillFactory.create({ skill_name: 'TypeScript' }),
      SkillFactory.create({ skill_name: 'PostgreSQL' }),
    ])
    publicTask.merge({
      business_domain: 'data_platform',
      problem_category: 'new_capability',
      task_type: 'feature_development',
      tech_stack: ['TypeScript', 'PostgreSQL', 'TypeScript'],
      domain_tags: ['Payments', 'payments'],
    })
    privateTask.merge({
      task_type: 'api_design',
      tech_stack: ['SecretDB'],
      domain_tags: ['confidential'],
    })
    await Promise.all([publicTask.save(), privateTask.save()])
    await TaskRequiredSkill.createMany([
      {
        id: randomUUID(),
        task_id: publicTask.id,
        skill_id: typescript.id,
        project_skill_id: null,
        source_project_professional_role_id: null,
        source_role_skill_id: null,
        minimum_level_id: null,
        target_level_id: null,
        assessment_ceiling_level_id: null,
        rubric_version_id: null,
        required_public_proficiency_code: 'l7',
        proficiency_level_id: null,
        is_mandatory: true,
        importance: 'high',
        weight: 1,
        requirement_source: 'manual',
        requirement_notes: null,
      },
      {
        id: randomUUID(),
        task_id: publicTask.id,
        skill_id: postgresql.id,
        project_skill_id: null,
        source_project_professional_role_id: null,
        source_role_skill_id: null,
        minimum_level_id: null,
        target_level_id: null,
        assessment_ceiling_level_id: null,
        rubric_version_id: null,
        required_public_proficiency_code: 'l6',
        proficiency_level_id: null,
        is_mandatory: false,
        importance: 'medium',
        weight: 0.5,
        requirement_source: 'imported_legacy',
        requirement_notes: null,
      },
    ])
    const reader = new LucidTaskMetadataAssignmentSourceReader(versions)

    const publicOnly = await reader.loadVisibleTaskMetadata({
      entityIds: [publicTask.id, privateTask.id],
    })
    const authorized = await reader.loadVisibleTaskMetadata(
      { entityIds: [publicTask.id, privateTask.id] },
      { attributes: { authorizedTaskIds: [privateTask.id] } }
    )

    assert.deepEqual(
      publicOnly.map(({ entityId }) => entityId),
      [publicTask.id]
    )
    assert.deepEqual(
      authorized.map(({ entityId }) => entityId).sort(),
      [privateTask.id, publicTask.id].sort()
    )
    const publicSource = publicOnly[0]
    assert.deepEqual(
      publicSource?.namespaces
        .find(({ namespace }) => namespace === 'skills')
        ?.assignments.map(({ termId, provenance, reviewState }) => ({
          termId,
          provenance,
          reviewState,
        })),
      [
        { termId: typescript.id, provenance: 'explicit', reviewState: 'reviewed' },
        { termId: postgresql.id, provenance: 'imported', reviewState: 'reviewed' },
      ]
    )
    assert.deepEqual(
      publicSource?.namespaces
        .find(({ namespace }) => namespace === 'technologies')
        ?.assignments.map(({ termId }) => termId),
      ['TypeScript', 'PostgreSQL', 'TypeScript']
    )
    assert.deepEqual(
      publicSource?.freeFormTags.map(({ value }) => value),
      ['Payments', 'payments']
    )
    assert.notInclude(JSON.stringify(publicOnly), 'SecretDB')
  })

  test('preserves scalar missing versus explicit-empty arrays and version channels', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const missingTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'external',
    })
    const emptyTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'external',
    })
    await db
      .from('tasks')
      .where('id', missingTask.id)
      .update({
        business_domain: null,
        problem_category: null,
        tech_stack: JSON.stringify([]),
        domain_tags: JSON.stringify([]),
      })
    await db
      .from('tasks')
      .where('id', emptyTask.id)
      .update({
        business_domain: null,
        problem_category: null,
        tech_stack: JSON.stringify([]),
        domain_tags: JSON.stringify([]),
      })
    const reader = new LucidTaskMetadataAssignmentSourceReader(versions)

    const sources = await reader.loadVisibleTaskMetadata({
      entityIds: [missingTask.id, emptyTask.id],
    })
    const missing = sources.find(({ entityId }) => entityId === missingTask.id)
    const empty = sources.find(({ entityId }) => entityId === emptyTask.id)

    assert.equal(
      empty?.namespaces.find(({ namespace }) => namespace === 'technologies')?.state,
      'known_absent'
    )
    assert.equal(
      missing?.namespaces.find(({ namespace }) => namespace === 'skills')?.state,
      'missing'
    )
    assert.equal(
      missing?.namespaces.find(({ namespace }) => namespace === 'business-domains')?.state,
      'missing'
    )
    assert.equal(
      missing?.namespaces.find(({ namespace }) => namespace === 'technologies')?.enrichmentVersion,
      3
    )
  })

  test('changes source revision when projected metadata changes within the same task timestamp', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'external',
    })
    const reader = new LucidTaskMetadataAssignmentSourceReader(versions)

    await db
      .from('tasks')
      .where('id', task.id)
      .update({ tech_stack: JSON.stringify(['PostgreSQL']) })
    const before = await reader.loadVisibleTaskMetadata({ entityIds: [task.id] })
    await db
      .from('tasks')
      .where('id', task.id)
      .update({ tech_stack: JSON.stringify(['PostgreSQL', 'Redis']) })
    const after = await reader.loadVisibleTaskMetadata({ entityIds: [task.id] })

    assert.equal(
      before[0]?.namespaces.find(({ namespace }) => namespace === 'technologies')?.assignments
        .length,
      1
    )
    assert.equal(
      after[0]?.namespaces.find(({ namespace }) => namespace === 'technologies')?.assignments
        .length,
      2
    )
    assert.notEqual(before[0]?.sourceRevision, after[0]?.sourceRevision)
  })
})
