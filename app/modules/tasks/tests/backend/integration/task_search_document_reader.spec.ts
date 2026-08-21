import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { TaskSkillReaderAdapter } from '#composition/adapters/tasks/task_skill_reader_adapter'
import { taskSearchDocumentReader } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { TaskSearchDocument } from '#modules/search/domain/entity-search/task_search_document'
import {
  TaskSearchIndexMigrationRequiredError,
  TaskSearchIndexRepository,
} from '#modules/search/infra/repositories/entity-search/tasks/task_search_index_repository'
import type {
  TaskRequirementReferenceFacts,
  TaskRequirementSkillReference,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { TASK_METADATA_CANONICAL_NAMESPACES } from '#modules/tasks/actions/ports/outbound/task_metadata_assignment_source_reader'
import { LucidTaskSearchDocumentReader } from '#modules/tasks/infra/adapters/task-reading/lucid_task_search_document_reader'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import type { MetadataAssignmentProvider } from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'
import { searchClient } from '#platform/search/elasticsearch_client'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  SkillFactory,
  TaskFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

class CountingTaskSkillReader extends TaskSkillReaderAdapter {
  readonly requestedSkillIdBatches: string[][] = []

  constructor(
    private readonly transform: (
      skills: TaskRequirementSkillReference[]
    ) => TaskRequirementSkillReference[] = (skills) => skills
  ) {
    super()
  }

  override async findTaskRequirementReferenceFacts(ids: {
    skillIds: string[]
    proficiencyLevelIds: string[]
  }): Promise<TaskRequirementReferenceFacts> {
    this.requestedSkillIdBatches.push(ids.skillIds)
    const facts = await super.findTaskRequirementReferenceFacts(ids)
    return { ...facts, skills: this.transform(facts.skills) }
  }
}

function searchDocument(
  overrides: Partial<TaskSearchDocument> & Pick<TaskSearchDocument, 'task_id' | 'title'>
): TaskSearchDocument {
  return {
    organization_id: 'wp03-organization',
    creator_id: 'wp03-creator',
    project_id: null,
    description: '',
    acceptance_criteria: '',
    context_background: null,
    required_skill_ids: [],
    required_skill_ids_known: true,
    required_skill_ids_count: 0,
    required_skill_category_codes: [],
    required_skill_category_codes_known: true,
    required_skill_category_codes_count: 0,
    required_skills_text: '',
    business_domains: [],
    business_domains_coverage: 'missing',
    problem_categories: [],
    problem_categories_coverage: 'missing',
    task_types: [],
    task_types_coverage: 'missing',
    difficulty: null,
    status: 'todo',
    label: 'task',
    priority: 'medium',
    task_visibility: 'external',
    is_public: true,
    is_deleted: false,
    marketplace_visible: true,
    application_eligible: true,
    member_visible: true,
    assigned_to: null,
    verification_method: 'automated_test',
    tech_stack: [],
    tech_stack_known: true,
    tech_stack_count: 0,
    domain_tags: [],
    domain_tags_known: true,
    domain_tags_count: 0,
    learning_objectives: [],
    learning_objectives_known: true,
    learning_objectives_count: 0,
    role_in_task: null,
    autonomy_level: null,
    collaboration_type: null,
    impact_scope: null,
    environment: null,
    application_deadline: null,
    due_date: null,
    created_at: '2026-08-01T00:00:00.000Z',
    estimated_users_affected: null,
    external_applications_count: 0,
    deleted_at: null,
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
    task_id: overrides.task_id,
    title: overrides.title,
  }
}

test.group('Integration | Task Search Document Reader', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('uses the Project-domain snapshot as complete business-domain context and preserves true arrays exactly', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Multi-label discovery task',
      status: 'in_progress',
      label: 'feature',
      priority: 'urgent',
      difficulty: 'expert',
      task_visibility: 'external',
      application_deadline: DateTime.fromISO('2026-08-20T00:00:00.000Z'),
      due_date: DateTime.fromISO('2026-08-30T00:00:00.000Z'),
    })
    task.merge({
      task_type: 'feature_development',
      business_domain: 'data_platform',
      project_business_domains: ['data_platform', 'saas'],
      problem_category: 'new_capability',
      verification_method: 'automated_test',
      tech_stack: ['Elasticsearch', 'TypeScript', 'Elasticsearch'],
      domain_tags: ['Search', 'search', 'Search'],
      learning_objectives: ['Relevance evaluation', 'Faceted navigation'],
      role_in_task: 'architect',
      autonomy_level: 'autonomous',
      collaboration_type: 'cross_team',
      impact_scope: 'organization',
      environment: 'production',
      estimated_users_affected: 10_000,
      external_applications_count: 7,
    })
    await task.save()

    const reader = new LucidTaskSearchDocumentReader(new TaskSkillReaderAdapter())
    const record = await reader.findTaskSearchDocumentRecord(task.id)

    assert.deepEqual(record.businessDomains, ['data_platform', 'saas'])
    assert.equal(record.businessDomainsCoverage, 'complete')
    assert.deepEqual(record.problemCategories, ['new_capability'])
    assert.equal(record.problemCategoriesCoverage, 'legacy_single_value')
    assert.deepEqual(record.taskTypes, ['feature_development'])
    assert.equal(record.taskTypesCoverage, 'legacy_single_value')
    assert.deepEqual(record.techStack, ['Elasticsearch', 'TypeScript', 'Elasticsearch'])
    assert.isTrue(record.techStackKnown)
    assert.deepEqual(record.domainTags, ['Search', 'search', 'Search'])
    assert.isTrue(record.domainTagsKnown)
    assert.deepEqual(record.learningObjectives, ['Relevance evaluation', 'Faceted navigation'])
    assert.isTrue(record.learningObjectivesKnown)
    assert.equal(record.projectId, task.project_id)
    assert.equal(record.status, 'in_progress')
    assert.equal(record.label, 'feature')
    assert.equal(record.priority, 'urgent')
    assert.equal(record.verificationMethod, 'automated_test')
    assert.equal(record.roleInTask, 'architect')
    assert.equal(record.autonomyLevel, 'autonomous')
    assert.equal(record.collaborationType, 'cross_team')
    assert.equal(record.impactScope, 'organization')
    assert.equal(record.environment, 'production')
    assert.equal(DateTime.fromISO(record.applicationDeadline ?? '').toUTC().toISO(), '2026-08-20T00:00:00.000Z')
    assert.equal(DateTime.fromISO(record.dueDate ?? '').toUTC().toISO(), '2026-08-30T00:00:00.000Z')
    assert.equal(record.createdAt, task.created_at.toISO())
    assert.equal(record.estimatedUsersAffected, 10_000)
    assert.equal(record.externalApplicationsCount, 7)
  })

  test('reports missing legacy classifications and absent array metadata without inventing values', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Legacy sparse task',
    })
    task.business_domain = null
    task.project_business_domains = null as unknown as string[]
    task.problem_category = null
    task.task_type = ''
    task.tech_stack = null as unknown as string[]
    task.domain_tags = null as unknown as string[]
    task.learning_objectives = null as unknown as string[]
    task.required_skills_rel = [] as unknown as typeof task.required_skills_rel

    const originalTaskQuery = Task.query.bind(Task) as typeof Task.query
    const fakeTaskQuery = {
      where: () => fakeTaskQuery,
      preload: () => fakeTaskQuery,
      firstOrFail: () => Promise.resolve(task),
    }
    Task.query = (() => fakeTaskQuery) as unknown as typeof Task.query

    try {
      const record = await new LucidTaskSearchDocumentReader(
        new TaskSkillReaderAdapter()
      ).findTaskSearchDocumentRecord(task.id)

      assert.deepEqual(record.businessDomains, [])
      assert.equal(record.businessDomainsCoverage, 'missing')
      assert.deepEqual(record.problemCategories, [])
      assert.equal(record.problemCategoriesCoverage, 'missing')
      assert.deepEqual(record.taskTypes, [])
      assert.equal(record.taskTypesCoverage, 'missing')
      assert.deepEqual(record.techStack, [])
      assert.isFalse(record.techStackKnown)
      assert.deepEqual(record.domainTags, [])
      assert.isFalse(record.domainTagsKnown)
      assert.deepEqual(record.learningObjectives, [])
      assert.isFalse(record.learningObjectivesKnown)
    } finally {
      Task.query = originalTaskQuery
    }
  })

  test('fails closed instead of manufacturing a timestamp for an invalid persisted date', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Corrupt date task',
    })
    task.created_at = DateTime.invalid('corrupt persisted date')
    task.required_skills_rel = [] as unknown as typeof task.required_skills_rel

    const originalTaskQuery = Task.query.bind(Task) as typeof Task.query
    const fakeTaskQuery = {
      where: () => fakeTaskQuery,
      preload: () => fakeTaskQuery,
      firstOrFail: () => Promise.resolve(task),
    }
    Task.query = (() => fakeTaskQuery) as unknown as typeof Task.query

    try {
      await assert.rejects(
        () =>
          new LucidTaskSearchDocumentReader(
            new TaskSkillReaderAdapter()
          ).findTaskSearchDocumentRecord(task.id),
        /invalid persisted date.*created_at/i
      )
    } finally {
      Task.query = originalTaskQuery
    }
  })

  test('fails closed for an invalid optional persisted date', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Corrupt optional date task',
    })
    task.application_deadline = DateTime.invalid('corrupt optional persisted date')
    task.required_skills_rel = [] as unknown as typeof task.required_skills_rel

    const originalTaskQuery = Task.query.bind(Task) as typeof Task.query
    const fakeTaskQuery = {
      where: () => fakeTaskQuery,
      preload: () => fakeTaskQuery,
      firstOrFail: () => Promise.resolve(task),
    }
    Task.query = (() => fakeTaskQuery) as unknown as typeof Task.query

    try {
      await assert.rejects(
        () =>
          new LucidTaskSearchDocumentReader(
            new TaskSkillReaderAdapter()
          ).findTaskSearchDocumentRecord(task.id),
        /invalid persisted date.*application_deadline/i
      )
    } finally {
      Task.query = originalTaskQuery
    }
  })

  test('fails closed for an invalid updated_at timestamp', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Corrupt update timestamp task',
    })
    task.updated_at = DateTime.invalid('corrupt update timestamp')
    task.required_skills_rel = [] as unknown as typeof task.required_skills_rel

    const originalTaskQuery = Task.query.bind(Task) as typeof Task.query
    const fakeTaskQuery = {
      where: () => fakeTaskQuery,
      preload: () => fakeTaskQuery,
      firstOrFail: () => Promise.resolve(task),
    }
    Task.query = (() => fakeTaskQuery) as unknown as typeof Task.query

    try {
      await assert.rejects(
        () =>
          new LucidTaskSearchDocumentReader(
            new TaskSkillReaderAdapter()
          ).findTaskSearchDocumentRecord(task.id),
        /invalid persisted date.*updated_at/i
      )
    } finally {
      Task.query = originalTaskQuery
    }
  })

  test('recalls secondary array labels without leaking private or assigned task metadata', async ({
    assert,
  }) => {
    const repository = new TaskSearchIndexRepository()
    await repository.resetIndex()

    try {
      await repository.bulkUpsertDocuments([
        searchDocument({
          task_id: 'wp03-public-secondary',
          title: 'Public metadata task',
          business_domains: ['primary-domain', 'secondary-recall-token'],
          business_domains_coverage: 'complete',
          domain_tags: ['Search', 'secondary-recall-token', 'Search'],
        }),
        searchDocument({
          task_id: 'wp03-private-decoy',
          title: 'Private metadata task',
          task_visibility: 'private',
          is_public: false,
          domain_tags: ['secondary-recall-token'],
        }),
        searchDocument({
          task_id: 'wp03-assigned-decoy',
          title: 'Assigned metadata task',
          assigned_to: 'private-user',
          domain_tags: ['secondary-recall-token'],
        }),
      ])

      const hits = await repository.search({
        q: 'secondary-recall-token',
        limit: 10,
        organizationId: 'wp03-organization',
        publicOnly: true,
      })

      assert.deepEqual(
        hits.map((hit) => hit.taskId),
        ['wp03-public-secondary']
      )
    } finally {
      await repository.resetIndex()
    }
  }).timeout(15_000)

  test('blocks incompatible active mappings until a populated generation is atomically activated', async ({
    assert,
  }) => {
    const repository = new TaskSearchIndexRepository()
    await repository.resetIndex()

    try {
      await searchClient.indices.create({
        index: repository.physicalIndexName,
        mappings: {
          dynamic: 'strict',
          properties: {
            task_id: { type: 'keyword' },
            title: { type: 'text' },
          },
        },
        aliases: {
          [repository.indexName]: { is_write_index: true },
        },
      })

      await searchClient.index({
        index: repository.physicalIndexName,
        id: 'wp03-legacy-visible-hit',
        document: {
          task_id: 'wp03-legacy-visible-hit',
          title: 'Legacy metadata recall token',
        },
        refresh: 'wait_for',
      })

      await assert.rejects(() => repository.ensureIndex(), TaskSearchIndexMigrationRequiredError)
      await assert.rejects(
        () =>
          repository.search({
            q: 'legacy metadata recall token',
            limit: 5,
          }),
        TaskSearchIndexMigrationRequiredError
      )

      const legacyMappingBefore = await searchClient.indices.getMapping({
        index: repository.physicalIndexName,
      })
      assert.notProperty(
        legacyMappingBefore[repository.physicalIndexName]?.mappings.properties ?? {},
        'domain_tags'
      )

      await repository.replaceAllDocuments([
        searchDocument({
          task_id: 'wp03-reindexed',
          title: 'Reindexed metadata task',
          domain_tags: ['generation-safe-secondary'],
        }),
      ])

      const activeBackings = Object.keys(
        await searchClient.indices.getAlias({ name: repository.indexName })
      )
      assert.lengthOf(activeBackings, 1)
      assert.notEqual(activeBackings[0], repository.physicalIndexName)

      const legacyMappingAfter = await searchClient.indices.getMapping({
        index: repository.physicalIndexName,
      })
      assert.notProperty(
        legacyMappingAfter[repository.physicalIndexName]?.mappings.properties ?? {},
        'domain_tags'
      )

      const hits = await repository.search({
        q: 'generation-safe-secondary',
        limit: 5,
        organizationId: 'wp03-organization',
        publicOnly: true,
      })
      assert.deepEqual(
        hits.map((hit) => hit.taskId),
        ['wp03-reindexed']
      )
    } finally {
      await repository.resetIndex()
    }
  }).timeout(20_000)

  test('uses strict mappings so undeclared sensitive fields are rejected and never indexed', async ({
    assert,
  }) => {
    const repository = new TaskSearchIndexRepository()
    await repository.resetIndex()

    try {
      await repository.ensureIndex()

      const mappings = await searchClient.indices.getMapping({ index: repository.indexName })
      assert.isTrue(
        Object.values(mappings).every((descriptor) => descriptor.mappings.dynamic === 'strict')
      )

      await assert.rejects(
        () =>
          searchClient.index({
            index: repository.indexName,
            id: 'wp03-sensitive-runtime-field',
            document: {
              ...searchDocument({
                task_id: 'wp03-sensitive-runtime-field',
                title: 'Strict mapping sentinel',
              }),
              internal_compensation_notes: 'must never enter the search index',
            },
            refresh: 'wait_for',
          }),
        /strict_dynamic_mapping_exception|dynamic introduction.*not allowed/i
      )

      assert.isFalse(
        await searchClient.exists({
          index: repository.indexName,
          id: 'wp03-sensitive-runtime-field',
        })
      )
    } finally {
      await repository.resetIndex()
    }
  }).timeout(15_000)

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
