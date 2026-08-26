import type { OrganizationSearchDocument } from '#modules/search/domain/entity-search/organization_search_document'
import type { ProjectSearchDocument } from '#modules/search/domain/entity-search/project_search_document'
import type { SearchRelevanceJudgment } from '#modules/search/domain/quality/search_quality_metrics'
import type { SkillSearchDocument } from '#modules/search/domain/entity-search/skill_search_document'
import type { TalentSearchDocument } from '#modules/search/domain/entity-search/talent_search_document'
import type { TaskSearchDocument } from '#modules/search/domain/entity-search/task_search_document'
import type { UserDirectorySearchDocument } from '#modules/search/domain/entity-search/user_directory_search_document'

export interface SearchBenchmarkQueryCase {
  id: string
  query: string
  judgments: SearchRelevanceJudgment[]
}

export interface SearchBenchmarkCorpus<Document> {
  documents: Document[]
  queryCases: SearchBenchmarkQueryCase[]
}

const BENCHMARK_TIMESTAMP = '2026-07-26T00:00:00.000Z'
export const BENCHMARK_ORGANIZATION_ID = 'benchmark-org'

export function buildTalentBenchmarkCorpus(
  noiseDocumentCount: number
): SearchBenchmarkCorpus<TalentSearchDocument> {
  const documents: TalentSearchDocument[] = [
    talentDocument({
      user_id: 'talent-elastic-architect',
      username: 'elastic_architect',
      display_name: 'Elastic Search Architect',
      headline: 'Principal Elasticsearch architect',
      bio: 'Designs resilient distributed search systems',
      skills_text: 'Elasticsearch Lucene relevance architecture',
    }),
    talentDocument({
      user_id: 'talent-relevance-engineer',
      username: 'relevance_engineer',
      display_name: 'Search Relevance Engineer',
      headline: 'Information retrieval and ranking specialist',
      bio: 'Builds ranking evaluation suites and query relevance models',
      skills_text: 'Elasticsearch BM25 relevance tuning',
    }),
    talentDocument({
      user_id: 'talent-kubernetes-platform',
      username: 'platform_engineer',
      display_name: 'Kubernetes Platform Engineer',
      headline: 'Cloud platform reliability',
      bio: 'Operates Kubernetes clusters and delivery automation',
      skills_text: 'Kubernetes Terraform observability',
    }),
    ...numberedDocuments(noiseDocumentCount, (index) =>
      talentDocument({
        user_id: `talent-noise-${index}`,
        username: `member_${index}`,
        display_name: `Engineering Member ${index}`,
        headline: 'General product delivery',
        bio: 'Contributes routine application features',
        skills_text: 'TypeScript PostgreSQL delivery',
      })
    ),
  ]

  return {
    documents,
    queryCases: [
      queryCase('talent-exact-identity', 'elastic architect', [['talent-elastic-architect', 3]]),
      queryCase('talent-fuzzy-provider', 'elasticserch', [
        ['talent-relevance-engineer', 3],
        ['talent-elastic-architect', 2],
      ]),
      queryCase('talent-ranking-specialist', 'ranking relevance', [
        ['talent-relevance-engineer', 3],
        ['talent-elastic-architect', 1],
      ]),
    ],
  }
}

