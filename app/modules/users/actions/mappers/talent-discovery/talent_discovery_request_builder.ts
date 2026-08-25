import type { FilterExpression } from '#modules/filtering/public_contracts/filter_contracts'
import type {
  SearchDiscoveryRequest,
} from '#modules/search/public_contracts/search_discovery_contract'
import { findCanonicalProficiencyLevelOption } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_catalog'
import type { SearchTalentsDTO } from '#modules/users/public_contracts/talent_search'

export const TALENT_DISCOVERY_CONTEXT = 'talents.discovery.organization' as const

const FACET_FIELDS = [
  'talent.skills',
  'talent.businessDomains',
  'talent.taskTypes',
  'talent.problemCategories',
  'talent.technologies',
  'talent.availableFrom',
] as const

export class TalentDiscoveryRequestError extends Error {
  override readonly name = 'TalentDiscoveryRequestError'
}

export function buildTalentDiscoveryRequest(
  input: SearchTalentsDTO,
  page: { readonly cursor?: string } = {}
): SearchDiscoveryRequest {
  rejectUnsupportedInput(input)

  const pageNumber = input.page ?? 1
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) {
    throw new TalentDiscoveryRequestError('Talent discovery page must be a positive integer')
  }
  if (pageNumber > 1 && page.cursor === undefined) {
    throw new TalentDiscoveryRequestError(
      'Talent discovery requires an opaque cursor instead of a page offset'
    )
  }
  if (page.cursor !== undefined && page.cursor.length === 0) {
    throw new TalentDiscoveryRequestError('Talent discovery cursor cannot be empty')
  }

  const size = input.per_page ?? 20
  if (!Number.isSafeInteger(size) || size < 1 || size > 50) {
    throw new TalentDiscoveryRequestError('Talent discovery page size is out of bounds')
  }

  const conditions: FilterExpression[] = []
  addSetCondition(conditions, 'talent.skills', input.skill_ids, 'contains_all')
  addScalarSetCondition(conditions, 'talent.businessDomains', input.business_domain)
  addScalarSetCondition(conditions, 'talent.taskTypes', input.task_type)
  addScalarSetCondition(conditions, 'talent.problemCategories', input.problem_category)
  addScalarSetCondition(conditions, 'talent.technologies', input.tech_stack)
  addNumberCondition(conditions, 'talent.trustScore', input.min_trust_score)
  addNumberCondition(conditions, 'talent.completedTasks', input.min_completed_tasks)
  addDateBeforeCondition(conditions, 'talent.availableFrom', input.available_before)
  addProficiencyCondition(conditions, input.skill_ids, input.min_proficiency)

  const sort =
    input.sort_by === 'trust_score' || input.sort_by === 'completed_tasks'
      ? [
          {
            field:
              input.sort_by === 'trust_score' ? 'talent.trustScore' : 'talent.completedTasks',
            direction: input.sort_order ?? 'desc',
          } as const,
        ]
      : []

  return {
    criteria: {
      context: TALENT_DISCOVERY_CONTEXT,
      schemaVersion: 1,
      ...(input.q?.trim() ? { text: { value: input.q.trim() } } : {}),
      ...(conditions.length === 0
        ? {}
        : {
            filter:
              conditions.length === 1
                ? conditions[0]
                : {
                    kind: 'group' as const,
                    combinator: 'and' as const,
                    children: conditions,
                  },
          }),
      sort,
      requestedFacets: FACET_FIELDS.map((field) => ({
        field,
        countMode: 'self_excluding' as const,
      })),
      page: {
        size,
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      },
    },
    search: { scope: 'talent', retrievalMode: 'auto' },
  }
}

function rejectUnsupportedInput(input: SearchTalentsDTO): void {
  const unsupported = [
    ['task_id', input.task_id],
    ['skill_categories', input.skill_categories],
    ['role_in_task', input.role_in_task],
    ['domain_tags', input.domain_tags],
    ['saved', input.saved],
  ].find(([, value]) => value !== undefined && value !== null)

  if (unsupported !== undefined) {
    throw new TalentDiscoveryRequestError(
      `Talent discovery filter is not supported by the canonical index: ${String(unsupported[0])}`
    )
  }

  if (input.sort_by !== undefined && input.sort_by !== 'trust_score' && input.sort_by !== 'completed_tasks') {
    throw new TalentDiscoveryRequestError(
      `Talent discovery sort is not supported by the canonical index: ${input.sort_by}`
    )
  }

  if (input.sort_by === undefined && input.sort_order !== undefined) {
    throw new TalentDiscoveryRequestError(
      'Talent discovery sort order requires an explicitly supported sort'
    )
  }
}

function addSetCondition(
  conditions: FilterExpression[],
  field: string,
  values?: string[] | null,
  operator: 'contains_any' | 'contains_all' = 'contains_any'
) {
  if (!values || values.length === 0) return
  conditions.push({
    kind: 'condition',
    field,
    operator,
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'set', values: [...new Set(values)] },
  })
}

function addScalarSetCondition(conditions: FilterExpression[], field: string, value?: string | null) {
  if (!value?.trim()) return
  addSetCondition(conditions, field, [value.trim()])
}

function addNumberCondition(conditions: FilterExpression[], field: string, value?: number) {
  if (value === undefined) return
  if (!Number.isFinite(value)) {
    throw new TalentDiscoveryRequestError(`Talent discovery numeric filter is invalid: ${field}`)
  }
  conditions.push({
    kind: 'condition',
    field,
    operator: 'gte',
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'scalar', value },
  })
}

function addDateBeforeCondition(conditions: FilterExpression[], field: string, value?: string): void {
  if (value === undefined) return
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) {
    throw new TalentDiscoveryRequestError(`Talent discovery date filter is invalid: ${field}`)
  }
  const normalized = new Date(parsed).toISOString()
  conditions.push({
    kind: 'condition',
    field,
    operator: 'before',
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'scalar', value: normalized },
  })
}

function addProficiencyCondition(
  conditions: FilterExpression[],
  skillIds?: string[] | null,
  minimum?: string
): void {
  if (minimum === undefined) return
  const option = findCanonicalProficiencyLevelOption(minimum)
  if (!option) {
    throw new TalentDiscoveryRequestError(`Talent proficiency level is invalid: ${minimum}`)
  }
  const children: FilterExpression[] = []
  if (skillIds && skillIds.length > 0) {
    children.push({
      kind: 'condition',
      field: 'skillId',
      operator: 'in',
      effect: 'require',
      unknown: 'exclude',
      value: { kind: 'set', values: [...new Set(skillIds)] },
    })
  }
  children.push({
    kind: 'condition',
    field: 'proficiencyOrder',
    operator: 'gte',
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'scalar', value: option.order },
  })
  const expression =
    children.length === 1
      ? children[0]
      : { kind: 'group' as const, combinator: 'and' as const, children }
  if (expression === undefined) return
  conditions.push({
    kind: 'condition',
    field: 'talent.skillEvidence',
    operator: 'related_matches',
    effect: 'require',
    unknown: 'exclude',
    value: {
      kind: 'relation',
      expression,
    },
  })
}
