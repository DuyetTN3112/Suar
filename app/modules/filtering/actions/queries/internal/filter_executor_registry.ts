import type {
  FilterExecutorCapabilities,
  FilterQueryExecutor,
  FilterQueryExecutorResolver,
} from '#modules/filtering/actions/ports/outbound/filter_query_executor'

export type FilterExecutorRegistryErrorCode =
  | 'FILTER_EXECUTOR_REGISTRY_DUPLICATE'
  | 'FILTER_EXECUTOR_REGISTRY_REQUIREMENT_DUPLICATE'
  | 'FILTER_EXECUTOR_REGISTRY_MISSING'
  | 'FILTER_EXECUTOR_REGISTRY_CAPABILITY_MISMATCH'
  | 'FILTER_EXECUTOR_REGISTRY_NOT_INITIALIZED'
  | 'FILTER_EXECUTOR_REGISTRY_SEALED'

export interface FilterExecutorRequirement {
  readonly profile: string
  readonly capabilities: FilterExecutorCapabilities
}

export class FilterExecutorRegistryError extends Error {
  constructor(public readonly codes: readonly FilterExecutorRegistryErrorCode[]) {
    super('Filter executor registry configuration is invalid')
    this.name = 'FilterExecutorRegistryError'
  }
}

export class FilterExecutorRegistry implements FilterQueryExecutorResolver {
  readonly #executors = new Map<string, FilterQueryExecutor>()
  readonly #requirements = new Map<string, FilterExecutorCapabilities>()
  #initialized = false

  register(executor: FilterQueryExecutor): void {
    this.#assertMutable()
    if (!isBoundedProfile(executor.profile)) {
      throw new FilterExecutorRegistryError(['FILTER_EXECUTOR_REGISTRY_CAPABILITY_MISMATCH'])
    }
    if (this.#executors.has(executor.profile)) {
      throw new FilterExecutorRegistryError(['FILTER_EXECUTOR_REGISTRY_DUPLICATE'])
    }
    this.#executors.set(executor.profile, executor)
  }

  require(requirement: FilterExecutorRequirement): void {
    this.#assertMutable()
    if (!isBoundedProfile(requirement.profile) || !isCapabilities(requirement.capabilities)) {
      throw new FilterExecutorRegistryError(['FILTER_EXECUTOR_REGISTRY_CAPABILITY_MISMATCH'])
    }
    if (this.#requirements.has(requirement.profile)) {
      throw new FilterExecutorRegistryError(['FILTER_EXECUTOR_REGISTRY_REQUIREMENT_DUPLICATE'])
    }
    this.#requirements.set(requirement.profile, structuredClone(requirement.capabilities))
  }

  initialize(): void {
    if (this.#initialized) return
    if ([...this.#requirements.keys()].some((profile) => !this.#executors.has(profile))) {
      throw new FilterExecutorRegistryError(['FILTER_EXECUTOR_REGISTRY_MISSING'])
    }

    try {
      for (const [profile, executor] of this.#executors) {
        if (
          typeof executor.describeCapabilities !== 'function' ||
          typeof executor.estimateCost !== 'function' ||
          typeof executor.execute !== 'function'
        ) {
          throw new TypeError('Malformed executor')
        }
        const actual = executor.describeCapabilities()
        const required = this.#requirements.get(profile)
        if (!isCapabilities(actual) || (required !== undefined && !satisfies(actual, required))) {
          throw new TypeError('Incompatible executor')
        }
      }
    } catch {
      throw new FilterExecutorRegistryError(['FILTER_EXECUTOR_REGISTRY_CAPABILITY_MISMATCH'])
    }
    this.#initialized = true
  }

  getExecutor(profile: string): FilterQueryExecutor | undefined {
    if (!this.#initialized) {
      throw new FilterExecutorRegistryError(['FILTER_EXECUTOR_REGISTRY_NOT_INITIALIZED'])
    }
    return this.#executors.get(profile)
  }

  #assertMutable(): void {
    if (this.#initialized) {
      throw new FilterExecutorRegistryError(['FILTER_EXECUTOR_REGISTRY_SEALED'])
    }
  }
}

function isBoundedProfile(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 128
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isDistinctEnumArray(value: unknown, allowed: ReadonlySet<string>): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= allowed.size &&
    value.every((entry) => typeof entry === 'string' && allowed.has(entry)) &&
    new Set(value).size === value.length
  )
}

function isCapabilities(value: unknown): value is FilterExecutorCapabilities {
  if (!isRecord(value) || !isRecord(value['fieldOperators'])) return false
  for (const key of [
    'text',
    'facets',
    'nestedGroups',
    'preferences',
    'relativeTime',
    'relations',
  ]) {
    if (typeof value[key] !== 'boolean') return false
  }
  for (const key of [
    'maxDepth',
    'maxConditions',
    'maxPageSize',
    'maxFacetRequests',
    'maxProjectionFields',
    'maxSorts',
    'maxCost',
  ]) {
    if (!Number.isSafeInteger(value[key]) || Number(value[key]) < 0) return false
  }
  if (
    !isDistinctEnumArray(value['pagination'], new Set(['cursor', 'offset', 'bounded', 'none'])) ||
    !isDistinctEnumArray(value['facetCountModes'], new Set(['constrained', 'self_excluding'])) ||
    !isDistinctEnumArray(value['totalRelations'], new Set(['eq', 'gte', 'unknown']))
  ) {
    return false
  }
  const bindings = Object.entries(value['fieldOperators'])
  return (
    bindings.length <= 1_000 &&
    bindings.every(
      ([field, operators]) =>
        field.trim().length > 0 &&
        field.length <= 512 &&
        Array.isArray(operators) &&
        operators.length <= 100 &&
        operators.every((operator) => typeof operator === 'string' && operator.trim().length > 0) &&
        new Set(operators).size === operators.length
    )
  )
}

function satisfies(
  actual: FilterExecutorCapabilities,
  required: FilterExecutorCapabilities
): boolean {
  for (const capability of [
    'text',
    'facets',
    'nestedGroups',
    'preferences',
    'relativeTime',
    'relations',
  ] as const) {
    if (required[capability] && !actual[capability]) return false
  }
  if (
    !required.pagination.every((mode) => actual.pagination.includes(mode)) ||
    !required.facetCountModes.every((mode) => actual.facetCountModes.includes(mode)) ||
    !required.totalRelations.every((relation) => actual.totalRelations.includes(relation))
  ) {
    return false
  }
  for (const limit of [
    'maxDepth',
    'maxConditions',
    'maxPageSize',
    'maxFacetRequests',
    'maxProjectionFields',
    'maxSorts',
    'maxCost',
  ] as const) {
    if (actual[limit] < required[limit]) return false
  }
  return Object.entries(required.fieldOperators).every(([field, operators]) => {
    const actualOperators = Object.hasOwn(actual.fieldOperators, field)
      ? actual.fieldOperators[field]
      : undefined
    return (
      actualOperators !== undefined &&
      operators.every((operator) => actualOperators.includes(operator))
    )
  })
}