export function buildTaskBenchmarkCorpus(
  noiseDocumentCount: number
): SearchBenchmarkCorpus<TaskSearchDocument> {
  const documents: TaskSearchDocument[] = [
    taskDocument({
      task_id: 'task-zero-downtime-migration',
      title: 'Elasticsearch zero downtime migration',
      description: 'Move the production search index without interrupting reads',
      acceptance_criteria: 'Atomically swap the read and write aliases',
      context_background: 'Versioned mappings require a safe rollout',
      required_skills_text: 'Elasticsearch index aliases',
      business_domains: ['software_engineering', 'search_reliability'],
      business_domains_coverage: 'complete',
      domain_tags: ['migration', 'alias-safety', 'quasarfacetx'],
    }),
    taskDocument({
      task_id: 'task-relevance-benchmark',
      title: 'Search relevance benchmark',
      description: 'Measure ranked retrieval quality with representative queries',
      acceptance_criteria: 'Report MRR recall and normalized discounted cumulative gain',
      context_background: 'The Search Center needs a reproducible quality baseline',
      required_skills_text: 'Elasticsearch ranking evaluation information retrieval',
    }),
    taskDocument({
      task_id: 'task-kubernetes-upgrade',
      title: 'Kubernetes cluster upgrade',
      description: 'Upgrade the application platform control plane',
      acceptance_criteria: 'Complete the rollout without workload disruption',
      context_background: 'Platform maintenance',
      required_skills_text: 'Kubernetes Terraform',
    }),
    taskDocument({
      task_id: 'task-hundred-domain-labels',
      title: 'High-cardinality taxonomy navigation',
      description: 'Validate recall when a task carries one hundred domain labels',
      acceptance_criteria: 'Recall the final label without truncating taxonomy metadata',
      domain_tags: [
        ...numberedDocuments(99, (index) => `domain-label-${index}`),
        'centurionfacetx',
      ],
      task_visibility: 'all',
    }),
    taskDocument({
      task_id: 'task-cross-organization-decoy',
      organization_id: 'another-organization',
      title: 'Elasticsearch zero downtime migration',
      description: 'A private task outside the benchmark organization',
      acceptance_criteria: 'Must never leak through organization-scoped search',
      context_background: 'Authorization decoy',
      required_skills_text: 'Elasticsearch',
      domain_tags: ['quasarfacetx'],
      is_public: false,
      task_visibility: 'private',
    }),
    ...numberedDocuments(noiseDocumentCount, (index) =>
      taskDocument({
        task_id: `task-noise-${index}`,
        title: `Routine delivery item ${index}`,
        description: 'Implement a standard application workflow',
        acceptance_criteria: 'Pass the normal verification checklist',
        context_background: 'General product maintenance',
        required_skills_text: 'TypeScript PostgreSQL',
      })
    ),
  ]

  return {
    documents,
    queryCases: [
      queryCase('task-exact-title', 'elasticsearch zero downtime migration', [
        ['task-zero-downtime-migration', 3],
      ]),
      queryCase('task-alias-intent', 'atomic alias swap', [['task-zero-downtime-migration', 3]]),
      queryCase('task-quality-metrics', 'normalized discounted gain', [
        ['task-relevance-benchmark', 3],
      ]),
      queryCase('task-secondary-metadata-label', 'quasarfacetx', [
        ['task-zero-downtime-migration', 3],
      ]),
      queryCase('task-hundred-label-cardinality', 'centurionfacetx', [
        ['task-hundred-domain-labels', 3],
      ]),
    ],
  }
}

export function buildProjectBenchmarkCorpus(
  noiseDocumentCount: number
): SearchBenchmarkCorpus<ProjectSearchDocument> {
  const documents: ProjectSearchDocument[] = [
    projectDocument({
      project_id: 'project-search-center',
      name: 'Enterprise Search Center',
      description: 'A federated workbench for ranked discovery across business entities',
      tags_text: 'search relevance elasticsearch',
    }),
    projectDocument({
      project_id: 'project-index-lifecycle',
      name: 'Versioned Index Lifecycle',
      description: 'Zero downtime reindexing with atomic aliases and strict mappings',
      tags_text: 'elasticsearch migration aliases',
    }),
    projectDocument({
      project_id: 'project-platform',
      name: 'Platform Reliability',
      description: 'Kubernetes delivery and service observability',
      tags_text: 'kubernetes infrastructure',
    }),
    ...numberedDocuments(noiseDocumentCount, (index) =>
      projectDocument({
        project_id: `project-noise-${index}`,
        name: `Product Initiative ${index}`,
        description: 'Routine business application delivery',
        tags_text: 'typescript postgres product',
      })
    ),
  ]

  return {
    documents,
    queryCases: [
      queryCase('project-exact-name', 'enterprise search center', [['project-search-center', 3]]),
      queryCase('project-zero-downtime', 'zero downtime reindexing', [
        ['project-index-lifecycle', 3],
      ]),
      queryCase('project-fuzzy-lifecycle', 'versined index lifecycle', [
        ['project-index-lifecycle', 3],
      ]),
    ],
  }
}

export function buildSkillBenchmarkCorpus(
  noiseDocumentCount: number
): SearchBenchmarkCorpus<SkillSearchDocument> {
  const documents: SkillSearchDocument[] = [
    skillDocument({
      skill_id: 'skill-elasticsearch',
      skill_code: 'ELASTICSEARCH',
      skill_name: 'Elasticsearch',
      description: 'Distributed full text search and analytics engine',
    }),
    skillDocument({
      skill_id: 'skill-information-retrieval',
      skill_code: 'INFORMATION_RETRIEVAL',
      skill_name: 'Information Retrieval',
      description: 'Ranking evaluation BM25 MRR and normalized discounted cumulative gain',
    }),
    skillDocument({
      skill_id: 'skill-kubernetes',
      skill_code: 'KUBERNETES',
      skill_name: 'Kubernetes',
      description: 'Container orchestration and platform operations',
    }),
    skillDocument({
      skill_id: 'skill-inactive-search',
      skill_code: 'LEGACY_SEARCH',
      skill_name: 'Legacy Search Appliance',
      description: 'Inactive catalog item that must be filtered',
      is_active: false,
    }),
    ...numberedDocuments(noiseDocumentCount, (index) =>
      skillDocument({
        skill_id: `skill-noise-${index}`,
        skill_code: `GENERAL_${index}`,
        skill_name: `General Engineering ${index}`,
        description: 'Standard application engineering competency',
      })
    ),
  ]

  return {
    documents,
    queryCases: [
      queryCase('skill-exact-name', 'elasticsearch', [['skill-elasticsearch', 3]]),
      queryCase('skill-fuzzy-name', 'elasticserch', [['skill-elasticsearch', 3]]),
      queryCase('skill-ranking-metrics', 'normalized discounted gain', [
        ['skill-information-retrieval', 3],
      ]),
    ],
  }
}

