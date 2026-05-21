import type { FilterObservabilitySink } from '#modules/filtering/actions/ports/outbound/filter_observability_sink'
import type { FilterPermissionConstraintProvider } from '#modules/filtering/actions/ports/outbound/filter_permission_constraint_provider'
import type { FilterQueryExecutorResolver } from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import type { FilterHashGenerator } from '#modules/filtering/domain/filtering-core/filter_hash'
import type {
  FilterContextProvider,
  FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

export interface ExecuteFilterQueryDependencies {
  readonly contextProvider: FilterContextProvider
  readonly permissionProvider: FilterPermissionConstraintProvider
  readonly executorResolver: FilterQueryExecutorResolver
  readonly observabilitySink?: FilterObservabilitySink
  readonly timeoutMs: number
  readonly hashGenerator: FilterHashGenerator
}

export interface ExecuteFilterQueryInput {
  readonly criteria: QueryCriteriaRequest
  readonly principal: FilterPrincipal
  readonly requestId: string
  readonly signal?: AbortSignal
}

export interface RuntimeRecord {
  readonly [key: string]: unknown
  readonly authorizationEvidence?: unknown
  readonly authorizationVersion?: unknown
  readonly capabilities?: unknown
  readonly children?: unknown
  readonly code?: unknown
  readonly cost?: unknown
  readonly count?: unknown
  readonly countMode?: unknown
  readonly countRelation?: unknown
  readonly defaultSort?: unknown
  readonly defaultUnknown?: unknown
  readonly degraded?: unknown
  readonly degradationPolicy?: unknown
  readonly diagnostics?: unknown
  readonly directions?: unknown
  readonly effects?: unknown
  readonly executionProfile?: unknown
  readonly expression?: unknown
  readonly facetCountModes?: unknown
  readonly facetable?: unknown
  readonly facets?: unknown
  readonly field?: unknown
  readonly fieldBindings?: unknown
  readonly fieldOperators?: unknown
  readonly fields?: unknown
  readonly hits?: unknown
  readonly id?: unknown
  readonly key?: unknown
  readonly kind?: unknown
  readonly limits?: unknown
  readonly maxConditions?: unknown
  readonly maxDepth?: unknown
  readonly nextCursor?: unknown
  readonly operators?: unknown
  readonly organizationId?: unknown
  readonly organizationRole?: unknown
  readonly ownerModule?: unknown
  readonly page?: unknown
  readonly pagination?: unknown
  readonly partial?: unknown
  readonly preference?: unknown
  readonly previousCursor?: unknown
  readonly projectable?: unknown
  readonly provider?: unknown
  readonly relation?: unknown
  readonly resource?: unknown
  readonly selected?: unknown
  readonly severity?: unknown
  readonly sortable?: unknown
  readonly sorts?: unknown
  readonly suggestions?: unknown
  readonly total?: unknown
  readonly totalRelations?: unknown
  readonly type?: unknown
  readonly value?: unknown
  readonly valueSearch?: unknown
  readonly values?: unknown
  readonly version?: unknown
}

export const SAFE_DIAGNOSTIC_CODES: ReadonlySet<string> = new Set([
  'FILTER_CONTEXT_MISMATCH',
  'FILTER_SCHEMA_VERSION_MISMATCH',
  'FILTER_CONTEXT_UNAVAILABLE',
  'FILTER_CRITERIA_INVALID',
  'FILTER_CURSOR_INVALID',
  'FILTER_CURSOR_EXPIRED',
  'FILTER_CURSOR_STALE',
  'FILTER_PERMISSION_UNAVAILABLE',
  'FILTER_PERMISSION_INVALID',
  'FILTER_PERMISSION_CHANGED',
  'FILTER_EXECUTOR_UNAVAILABLE',
  'FILTER_EXECUTOR_CAPABILITY_MISMATCH',
  'FILTER_EXECUTOR_RESPONSE_INVALID',
  'FILTER_COST_LIMIT_EXCEEDED',
  'FILTER_DEGRADED_NOT_ALLOWED',
  'FILTER_PROVIDER_DEGRADED',
  'FILTER_PROVIDER_TIMED_OUT',
  'FILTER_REQUEST_ABORTED',
])
