import {
  AUDIT_LOG_FILTER_BINDINGS,
  type AuditLogFilterBinding,
} from '#modules/audit/infra/adapters/filtering/audit_log_filter_semantic_bindings'
import type {
  AuditLogFilterExecutorInput,
  FilterAuditLogsQuery,
} from '#modules/audit/infra/repositories/read/filter_audit_logs_query'
import type { AdminAuditLogRecord } from '#modules/audit/public_contracts/audit_read_contract'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { FilterDiagnostic } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { FilterFacetGroup } from '#modules/filtering/public_contracts/filter_facets'

export const POSTGRES_AUDIT_LOG_FILTER_PROFILE = 'postgres.audit.admin.investigation.v1'

interface PostgresAuditLogFilterExecutorOptions {
  readonly query: FilterAuditLogsQuery
  readonly clock?: () => Date
}

export interface AuditLogFilterExecutorResult<TAuthorization extends object> {
  readonly hits: readonly AdminAuditLogRecord[]
  readonly total: { readonly value: number; readonly relation: 'eq' }
  readonly facets: readonly FilterFacetGroup[]
  readonly suggestions: readonly string[]
  readonly diagnostics: readonly FilterDiagnostic[]
  readonly page: { readonly nextCursor?: string; readonly previousCursor?: string }
  readonly provider: string
  readonly degraded: boolean
  readonly partial: boolean
  readonly authorizationEvidence: {
    readonly hits: TAuthorization
    readonly total: TAuthorization
    readonly facets: TAuthorization
    readonly suggestions: TAuthorization
    readonly page: TAuthorization
  }
}

function fieldOperators(): Readonly<Record<string, readonly string[]>> {
  return Object.fromEntries(
    Object.values(AUDIT_LOG_FILTER_BINDINGS).map((binding: AuditLogFilterBinding) => [
      binding.field,
      [...binding.operators],
    ])
  )
}

function countConditions(expression: AuditLogFilterExecutorInput['eligibilityFilter']): number {
  if (expression === undefined) return 0
  if (expression.kind === 'condition') return 1
  return expression.children.reduce((count, child) => count + countConditions(child), 0)
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new FilterExecutionError('FILTER_REQUEST_ABORTED')
}

export class PostgresAuditLogFilterExecutor {
  readonly profile = POSTGRES_AUDIT_LOG_FILTER_PROFILE
  readonly #clock: () => Date
  readonly #query: FilterAuditLogsQuery

  constructor(options: PostgresAuditLogFilterExecutorOptions) {
    this.#clock = options.clock ?? (() => new Date())
    this.#query = options.query
  }

  describeCapabilities() {
    return {
      text: true,
      facets: true,
      nestedGroups: true,
      preferences: false,
      relativeTime: true,
      relations: false,
      pagination: ['offset'],
      facetCountModes: ['constrained', 'self_excluding'],
      totalRelations: ['eq'],
      maxDepth: 4,
      maxConditions: 32,
      maxPageSize: 100,
      maxFacetRequests: 8,
      maxProjectionFields: 10,
      maxSorts: 1,
      maxCost: 160,
      fieldOperators: fieldOperators(),
    } as const
  }

  estimateCost<TAuthorization extends object>(
    input: AuditLogFilterExecutorInput<TAuthorization>
  ): Promise<number> {
    const conditionCost = countConditions(input.eligibilityFilter ?? input.criteria.filter)
    const facetCost = (input.criteria.requestedFacets?.length ?? 0) * 4
    return Promise.resolve(conditionCost + facetCost + Math.ceil(input.criteria.page.size / 10))
  }

  async execute<TAuthorization extends object>(
    input: AuditLogFilterExecutorInput<TAuthorization>
  ): Promise<AuditLogFilterExecutorResult<TAuthorization>> {
    throwIfAborted(input.signal)
    const now = this.#clock()
    if (!Number.isFinite(now.getTime())) {
      throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
    }

    try {
      const result = await this.#query.execute(input, new Date(now))
      throwIfAborted(input.signal)
      return {
        hits: result.hits,
        total: { value: result.total, relation: 'eq' },
        facets: result.facets,
        suggestions: [],
        diagnostics: [],
        page: {},
        provider: this.profile,
        degraded: false,
        partial: false,
        authorizationEvidence: {
          hits: input.authorizationBinding,
          total: input.authorizationBinding,
          facets: input.authorizationBinding,
          suggestions: input.authorizationBinding,
          page: input.authorizationBinding,
        },
      }
    } catch (error) {
      if (error instanceof FilterExecutionError) throw error
      throw new FilterExecutionError('FILTER_EXECUTOR_UNAVAILABLE')
    }
  }
}
