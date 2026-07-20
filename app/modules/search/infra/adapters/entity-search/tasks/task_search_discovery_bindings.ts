import type { ElasticsearchSemanticBindings } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'
import type { ElasticsearchFilterHitMapperInput } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_query_executor'
import type { SearchDiscoveryHit } from '#modules/search/public_contracts/search_discovery_contract'

export const TASK_SEARCH_DISCOVERY_ID_FIELD = 'task.id'
export const TASK_SEARCH_DISCOVERY_RANKING_VERSION = 'tasks.lexical.v1'

export const TASK_SEARCH_DISCOVERY_TEXT_FIELDS = [
  'title^5',
  'required_skills_text^4',
  'domain_tags.text^4',
  'tech_stack.text^4',
  'acceptance_criteria^3',
  'business_domains.text^3',
  'problem_categories.text^3',
  'description^2',
  'task_types.text^2',
  'learning_objectives^2',
  'role_in_task.text',
  'verification_method.text',
  'collaboration_type.text',
  'impact_scope.text',
  'environment.text',
  'context_background',
] as const

function multiValue(
  path: string,
  options: { readonly truth?: boolean } = {}
): ElasticsearchSemanticBindings[string] {
  return {
    type: 'multi_value',
    path,
    presencePath: `${path}_known`,
    cardinalityPath: `${path}_count`,
    facetable: true,
    exposeMissingCount: options.truth ?? true,
    exposeCoverage: options.truth ?? true,
  }
}

export const TASK_SEARCH_DISCOVERY_BINDINGS: ElasticsearchSemanticBindings = {
  [TASK_SEARCH_DISCOVERY_ID_FIELD]: {
    type: 'scalar',
    path: 'task_id',
    sortable: true,
  },
  'taxonomy.requiredSkills': multiValue('required_skill_ids'),
  'taxonomy.canonicalTerms': multiValue('canonical_term_ids'),
  'taxonomy.skillCategories': multiValue('required_skill_category_codes'),
  'taxonomy.businessDomains': multiValue('business_domains'),
  'taxonomy.domainTags': multiValue('domain_tags'),
  'taxonomy.problemCategories': multiValue('problem_categories'),
  'taxonomy.taskTypes': multiValue('task_types'),
  'taxonomy.technologies': multiValue('tech_stack'),
  'task.difficulty': { type: 'scalar', path: 'difficulty', facetable: true },
  'task.marketplaceEligible': {
    type: 'boolean',
    path: 'application_eligible',
    facetable: true,
  },
  'task.organizationId': { type: 'scalar', path: 'organization_id', facetable: true },
  'task.projectId': { type: 'scalar', path: 'project_id', facetable: true },
  'task.createdAt': { type: 'date_time', path: 'created_at', facetable: true, sortable: true },
  'task.updatedAt': { type: 'date_time', path: 'updated_at', facetable: true, sortable: true },
  'task.dueAt': { type: 'date_time', path: 'due_date', facetable: true, sortable: true },
  'task.applicationDeadline': {
    type: 'date_time',
    path: 'application_deadline',
    facetable: true,
    sortable: true,
  },
  'task.priority': { type: 'scalar', path: 'priority', facetable: true },
  'task.verificationMethod': {
    type: 'scalar',
    path: 'verification_method',
    facetable: true,
  },
  'task.role': { type: 'scalar', path: 'role_in_task', facetable: true },
  'task.workflowState': { type: 'scalar', path: 'status', facetable: true },
  'permission.task.notDeleted': { type: 'boolean', path: 'is_deleted' },
  'permission.task.marketplaceVisible': { type: 'boolean', path: 'marketplace_visible' },
  'permission.task.applicationEligible': { type: 'boolean', path: 'application_eligible' },
  'permission.task.applicationDeadline': {
    type: 'date_time',
    path: 'application_deadline',
  },
  'permission.task.organizationId': { type: 'scalar', path: 'organization_id' },
  'permission.task.memberVisible': { type: 'boolean', path: 'member_visible' },
  'permission.task.creatorId': { type: 'scalar', path: 'creator_id' },
  'permission.task.assignedTo': { type: 'scalar', path: 'assigned_to' },
}

