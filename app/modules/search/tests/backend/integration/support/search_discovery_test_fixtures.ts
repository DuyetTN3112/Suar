import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import type { TaskSearchDocument } from '#modules/search/domain/entity-search/task_search_document'
import type { TaskSearchDiscoveryDocument } from '#modules/search/infra/adapters/entity-search/tasks/task_search_discovery_bindings'
import type { SearchDiscoveryHit } from '#modules/search/public_contracts/search_discovery_contract'
import { TASK_DISCOVERY_CONTEXTS } from '#modules/tasks/public_contracts/task-discovery/task_discovery_filter_context'

export type TaskDiscoveryHit = SearchDiscoveryHit<TaskSearchDiscoveryDocument>

export function condition(
  field: string,
  operator: string,
  value?: Extract<FilterExpression, { kind: 'condition' }>['value']
): Extract<FilterExpression, { kind: 'condition' }> {
  return {
    kind: 'condition',
    field,
    operator,
    effect: 'require',
    unknown: 'exclude',
    ...(value === undefined ? {} : { value }),
  }
}

export function criteria(overrides: Partial<QueryCriteriaRequest> = {}): QueryCriteriaRequest {
  return {
    context: TASK_DISCOVERY_CONTEXTS.public,
    schemaVersion: 1,
    sort: [],
    page: { size: 20 },
    ...overrides,
  }
}

export function document(id: string, overrides: Partial<TaskSearchDocument> = {}): TaskSearchDocument {
  return {
    task_id: id,
    organization_id: 'org-public',
    creator_id: 'creator-public',
    project_id: 'project-search',
    title: `Task ${id}`,
    description: 'Authoritative discovery fixture',
    acceptance_criteria: 'Permission-safe totals and facets',
    context_background: null,
    required_skill_ids: ['skill-typescript'],
    required_skill_ids_known: true,
    required_skill_ids_count: 1,
    required_skill_category_codes: ['software-engineering'],
    required_skill_category_codes_known: true,
    required_skill_category_codes_count: 1,
    required_skills_text: 'TypeScript',
    canonical_term_ids: ['task-types:engineering'],
    canonical_term_ids_known: true,
    canonical_term_ids_count: 1,
    business_domains: ['software'],
    business_domains_coverage: 'complete',
    business_domains_known: true,
    business_domains_count: 1,
    problem_categories: ['search'],
    problem_categories_coverage: 'complete',
    problem_categories_known: true,
    problem_categories_count: 1,
    task_types: ['engineering'],
    task_types_coverage: 'complete',
    task_types_known: true,
    task_types_count: 1,
    difficulty: 'hard',
    status: 'todo',
    label: 'feature',
    priority: 'high',
    task_visibility: 'external',
    is_public: true,
    is_deleted: false,
    marketplace_visible: true,
    application_eligible: true,
    member_visible: true,
    assigned_to: null,
    verification_method: 'review',
    tech_stack: ['elasticsearch'],
    tech_stack_known: true,
    tech_stack_count: 1,
    domain_tags: ['discovery'],
    domain_tags_known: true,
    domain_tags_count: 1,
    learning_objectives: ['faceted-search'],
    learning_objectives_known: true,
    learning_objectives_count: 1,
    role_in_task: 'backend-engineer',
    autonomy_level: 'guided',
    collaboration_type: 'team',
    impact_scope: 'platform',
    environment: 'development',
    application_deadline: null,
    due_date: null,
    created_at: '2026-07-01T00:00:00.000Z',
    estimated_users_affected: 100,
    external_applications_count: 0,
    deleted_at: null,
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}
