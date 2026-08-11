import type { FilterFieldType } from '#modules/filtering/public_contracts/filter_contracts'

export type TaskDiscoveryAudience = 'anonymous' | 'public' | 'member'

type TaskDiscoveryStrictEffect = 'require' | 'exclude'
type TaskDiscoveryUnknownPolicy = 'include' | 'exclude'
type TaskDiscoveryFacetCountMode = 'constrained' | 'self_excluding'

export interface TaskDiscoverySemanticField {
  readonly key: string
  readonly type: FilterFieldType
  readonly operators: readonly string[]
  readonly effects: readonly TaskDiscoveryStrictEffect[]
  readonly defaultUnknown: TaskDiscoveryUnknownPolicy
  readonly facetable: boolean
  readonly sortable: boolean
  readonly projectable: boolean
  readonly preference: boolean
  readonly valueSearch: boolean
  readonly facetCountModes: readonly TaskDiscoveryFacetCountMode[]
  readonly cost: number
}

export interface TaskDiscoverySort {
  readonly field: string
  readonly directions: readonly ('asc' | 'desc')[]
}

export const TASK_DISCOVERY_PERMISSION_FIELDS = {
  notDeleted: 'permission.task.notDeleted',
  marketplaceVisible: 'permission.task.marketplaceVisible',
  applicationEligible: 'permission.task.applicationEligible',
  applicationDeadline: 'permission.task.applicationDeadline',
  organizationId: 'permission.task.organizationId',
  memberVisible: 'permission.task.memberVisible',
  creatorId: 'permission.task.creatorId',
  assignedTo: 'permission.task.assignedTo',
} as const

const SET_OPERATORS = [
  'contains_any',
  'contains_all',
  'contains_none',
  'contains_at_least',
  'is_empty',
] as const
const SCALAR_OPERATORS = ['eq', 'neq', 'in', 'not_in', 'exists', 'missing'] as const
const CREATED_DATE_OPERATORS = ['before', 'after', 'between', 'within_last'] as const
const FUTURE_DATE_OPERATORS = [
  'before',
  'after',
  'between',
  'within_last',
  'within_next',
  'overdue',
] as const
const STRICT_EFFECTS = ['require', 'exclude'] as const
const FACET_COUNT_MODES = ['constrained', 'self_excluding'] as const
const BOOLEAN_OPERATORS = ['is_true', 'is_false', 'is_unknown'] as const

function field(
  input: Pick<TaskDiscoverySemanticField, 'key' | 'type' | 'operators'> &
    Partial<Omit<TaskDiscoverySemanticField, 'key' | 'type' | 'operators'>>
): TaskDiscoverySemanticField {
  return {
    key: input.key,
    type: input.type,
    operators: input.operators,
    effects: input.effects ?? STRICT_EFFECTS,
    defaultUnknown: input.defaultUnknown ?? 'exclude',
    facetable: input.facetable ?? true,
    sortable: input.sortable ?? false,
    projectable: input.projectable ?? true,
    preference: input.preference ?? false,
    valueSearch: input.valueSearch ?? false,
    facetCountModes: input.facetCountModes ?? FACET_COUNT_MODES,
    cost: input.cost ?? 1,
  }
}

function taxonomyField(key: string): TaskDiscoverySemanticField {
  return field({
    key,
    type: 'multi_value',
    operators: SET_OPERATORS,
    preference: true,
    valueSearch: true,
    cost: 2,
  })
}

const ANONYMOUS_FIELDS: readonly TaskDiscoverySemanticField[] = [
  taxonomyField('taxonomy.requiredSkills'),
  taxonomyField('taxonomy.canonicalTerms'),
  taxonomyField('taxonomy.skillCategories'),
  taxonomyField('taxonomy.businessDomains'),
  taxonomyField('taxonomy.domainTags'),
  taxonomyField('taxonomy.problemCategories'),
  taxonomyField('taxonomy.taskTypes'),
  taxonomyField('taxonomy.technologies'),
  field({
    key: 'task.difficulty',
    type: 'scalar',
    operators: SCALAR_OPERATORS,
    preference: true,
  }),
  field({
    key: 'task.marketplaceEligible',
    type: 'boolean',
    operators: BOOLEAN_OPERATORS,
  }),
  field({
    key: 'task.organizationId',
    type: 'scalar',
    operators: SCALAR_OPERATORS,
    valueSearch: true,
  }),
  field({
    key: 'task.projectId',
    type: 'scalar',
    operators: SCALAR_OPERATORS,
    valueSearch: true,
  }),
  field({
    key: 'task.createdAt',
    type: 'date_time',
    operators: CREATED_DATE_OPERATORS,
    sortable: true,
  }),
  field({
    key: 'task.updatedAt',
    type: 'date_time',
    operators: CREATED_DATE_OPERATORS,
    sortable: true,
  }),
  field({
    key: 'task.dueAt',
    type: 'date_time',
    operators: FUTURE_DATE_OPERATORS,
    sortable: true,
  }),
  field({
    key: 'task.applicationDeadline',
    type: 'date_time',
    operators: FUTURE_DATE_OPERATORS,
    sortable: true,
  }),
]

const AUTHENTICATED_PUBLIC_FIELDS: readonly TaskDiscoverySemanticField[] = [
  ...ANONYMOUS_FIELDS,
  field({ key: 'task.priority', type: 'scalar', operators: SCALAR_OPERATORS }),
  field({ key: 'task.verificationMethod', type: 'scalar', operators: SCALAR_OPERATORS }),
  field({
    key: 'task.role',
    type: 'scalar',
    operators: SCALAR_OPERATORS,
    preference: true,
    valueSearch: true,
  }),
]

const MEMBER_FIELDS: readonly TaskDiscoverySemanticField[] = [
  ...AUTHENTICATED_PUBLIC_FIELDS,
  field({ key: 'task.workflowState', type: 'scalar', operators: SCALAR_OPERATORS }),
]

export const TASK_DISCOVERY_ALL_SEMANTIC_FIELDS: readonly TaskDiscoverySemanticField[] =
  MEMBER_FIELDS

export function taskDiscoverySemanticFields(
  audience: TaskDiscoveryAudience
): readonly TaskDiscoverySemanticField[] {
  const fields =
    audience === 'anonymous'
      ? ANONYMOUS_FIELDS
      : audience === 'public'
        ? AUTHENTICATED_PUBLIC_FIELDS
        : MEMBER_FIELDS
  return structuredClone(fields)
}

export function taskDiscoverySorts(): readonly TaskDiscoverySort[] {
  return [
    { field: 'task.createdAt', directions: ['asc', 'desc'] },
    { field: 'task.updatedAt', directions: ['asc', 'desc'] },
    { field: 'task.dueAt', directions: ['asc', 'desc'] },
    { field: 'task.applicationDeadline', directions: ['asc', 'desc'] },
  ]
}
