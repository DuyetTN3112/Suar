import { test } from '@japa/runner'

import { buildTaskBenchmarkCorpus } from '../../../../../../scripts/search/search_benchmark_corpus.js'

import type {
  TaskSearchDocumentReader,
  TaskSearchDocumentRecord,
} from '#modules/search/actions/ports/outbound/task_search_document_reader'
import type { TaskSearchCanonicalMetadata } from '#modules/search/domain/entity-search/task_search_document'
import { TaskSearchDocumentBuilder } from '#modules/search/infra/adapters/entity-search/tasks/task_search_document_builder'

test.group('Unit | Task Search Document Builder', () => {
  test('maps task search record from domain reader into search document', async ({ assert }) => {
    const builder = new TaskSearchDocumentBuilder({
      findTaskSearchDocumentRecord: (taskId: string) => {
        assert.equal(taskId, 'task-1')

        return Promise.resolve({
          taskId,
          organizationId: 'organization-1',
          creatorId: 'creator-1',
          projectId: 'project-1',
          title: 'Search platform migration',
          description: 'Move marketplace retrieval to dedicated engine',
          acceptanceCriteria: 'All search flows use engine ids first',
          contextBackground: 'Search rollout phase',
          requiredSkills: [
            { skillId: 'skill-1', skillName: 'Elasticsearch', categoryCode: 'technology' },
            { skillId: 'skill-2', skillName: 'TypeScript', categoryCode: 'technology' },
          ],
          businessDomains: ['marketplace', 'software-engineering'],
          businessDomainsCoverage: 'complete',
          problemCategories: ['search', 'information-retrieval'],
          problemCategoriesCoverage: 'complete',
          taskTypes: ['feature_development', 'system_integration'],
          taskTypesCoverage: 'complete',
          difficulty: 'hard',
          status: 'in_progress',
          label: 'feature',
          priority: 'high',
          taskVisibility: 'external',
          assignedTo: null,
          verificationMethod: 'automated_test',
          techStack: ['Elasticsearch', 'TypeScript', 'PostgreSQL'],
          techStackKnown: true,
          domainTags: ['search', 'marketplace', 'discovery'],
          domainTagsKnown: true,
          learningObjectives: ['Relevance evaluation', 'Zero-downtime reindexing'],
          learningObjectivesKnown: true,
          canonicalMetadata: {
            canonical_term_ids: ['skills:skill-typescript', 'business-domains:fintech'],
            canonical_term_ids_known: true,
            canonical_term_ids_count: 2,
            canonical_term_ids_by_namespace: {
              'skills': ['skills:skill-typescript'],
              'business-domains': ['business-domains:fintech'],
            },
            assignment_provenance: ['explicit', 'derived'],
            assignment_review_states: ['reviewed', 'pending'],
            taxonomy_versions: ['business-domains:2', 'skills:7'],
            taxonomy_versions_by_namespace: { 'skills': 7, 'business-domains': 2 },
            taxonomy_completeness: ['business-domains:known_present', 'skills:known_present'],
            taxonomy_completeness_by_namespace: {},
            metadata_assignment_schema_version: 1,
            metadata_source_revisions: ['task-1:sha256:fixture'],
            metadata_enrichment_versions_by_namespace: {},
          } satisfies TaskSearchCanonicalMetadata,
          roleInTask: 'architect',
          autonomyLevel: 'autonomous',
          collaborationType: 'cross_team',
          impactScope: 'organization',
          environment: 'production',
          applicationDeadline: '2026-07-10T00:00:00.000Z',
          dueDate: '2026-07-20T00:00:00.000Z',
          createdAt: '2026-07-01T00:00:00.000Z',
          estimatedUsersAffected: 10_000,
          externalApplicationsCount: 7,
          deletedAt: '2026-07-04T00:00:00.000Z',
          updatedAt: '2026-07-04T01:00:00.000Z',
        } satisfies TaskSearchDocumentRecord)
      },
    } satisfies TaskSearchDocumentReader)

    const document = await builder.build('task-1')

    assert.deepEqual(document, {
      task_id: 'task-1',
      organization_id: 'organization-1',
      creator_id: 'creator-1',
      project_id: 'project-1',
      title: 'Search platform migration',
      description: 'Move marketplace retrieval to dedicated engine',
      acceptance_criteria: 'All search flows use engine ids first',
      context_background: 'Search rollout phase',
      required_skill_ids: ['skill-1', 'skill-2'],
      required_skill_ids_known: true,
      required_skill_ids_count: 2,
      required_skill_category_codes: ['technology', 'technology'],
      required_skill_category_codes_known: true,
      required_skill_category_codes_count: 1,
      required_skills_text: 'Elasticsearch TypeScript',
      business_domains: ['marketplace', 'software-engineering'],
      business_domains_coverage: 'complete',
      business_domains_known: true,
      business_domains_count: 2,
      problem_categories: ['search', 'information-retrieval'],
      problem_categories_coverage: 'complete',
      problem_categories_known: true,
      problem_categories_count: 2,
      task_types: ['feature_development', 'system_integration'],
      task_types_coverage: 'complete',
      task_types_known: true,
      task_types_count: 2,
      difficulty: 'hard',
      status: 'in_progress',
      label: 'feature',
      priority: 'high',
      task_visibility: 'external',
      is_public: true,
      is_deleted: true,
      marketplace_visible: true,
      application_eligible: true,
      member_visible: true,
      assigned_to: null,
      verification_method: 'automated_test',
      tech_stack: ['Elasticsearch', 'TypeScript', 'PostgreSQL'],
      tech_stack_known: true,
      tech_stack_count: 3,
      domain_tags: ['search', 'marketplace', 'discovery'],
      domain_tags_known: true,
      domain_tags_count: 3,
      learning_objectives: ['Relevance evaluation', 'Zero-downtime reindexing'],
      learning_objectives_known: true,
      learning_objectives_count: 2,
      canonical_term_ids: ['skills:skill-typescript', 'business-domains:fintech'],
      canonical_term_ids_known: true,
      canonical_term_ids_count: 2,
      canonical_term_ids_by_namespace: {
        'skills': ['skills:skill-typescript'],
        'business-domains': ['business-domains:fintech'],
      },
      assignment_provenance: ['explicit', 'derived'],
      assignment_review_states: ['reviewed', 'pending'],
      taxonomy_versions: ['business-domains:2', 'skills:7'],
      taxonomy_versions_by_namespace: { 'skills': 7, 'business-domains': 2 },
      taxonomy_completeness: ['business-domains:known_present', 'skills:known_present'],
      taxonomy_completeness_by_namespace: {},
      metadata_assignment_schema_version: 1,
      metadata_source_revisions: ['task-1:sha256:fixture'],
      metadata_enrichment_versions_by_namespace: {},
      role_in_task: 'architect',
      autonomy_level: 'autonomous',
      collaboration_type: 'cross_team',
      impact_scope: 'organization',
      environment: 'production',
      application_deadline: '2026-07-10T00:00:00.000Z',
      due_date: '2026-07-20T00:00:00.000Z',
      created_at: '2026-07-01T00:00:00.000Z',
      estimated_users_affected: 10_000,
      external_applications_count: 7,
      deleted_at: '2026-07-04T00:00:00.000Z',
      updated_at: '2026-07-04T01:00:00.000Z',
    })
  })

  test('preserves secondary labels, duplicates, case variants, unknown refs, and absent metadata exactly', async ({
    assert,
  }) => {
    const builder = new TaskSearchDocumentBuilder({
      findTaskSearchDocumentRecord: () =>
        Promise.resolve({
          taskId: 'task-edge',
          organizationId: null,
          creatorId: 'creator-edge',
          projectId: null,
          title: 'Metadata edge task',
          description: null,
          acceptanceCriteria: null,
          contextBackground: null,
          requiredSkills: [],
          businessDomains: ['primary', 'secondary', 'primary'],
          businessDomainsCoverage: 'complete',
          problemCategories: ['Search', 'search'],
          problemCategoriesCoverage: 'complete',
          taskTypes: ['unknown:future-task-type'],
          taskTypesCoverage: 'legacy_single_value',
          difficulty: null,
          status: 'todo',
          label: 'task',
          priority: 'medium',
          taskVisibility: 'internal',
          assignedTo: 'private-user',
          verificationMethod: 'manual_review',
          techStack: ['PostgreSQL', 'Elasticsearch', 'PostgreSQL'],
          techStackKnown: true,
          domainTags: ['Search', 'search', 'Search'],
          domainTagsKnown: true,
          learningObjectives: [],
          learningObjectivesKnown: false,
          roleInTask: null,
          autonomyLevel: null,
          collaborationType: null,
          impactScope: null,
          environment: null,
          applicationDeadline: null,
          dueDate: null,
          createdAt: '2026-07-01T00:00:00.000Z',
          estimatedUsersAffected: null,
          externalApplicationsCount: 0,
          deletedAt: null,
          updatedAt: '2026-07-01T00:00:00.000Z',
        } satisfies TaskSearchDocumentRecord),
    } satisfies TaskSearchDocumentReader)

    const document = await builder.build('task-edge')

    assert.isNull(document.organization_id)
    assert.deepEqual(document.business_domains, ['primary', 'secondary', 'primary'])
    assert.equal(document.business_domains_coverage, 'complete')
    assert.isTrue(document.business_domains_known)
    assert.equal(document.business_domains_count, 2)
    assert.deepEqual(document.problem_categories, ['Search', 'search'])
    assert.equal(document.problem_categories_coverage, 'complete')
    assert.equal(document.problem_categories_count, 2)
    assert.deepEqual(document.task_types, ['unknown:future-task-type'])
    assert.equal(document.task_types_coverage, 'legacy_single_value')
    assert.equal(document.task_types_count, 1)
    assert.deepEqual(document.tech_stack, ['PostgreSQL', 'Elasticsearch', 'PostgreSQL'])
    assert.equal(document.tech_stack_count, 2)
    assert.deepEqual(document.domain_tags, ['Search', 'search', 'Search'])
    assert.equal(document.domain_tags_count, 2)
    assert.deepEqual(document.learning_objectives, [])
    assert.notProperty(document, 'learning_objectives_known')
    assert.notProperty(document, 'learning_objectives_count')
    assert.isFalse(document.is_public)
    assert.isTrue(document.member_visible)
    assert.isFalse(document.marketplace_visible)
    assert.isFalse(document.application_eligible)
  })

  test('benchmark corpus covers last-position and 100-label recall with production visibility values', ({
    assert,
  }) => {
    const corpus = buildTaskBenchmarkCorpus(0)
    const secondaryLabelTask = corpus.documents.find(
      (document) => document.task_id === 'task-zero-downtime-migration'
    )
    const hundredLabelTask = corpus.documents.find(
      (document) => document.task_id === 'task-hundred-domain-labels'
    )

    if (!secondaryLabelTask || !hundredLabelTask) {
      throw new Error('Task benchmark metadata sentinels are missing')
    }

    assert.equal(secondaryLabelTask.domain_tags.at(-1), 'quasarfacetx')
    assert.lengthOf(
      secondaryLabelTask.domain_tags.filter((label) => label === 'quasarfacetx'),
      1
    )
    assert.lengthOf(hundredLabelTask.domain_tags, 100)
    assert.equal(hundredLabelTask.domain_tags.at(-1), 'centurionfacetx')
    assert.deepInclude(
      corpus.queryCases.map(({ id, query }) => ({ id, query })),
      { id: 'task-hundred-label-cardinality', query: 'centurionfacetx' }
    )
    assert.isTrue(
      corpus.documents
        .filter((document) => document.is_public)
        .every((document) => ['external', 'all'].includes(document.task_visibility))
    )
  })
})