export function buildOrganizationBenchmarkCorpus(
  noiseDocumentCount: number
): SearchBenchmarkCorpus<OrganizationSearchDocument> {
  const documents: OrganizationSearchDocument[] = [
    organizationDocument({
      organization_id: 'organization-search-labs',
      name: 'Suar Search Labs',
      slug: 'suar-search-labs',
      description: 'Enterprise search relevance and distributed retrieval research',
      website: 'https://search-labs.test',
    }),
    organizationDocument({
      organization_id: 'organization-elastic-guild',
      name: 'Elastic Systems Guild',
      slug: 'elastic-systems-guild',
      description: 'Elasticsearch operations and zero downtime index migrations',
      website: 'https://elastic-guild.test',
    }),
    organizationDocument({
      organization_id: 'organization-platform',
      name: 'Platform Operations',
      slug: 'platform-operations',
      description: 'Kubernetes infrastructure and delivery automation',
      website: 'https://platform.test',
    }),
    organizationDocument({
      organization_id: 'organization-deleted-search',
      name: 'Deleted Search Company',
      slug: 'deleted-search-company',
      description: 'A deleted organization that must not be returned',
      website: 'https://deleted.test',
      deleted_at: BENCHMARK_TIMESTAMP,
    }),
    ...numberedDocuments(noiseDocumentCount, (index) =>
      organizationDocument({
        organization_id: `organization-noise-${index}`,
        name: `Business Group ${index}`,
        slug: `business-group-${index}`,
        description: 'General product and customer operations',
        website: `https://business-${index}.test`,
      })
    ),
  ]

  return {
    documents,
    queryCases: [
      queryCase('organization-exact-name', 'suar search labs', [['organization-search-labs', 3]]),
      queryCase('organization-provider-operations', 'elasticsearch operations', [
        ['organization-elastic-guild', 3],
      ]),
      queryCase('organization-fuzzy-guild', 'elastic systms guild', [
        ['organization-elastic-guild', 3],
      ]),
    ],
  }
}

export function buildUserDirectoryBenchmarkCorpus(
  noiseDocumentCount: number
): SearchBenchmarkCorpus<UserDirectorySearchDocument> {
  const documents: UserDirectorySearchDocument[] = [
    userDirectoryDocument({
      user_id: 'user-elastic-architect',
      username: 'elastic.architect',
      email: 'elastic.architect@example.test',
    }),
    userDirectoryDocument({
      user_id: 'user-relevance-engineer',
      username: 'relevance.engineer',
      email: 'ranking.relevance@example.test',
    }),
    userDirectoryDocument({
      user_id: 'user-platform-engineer',
      username: 'platform.engineer',
      email: 'kubernetes@example.test',
    }),
    userDirectoryDocument({
      user_id: 'user-deleted-elastic',
      username: 'deleted.elastic',
      email: 'deleted.elastic@example.test',
      deleted_at: BENCHMARK_TIMESTAMP,
      status: 'inactive',
    }),
    ...numberedDocuments(noiseDocumentCount, (index) =>
      userDirectoryDocument({
        user_id: `user-noise-${index}`,
        username: `member.${index}`,
        email: `member.${index}@example.test`,
      })
    ),
  ]

  return {
    documents,
    queryCases: [
      queryCase('user-exact-username', 'elastic architect', [['user-elastic-architect', 3]]),
      queryCase('user-email-identity', 'ranking relevance', [['user-relevance-engineer', 3]]),
      queryCase('user-fuzzy-username', 'relevnce engineer', [['user-relevance-engineer', 3]]),
    ],
  }
}

