import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { TaskSkillReaderAdapter } from '#composition/adapters/tasks/task_skill_reader_adapter'
import { taskSearchDocumentReader } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { TASK_METADATA_CANONICAL_NAMESPACES } from '#modules/tasks/actions/ports/outbound/task_metadata_assignment_source_reader'
import { LucidTaskSearchDocumentReader } from '#modules/tasks/infra/adapters/task-reading/lucid_task_search_document_reader'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import {
  cleanupTaskSearchDocData,
  CountingTaskSkillReader,
  setupTaskSearchDocGroup,
  teardownTaskSearchDocGroup,
} from '#modules/tasks/tests/backend/support/task-search/task_search_document_test_support'
import type { MetadataAssignmentProvider } from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'
import {
  OrganizationFactory,
  SkillFactory,
  TaskFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Task Search Document Reader - Skills and Composition', (group) => {
  group.setup(() => setupTaskSearchDocGroup())
  group.teardown(() => teardownTaskSearchDocGroup())
  group.each.teardown(() => cleanupTaskSearchDocData())

  test('preserves requirement order and duplicates when bulk skill facts arrive reversed', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Search boundary task',
    })
    const activeSkill = await SkillFactory.create({
      skill_name: 'TypeScript',
      category_code: 'technology',
      is_active: true,
    })
    const inactiveSkill = await SkillFactory.create({
      skill_name: 'Legacy Systems',
      category_code: 'engineering',
      is_active: false,
    })

    task.required_skills_rel = [
      {
        skill_id: activeSkill.id,
      },
      {
        skill_id: inactiveSkill.id,
      },
      {
        skill_id: activeSkill.id,
      },
    ] as typeof task.required_skills_rel

    const originalTaskQuery = Task.query.bind(Task) as typeof Task.query
    const fakeTaskQuery = {
      where: () => fakeTaskQuery,
      preload: () => fakeTaskQuery,
      firstOrFail: () => Promise.resolve(task),
    }
    Task.query = (() => fakeTaskQuery) as unknown as typeof Task.query

    const skillReader = new CountingTaskSkillReader((skills) => skills.reverse())
    const reader = new LucidTaskSearchDocumentReader(skillReader)

    try {
      const record = await reader.findTaskSearchDocumentRecord(task.id)

      assert.lengthOf(skillReader.requestedSkillIdBatches, 1)
      assert.deepEqual(skillReader.requestedSkillIdBatches[0], [activeSkill.id, inactiveSkill.id])
      assert.deepEqual(record.requiredSkills, [
        { skillId: activeSkill.id, skillName: 'TypeScript', categoryCode: 'technology' },
        {
          skillId: inactiveSkill.id,
          skillName: 'Legacy Systems',
          categoryCode: 'engineering',
        },
        { skillId: activeSkill.id, skillName: 'TypeScript', categoryCode: 'technology' },
      ])
    } finally {
      Task.query = originalTaskQuery
    }
  })

  test('rejects a partial search document when a required skill fact is missing', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Incomplete search boundary task',
    })
    const availableSkill = await SkillFactory.create({
      skill_name: 'Available Skill',
      is_active: true,
    })
    const missingSkill = await SkillFactory.create({
      skill_name: 'Missing Skill',
      is_active: true,
    })

    await db.table('task_required_skills').insert([
      {
        id: testId(),
        task_id: task.id,
        skill_id: availableSkill.id,
        required_public_proficiency_code: 'l7',
        is_mandatory: true,
        importance: 'high',
        weight: 2,
        requirement_source: 'manual',
        requirement_notes: null,
      },
      {
        id: testId(),
        task_id: task.id,
        skill_id: missingSkill.id,
        required_public_proficiency_code: 'l5',
        is_mandatory: false,
        importance: 'medium',
        weight: 1,
        requirement_source: 'manual',
        requirement_notes: null,
      },
    ])

    const skillReader = new CountingTaskSkillReader((skills) =>
      skills.filter((skill) => skill.id !== missingSkill.id)
    )
    const reader = new LucidTaskSearchDocumentReader(skillReader)

    let thrown: unknown
    try {
      await reader.findTaskSearchDocumentRecord(task.id)
    } catch (error) {
      thrown = error
    }

    assert.instanceOf(thrown, InvariantViolationException)
    assert.match(
      (thrown as Error).message,
      new RegExp(`missing required skill facts.*${missingSkill.id}`)
    )
    assert.lengthOf(skillReader.requestedSkillIdBatches, 1)
    assert.sameMembers(skillReader.requestedSkillIdBatches[0] ?? [], [
      availableSkill.id,
      missingSkill.id,
    ])
  })

  test('projects canonical skills metadata when the provider is explicitly composed', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Canonical skills search task',
    })
    const skill = await SkillFactory.create({
      skill_name: 'TypeScript',
      category_code: 'technology',
    })

    task.required_skills_rel = [{ skill_id: skill.id }] as typeof task.required_skills_rel

    const provider: MetadataAssignmentProvider = {
      getAssignments(query, accessContext) {
        assert.deepEqual(query, {
          resource: 'task',
          entityIds: [task.id],
          namespaces: TASK_METADATA_CANONICAL_NAMESPACES,
        })
        assert.deepEqual(accessContext?.attributes?.['authorizedTaskIds'], [task.id])
        return Promise.resolve({
          assignments: [
            {
              resource: 'task',
              entityId: task.id,
              term: { namespace: 'skills', termId: skill.id },
              provenance: 'explicit',
              reviewState: 'reviewed',
              sourceType: 'task_required_skill',
              taxonomyVersion: 7,
            },
          ],
          freeFormTags: [],
          taxonomyVersions: { skills: 7 },
          diagnostics: [],
        })
      },
    }

    const reader = new LucidTaskSearchDocumentReader(new TaskSkillReaderAdapter(), provider)
    const record = await reader.findTaskSearchDocumentRecord(task.id)

    assert.deepEqual(record.canonicalMetadata, {
      canonical_term_ids: [`skills:${skill.id}`],
      canonical_term_ids_known: true,
      canonical_term_ids_count: 1,
      canonical_term_ids_by_namespace: { skills: [`skills:${skill.id}`] },
      assignment_provenance: ['explicit'],
      assignment_review_states: ['reviewed'],
      taxonomy_versions: ['skills:7'],
      taxonomy_versions_by_namespace: { skills: 7 },
      taxonomy_completeness: [],
      taxonomy_completeness_by_namespace: {},
      metadata_assignment_schema_version: 1,
      metadata_source_revisions: [],
      metadata_enrichment_versions_by_namespace: {},
    })
  })

  test('production composition supplies canonical skills metadata to the Search reader', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Composed canonical skills search task',
    })
    const skill = await SkillFactory.create({
      skill_name: 'Search Relevance',
      category_code: 'engineering',
    })
    await db.table('task_required_skills').insert({
      id: testId(),
      task_id: task.id,
      skill_id: skill.id,
      required_public_proficiency_code: 'l5',
      is_mandatory: true,
      importance: 'high',
      weight: 1,
      requirement_source: 'manual',
      requirement_notes: null,
    })

    await db
      .from('task_metadata_taxonomy_revisions')
      .whereIn('namespace', ['business-domains', 'problem-categories', 'task-types', 'technologies'])
      .delete()
    await db.table('task_metadata_taxonomy_revisions').insert(
      ['business-domains', 'problem-categories', 'task-types', 'technologies'].map((namespace) => ({
        namespace,
        revision: 1,
        source_fingerprint: 'a'.repeat(64),
      }))
    )

    try {
      const record = await taskSearchDocumentReader.findTaskSearchDocumentRecord(task.id)
      const canonicalMetadata = record.canonicalMetadata

      if (!canonicalMetadata) {
        throw new Error('Expected canonical metadata from the production composition')
      }
      assert.deepEqual(canonicalMetadata.canonical_term_ids, [
        `skills:${skill.id}`,
        'task-types:feature_development',
      ])
      assert.isAbove(canonicalMetadata.taxonomy_versions_by_namespace['skills'] ?? 0, 0)
      assert.deepEqual(
        Object.keys(canonicalMetadata.taxonomy_versions_by_namespace).sort(),
        ['business-domains', 'problem-categories', 'skills', 'task-types', 'technologies']
      )
      assert.deepEqual(canonicalMetadata.taxonomy_completeness.sort(), [
        'business-domains:missing',
        'problem-categories:missing',
        'skills:known_present',
        'task-types:known_present',
        'technologies:known_absent',
      ])
    } finally {
      await db.from('task_metadata_taxonomy_revisions').delete()
    }
  })
})
