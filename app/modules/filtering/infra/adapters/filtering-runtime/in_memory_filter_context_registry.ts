import type {
  FilterExecutorCapabilities,
  FilterQueryExecutor,
  FilterQueryExecutorResolver,
} from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import { validateFilterExpression } from '#modules/filtering/domain/filtering-core/filter_validator'
import {
  FilterContextResolutionError,
  type FilterContextProvider,
  type FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'

type FilterContextAuthorizer = (principal: FilterPrincipal) => boolean

interface RegisteredContext {
  definition: FilterContextDefinition
  authorize: FilterContextAuthorizer
}

export type FilterRegistryConfigurationCode =
  | 'FILTER_CONTEXT_DUPLICATE'
  | 'FILTER_EXECUTOR_DUPLICATE'
  | 'FILTER_EXECUTOR_MISSING'
  | 'FILTER_EXECUTOR_CAPABILITY_MISMATCH'
  | 'FILTER_EXECUTOR_FIELD_BINDING_MISMATCH'
  | 'FILTER_EXECUTOR_LIMIT_MISMATCH'
  | 'FILTER_EXECUTOR_PAGINATION_MISMATCH'
  | 'FILTER_CONTEXT_DEFINITION_INVALID'
  | 'FILTER_REGISTRY_NOT_INITIALIZED'
  | 'FILTER_REGISTRY_SEALED'

export class FilterRegistryConfigurationError extends Error {
  constructor(public readonly codes: readonly FilterRegistryConfigurationCode[]) {
    super('Filter registry configuration is invalid')
    this.name = 'FilterRegistryConfigurationError'
  }
}

export function assertFilterContextExecutorCompatibility(
  definition: FilterContextDefinition,
  executor: FilterExecutorCapabilities
): void {
  const codes = new Set<FilterRegistryConfigurationCode>()
  const context = definition.capabilities

  for (const capability of [
    'text',
    'facets',
    'nestedGroups',
    'preferences',
    'relativeTime',
  ] as const) {
    if (context[capability] && !executor[capability]) {
      codes.add('FILTER_EXECUTOR_CAPABILITY_MISMATCH')
    }
  }
  if (definition.fields.some((field) => field.type === 'relation' && !executor.relations)) {
    codes.add('FILTER_EXECUTOR_CAPABILITY_MISMATCH')
  }
  if (!executor.pagination.includes(context.pagination)) {
    codes.add('FILTER_EXECUTOR_PAGINATION_MISMATCH')
  }
  if (
    context.maxDepth > executor.maxDepth ||
    context.maxConditions > executor.maxConditions ||
    definition.limits.maxPageSize > executor.maxPageSize ||
    definition.limits.maxFacetRequests > executor.maxFacetRequests ||
    definition.limits.maxProjectionFields > executor.maxProjectionFields ||
    definition.limits.maxSorts > executor.maxSorts ||
    definition.limits.maxCost > executor.maxCost
  ) {
    codes.add('FILTER_EXECUTOR_LIMIT_MISMATCH')
  }

  for (const field of definition.fields) {
    const supportedOperators = Object.hasOwn(executor.fieldOperators, field.key)
      ? executor.fieldOperators[field.key]
      : undefined
    if (
      supportedOperators === undefined ||
      field.operators.some((operator) => !supportedOperators.includes(operator)) ||
      field.facetCountModes.some((mode) => !executor.facetCountModes.includes(mode))
    ) {
      codes.add('FILTER_EXECUTOR_FIELD_BINDING_MISMATCH')
    }
  }

  if (codes.size > 0) {
    throw new FilterRegistryConfigurationError([...codes].sort())
  }
}

export class InMemoryFilterContextRegistry
  implements FilterContextProvider, FilterQueryExecutorResolver
{
  readonly #contexts = new Map<string, RegisteredContext>()
  readonly #executors = new Map<string, FilterQueryExecutor>()
  #initialized = false

  registerContext(
    definition: FilterContextDefinition,
    authorize: FilterContextAuthorizer = () => true
  ): void {
    this.assertMutable()
    if (this.#contexts.has(definition.key)) {
      throw new FilterRegistryConfigurationError(['FILTER_CONTEXT_DUPLICATE'])
    }
    this.#contexts.set(definition.key, { definition, authorize })
  }

  registerExecutor(executor: FilterQueryExecutor): void {
    this.assertMutable()
    if (this.#executors.has(executor.profile)) {
      throw new FilterRegistryConfigurationError(['FILTER_EXECUTOR_DUPLICATE'])
    }
    this.#executors.set(executor.profile, executor)
  }

  getEffectiveDefinition(input: {
    context: string
    principal: FilterPrincipal
  }): Promise<FilterContextDefinition> {
    this.assertInitialized()
    const registration = this.#contexts.get(input.context)
    if (!registration || !registration.authorize(input.principal)) {
      return Promise.reject(new FilterContextResolutionError())
    }
    return Promise.resolve(registration.definition)
  }

  getExecutor(profile: string): FilterQueryExecutor {
    this.assertInitialized()
    const executor = this.#executors.get(profile)
    if (!executor) {
      throw new FilterRegistryConfigurationError(['FILTER_EXECUTOR_MISSING'])
    }
    return executor
  }

  initialize(): void {
    if (this.#initialized) return
    for (const { definition } of this.#contexts.values()) {
      assertFilterContextDefinition(definition)
      const executor = this.#executors.get(definition.executionProfile)
      if (!executor) {
        throw new FilterRegistryConfigurationError(['FILTER_EXECUTOR_MISSING'])
      }
      try {
        assertFilterContextExecutorCompatibility(definition, executor.describeCapabilities())
      } catch (error) {
        if (error instanceof FilterRegistryConfigurationError) throw error
        throw new FilterRegistryConfigurationError(['FILTER_EXECUTOR_CAPABILITY_MISMATCH'])
      }
    }
    this.#initialized = true
  }

  private assertMutable(): void {
    if (this.#initialized) {
      throw new FilterRegistryConfigurationError(['FILTER_REGISTRY_SEALED'])
    }
  }

  private assertInitialized(): void {
    if (!this.#initialized) {
      throw new FilterRegistryConfigurationError(['FILTER_REGISTRY_NOT_INITIALIZED'])
    }
  }
}

function assertFilterContextDefinition(definition: FilterContextDefinition): void {
  const fields = new Map(definition.fields.map((field) => [field.key, field]))
  const invalid =
    fields.size !== definition.fields.length ||
    new Set(definition.sorts.map(({ field }) => field)).size !== definition.sorts.length ||
    definition.sorts.some(({ field, directions }) => {
      const configured = fields.get(field)
      return configured?.sortable !== true || directions.length === 0
    }) ||
    definition.defaultSort.length > definition.limits.maxSorts ||
    definition.defaultSort.some(({ field, direction }) => {
      const sort = definition.sorts.find((candidate) => candidate.field === field)
      return !sort?.directions.includes(direction)
    })
  if (invalid) {
    throw new FilterRegistryConfigurationError(['FILTER_CONTEXT_DEFINITION_INVALID'])
  }

  if (definition.defaultFilter !== undefined) {
    const allowedFields = Object.fromEntries(
      definition.fields.map((field) => [
        field.key,
        {
          type: field.type,
          operators: field.operators,
          ...(field.relationFields === undefined ? {} : { relationFields: field.relationFields }),
        },
      ])
    )
    const validation = validateFilterExpression(definition.defaultFilter, {
      allowedFields,
      limits: {
        maxDepth: definition.capabilities.maxDepth,
        maxConditions: definition.capabilities.maxConditions,
        maxSetValues: definition.limits.maxSetValues,
        maxTextLength: definition.limits.maxTextLength,
        maxRelationDepth: definition.limits.maxRelationDepth,
      },
    })
    if (!validation.valid) {
      throw new FilterRegistryConfigurationError(['FILTER_CONTEXT_DEFINITION_INVALID'])
    }
  }
}