function talentDocument(
  overrides: Partial<TalentSearchDocument> &
    Pick<TalentSearchDocument, 'user_id' | 'username' | 'display_name'>
): TalentSearchDocument {
  return {
    headline: null,
    bio: null,
    status: 'active',
    is_searchable: true,
    skill_ids: [],
    skills_text: '',
    accomplishments_text: '',
    business_domains: [],
    problem_categories: [],
    task_types: [],
    technologies: [],
    trust_score: 50,
    completed_tasks: 5,
    reviewed_skills_count: 2,
    imported_skills_count: 0,
    under_dispute_skills_count: 0,
    latest_confidence_signal: 'medium',
    updated_at: BENCHMARK_TIMESTAMP,
    ...overrides,
    user_id: overrides.user_id,
    username: overrides.username,
    display_name: overrides.display_name,
  }
}

function taskDocument(
  overrides: Partial<TaskSearchDocument> & Pick<TaskSearchDocument, 'task_id' | 'title'>
): TaskSearchDocument {
  return {
    organization_id: BENCHMARK_ORGANIZATION_ID,
    creator_id: 'benchmark-task-creator',
    project_id: 'benchmark-project',
    description: '',
    acceptance_criteria: '',
    context_background: null,
    required_skill_ids: [],
    required_skills_text: '',
    business_domains: ['software_engineering'],
    business_domains_coverage: 'legacy_single_value',
    problem_categories: ['platform'],
    problem_categories_coverage: 'legacy_single_value',
    task_types: ['feature_development'],
    task_types_coverage: 'legacy_single_value',
    difficulty: 'advanced',
    status: 'todo',
    label: 'feature',
    priority: 'medium',
    task_visibility: 'external',
    is_public: true,
    assigned_to: null,
    verification_method: 'automated_test',
    tech_stack: [],
    domain_tags: [],
    learning_objectives: [],
    role_in_task: null,
    autonomy_level: null,
    collaboration_type: null,
    impact_scope: null,
    environment: null,
    application_deadline: null,
    due_date: null,
    created_at: BENCHMARK_TIMESTAMP,
    estimated_users_affected: null,
    external_applications_count: 0,
    deleted_at: null,
    updated_at: BENCHMARK_TIMESTAMP,
    ...overrides,
    task_id: overrides.task_id,
    title: overrides.title,
  }
}

function projectDocument(
  overrides: Partial<ProjectSearchDocument> & Pick<ProjectSearchDocument, 'project_id' | 'name'>
): ProjectSearchDocument {
  return {
    description: null,
    visibility: 'public',
    status: 'active',
    organization_id: BENCHMARK_ORGANIZATION_ID,
    creator_id: 'benchmark-owner',
    manager_id: null,
    owner_id: 'benchmark-owner',
    tags_text: '',
    deleted_at: null,
    updated_at: BENCHMARK_TIMESTAMP,
    ...overrides,
    project_id: overrides.project_id,
    name: overrides.name,
  }
}

function skillDocument(
  overrides: Partial<SkillSearchDocument> &
    Pick<SkillSearchDocument, 'skill_id' | 'skill_code' | 'skill_name'>
): SkillSearchDocument {
  return {
    category_code: 'engineering',
    display_type: 'technical',
    description: null,
    is_active: true,
    updated_at: BENCHMARK_TIMESTAMP,
    ...overrides,
    skill_id: overrides.skill_id,
    skill_code: overrides.skill_code,
    skill_name: overrides.skill_name,
  }
}

function organizationDocument(
  overrides: Partial<OrganizationSearchDocument> &
    Pick<OrganizationSearchDocument, 'organization_id' | 'name' | 'slug'>
): OrganizationSearchDocument {
  return {
    description: null,
    website: null,
    logo: null,
    deleted_at: null,
    updated_at: BENCHMARK_TIMESTAMP,
    ...overrides,
    organization_id: overrides.organization_id,
    name: overrides.name,
    slug: overrides.slug,
  }
}

function userDirectoryDocument(
  overrides: Partial<UserDirectorySearchDocument> &
    Pick<UserDirectorySearchDocument, 'user_id' | 'username'>
): UserDirectorySearchDocument {
  return {
    email: null,
    status: 'active',
    deleted_at: null,
    updated_at: BENCHMARK_TIMESTAMP,
    ...overrides,
    user_id: overrides.user_id,
    username: overrides.username,
  }
}

function queryCase(
  id: string,
  query: string,
  ratings: ReadonlyArray<readonly [documentId: string, relevance: number]>
): SearchBenchmarkQueryCase {
  return {
    id,
    query,
    judgments: ratings.map(([documentId, relevance]) => ({ documentId, relevance })),
  }
}

function numberedDocuments<Document>(
  count: number,
  buildDocument: (index: number) => Document
): Document[] {
  return Array.from({ length: count }, (_value, index) => buildDocument(index + 1))
}