export interface TaskSearchDiscoveryDocument {
  readonly taskId: string
  readonly title: string
  readonly description: string
  readonly organizationId: string | null
  readonly projectId: string | null
  readonly requiredSkillIds: readonly string[]
  readonly requiredSkillCategoryCodes: readonly string[]
  readonly canonicalTermIds: readonly string[]
  readonly businessDomains: readonly string[]
  readonly domainTags: readonly string[]
  readonly problemCategories: readonly string[]
  readonly taskTypes: readonly string[]
  readonly technologies: readonly string[]
  readonly difficulty: string | null
  readonly marketplaceEligible: boolean
  readonly role: string | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly dueAt: string | null
  readonly applicationDeadline: string | null
}

export function mapTaskSearchDiscoveryHit(
  input: ElasticsearchFilterHitMapperInput
): SearchDiscoveryHit<TaskSearchDiscoveryDocument> {
  const taskId = requiredString(input.source, 'task_id')
  if (taskId !== input.id) throw new TypeError('Task discovery hit identity mismatch')

  return {
    id: `task:${taskId}`,
    entityType: 'task',
    entityId: taskId,
    source: 'tasks',
    rank: 0,
    score: input.score,
    presentation: {
      title: requiredString(input.source, 'title'),
      url: `/tasks/${taskId}`,
      sourceLabel: 'Task',
      snippets: [requiredString(input.source, 'description')],
      breadcrumbs: [],
      primaryActionLabel: 'Open task',
    },
    document: {
      taskId,
      title: requiredString(input.source, 'title'),
      description: requiredString(input.source, 'description'),
      organizationId: optionalIdentifier(input.source, 'organization_id'),
      projectId: optionalString(input.source, 'project_id'),
      requiredSkillIds: stringArray(input.source, 'required_skill_ids'),
      requiredSkillCategoryCodes: stringArray(input.source, 'required_skill_category_codes'),
      canonicalTermIds: stringArray(input.source, 'canonical_term_ids'),
      businessDomains: stringArray(input.source, 'business_domains'),
      domainTags: stringArray(input.source, 'domain_tags'),
      problemCategories: stringArray(input.source, 'problem_categories'),
      taskTypes: stringArray(input.source, 'task_types'),
      technologies: stringArray(input.source, 'tech_stack'),
      difficulty: optionalString(input.source, 'difficulty'),
      marketplaceEligible: requiredBoolean(input.source, 'application_eligible'),
      role: optionalString(input.source, 'role_in_task'),
      createdAt: requiredString(input.source, 'created_at'),
      updatedAt: requiredString(input.source, 'updated_at'),
      dueAt: optionalString(input.source, 'due_date'),
      applicationDeadline: optionalString(input.source, 'application_deadline'),
    },
  }
}

function requiredString(source: Readonly<Record<string, unknown>>, field: string): string {
  const value = source[field]
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('Invalid Task discovery document')
  }
  return value
}

function optionalString(source: Readonly<Record<string, unknown>>, field: string): string | null {
  const value = source[field]
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw new TypeError('Invalid Task discovery document')
  return value
}

function optionalIdentifier(
  source: Readonly<Record<string, unknown>>,
  field: string
): string | null {
  const value = optionalString(source, field)
  if (value === null) return null
  if (value.length === 0) throw new TypeError('Invalid Task discovery document')
  return value
}

function requiredBoolean(source: Readonly<Record<string, unknown>>, field: string): boolean {
  const value = source[field]
  if (typeof value !== 'boolean') throw new TypeError('Invalid Task discovery document')
  return value
}

function stringArray(source: Readonly<Record<string, unknown>>, field: string): readonly string[] {
  const value = source[field]
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new TypeError('Invalid Task discovery document')
  const values: string[] = []
  for (const item of value as unknown[]) {
    if (typeof item !== 'string') throw new TypeError('Invalid Task discovery document')
    values.push(item)
  }
  return [...new Set(values)]
}
