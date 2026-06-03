import type { ExecuteFilterQueryDependencies, ExecuteFilterQueryInput } from './execute_filter_query_types.js'
import { SAFE_DIAGNOSTIC_CODES } from './execute_filter_query_types.js'
import {
  validateRequestIdentity,
  toObservabilityExecutor,
  throwIfAborted,
  validateContextIdentity,
  validateAndCanonicalizeCriteria,
  validateExecutorCompatibility,
  composeEligibilityFilter,
  createAuthorizationBinding,
  cloneAndFreezeDefinition,
  validateAndSanitizeExecutorResult,
  permissionFingerprint,
  fingerprintEffectiveContext,
  snapshotPrincipal,
  deepFreeze,
  isFilterContextDefinitionEnvelope,
  isPermissionConstraint,
  validateMandatoryEffects
} from './execute_filter_query_validators.js'

import { BaseQuery } from '#modules/filtering/actions/base_query'
import {
  noopFilterObservabilitySink,
} from '#modules/filtering/actions/ports/outbound/filter_observability_sink'
import type { FilterPermissionConstraint } from '#modules/filtering/actions/ports/outbound/filter_permission_constraint_provider'
import type { FilterExecutorInput, FilterQueryExecutor } from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import { canonicalizeFilterExpression } from '#modules/filtering/domain/filtering-core/filter_canonicalizer'
import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import { validateFilterExpression } from '#modules/filtering/domain/filtering-core/filter_validator'
import { buildFilterObservabilityEvent } from '#modules/filtering/observability/filtering-observability/filter_event_factory'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
import { FilterExecutionError, type FilterDiagnosticCode } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaResponse, QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

export class ExecuteFilterQuery extends BaseQuery {
  constructor(private readonly dependencies: ExecuteFilterQueryDependencies) {
    super()
  }

  async executeAndWrap<T = unknown>(input: ExecuteFilterQueryInput) {
    return this.wrap(() => this.execute<T>(input))
  }

  async execute<T = unknown>(input: ExecuteFilterQueryInput): Promise<QueryCriteriaResponse<T>> {
    validateRequestIdentity(input.requestId)
    throwIfAborted(input.signal)

    const principal = snapshotPrincipal(input.principal)
    const executorAbort = new AbortController()
    const startedAt = Date.now()
    let definition: FilterContextDefinition | undefined
    let canonicalCriteria: QueryCriteriaRequest | undefined
    let executorProfile = 'unknown'
    const relayAbort = () => executorAbort.abort()
    input.signal?.addEventListener('abort', relayAbort, { once: true })

    try {
      definition = await this.resolveEffectiveDefinition(input.criteria, principal, input.signal)
      const effectiveContextFingerprint = fingerprintEffectiveContext(
        definition,
        this.dependencies.hashGenerator
      )
      canonicalCriteria = deepFreeze(validateAndCanonicalizeCriteria(input.criteria, definition))

      const executor = this.resolveExecutor(definition.executionProfile)
      executorProfile = executor.profile
      const capabilities = validateExecutorCompatibility(definition, executor)

      const permission = await this.resolveMandatoryFilter(definition, principal, input.signal)
      const eligibilityFilter = composeEligibilityFilter(
        permission.mandatoryFilter,
        canonicalCriteria.filter
      )
      const frozenMandatory =
        permission.mandatoryFilter === undefined
          ? undefined
          : deepFreeze(permission.mandatoryFilter)
      const frozenEligibility =
        eligibilityFilter === undefined ? undefined : deepFreeze(eligibilityFilter)
      const authorizationBinding = createAuthorizationBinding({
        definition,
        authorizationVersion: permission.authorizationVersion,
        hashGenerator: this.dependencies.hashGenerator,
        ...(frozenMandatory === undefined ? {} : { mandatoryFilter: frozenMandatory }),
        ...(frozenEligibility === undefined ? {} : { eligibilityFilter: frozenEligibility }),
        effectiveContextFingerprint,
      })
      const executorDefinition = cloneAndFreezeDefinition(definition)
      const executorInput: FilterExecutorInput = Object.freeze({
        definition: executorDefinition,
        criteria: canonicalCriteria,
        ...(frozenMandatory === undefined ? {} : { mandatoryFilter: frozenMandatory }),
        ...(frozenEligibility === undefined ? {} : { eligibilityFilter: frozenEligibility }),
        authorizationBinding,
        requestId: input.requestId,
        signal: executorAbort.signal,
      })

      const estimatedCost = await this.runStage(
        () => executor.estimateCost(executorInput),
        'FILTER_EXECUTOR_UNAVAILABLE',
        input.signal,
        executorAbort,
        'FILTER_PROVIDER_TIMED_OUT'
      )
      if (
        typeof estimatedCost !== 'number' ||
        !Number.isFinite(estimatedCost) ||
        estimatedCost < 0 ||
        estimatedCost > definition.limits.maxCost
      ) {
        throw new FilterExecutionError('FILTER_COST_LIMIT_EXCEEDED')
      }

      const rawResult: unknown = await this.runStage(
        () => executor.execute(executorInput),
        'FILTER_EXECUTOR_UNAVAILABLE',
        input.signal,
        executorAbort,
        'FILTER_PROVIDER_TIMED_OUT'
      )
      throwIfAborted(input.signal)
      const result = validateAndSanitizeExecutorResult<T>(
        rawResult,
        definition,
        canonicalCriteria,
        capabilities,
        executor.profile,
        authorizationBinding
      )

      const currentDefinition = await this.resolveEffectiveDefinition(
        input.criteria,
        principal,
        input.signal
      )
      if (
        fingerprintEffectiveContext(currentDefinition, this.dependencies.hashGenerator) !==
        effectiveContextFingerprint
      ) {
        throw new FilterExecutionError('FILTER_PERMISSION_CHANGED')
      }
      const currentPermission = await this.resolveMandatoryFilter(
        currentDefinition,
        principal,
        input.signal
      )
      if (
        permission.authorizationVersion !== currentPermission.authorizationVersion ||
        permissionFingerprint(permission.mandatoryFilter, this.dependencies.hashGenerator) !==
          permissionFingerprint(currentPermission.mandatoryFilter, this.dependencies.hashGenerator)
      ) {
        throw new FilterExecutionError('FILTER_PERMISSION_CHANGED')
      }

      await this.recordObservabilityEvent({
        eventName:
          result.degraded || result.partial ? 'filter.query.degraded' : 'filter.query.completed',
        requestId: input.requestId,
        criteria: canonicalCriteria,
        definition,
        executor: executor.profile,
        total: result.total,
        partial: result.partial,
        degraded: result.degraded,
        diagnostics: result.diagnostics,
        startedAt,
      })

      return {
        context: definition.key,
        schemaVersion: definition.version,
        canonicalCriteria,
        hits: result.hits,
        total: result.total,
        facets: result.facets,
        suggestions: result.suggestions,
        diagnostics: result.diagnostics,
        page: result.page,
        execution: {
          provider: result.provider,
          degraded: result.degraded,
          partial: result.partial,
          requestId: input.requestId,
        },
      }
    } catch (error) {
      await this.recordObservabilityEvent({
        eventName: 'filter.query.failed',
        requestId: input.requestId,
        criteria: canonicalCriteria ?? input.criteria,
        ...(definition === undefined ? {} : { definition }),
        executor: executorProfile,
        total: null,
        partial: false,
        degraded: false,
        timedOut:
          error instanceof FilterExecutionError && error.code === 'FILTER_PROVIDER_TIMED_OUT',
        diagnostics: error instanceof FilterExecutionError ? error.diagnostics : error,
        startedAt,
        failed: true,
      })
      throw error
    } finally {
      input.signal?.removeEventListener('abort', relayAbort)
    }
  }

  private async recordObservabilityEvent(input: {
    readonly eventName: string
    readonly requestId: string
    readonly criteria: unknown
    readonly definition?: FilterContextDefinition
    readonly executor: string
    readonly total: { readonly value: number; readonly relation: 'eq' | 'gte' | 'unknown' } | null
    readonly partial: boolean
    readonly degraded: boolean
    readonly timedOut?: boolean
    readonly diagnostics?: unknown
    readonly startedAt: number
    readonly failed?: boolean
  }): Promise<void> {
    try {
      const definition = input.definition
      const event = buildFilterObservabilityEvent({
        eventName: input.eventName,
        correlation: { requestId: input.requestId },
        versions: {
          context: definition?.key ?? 'unknown',
          schema: definition === undefined ? 'unknown' : String(definition.version),
          taxonomy: 'unknown',
          projection: 'unknown',
          ranking: 'unknown',
        },
        canonicalCriteria: input.criteria,
        executor: toObservabilityExecutor(input.executor),
        latency: { resultMs: Math.max(0, Date.now() - input.startedAt), facetMs: 0 },
        result: {
          countRelation: input.total?.relation === 'eq' ? 'eq' : 'gte',
          total: input.total?.value ?? null,
          partial: input.partial,
          degraded: input.degraded,
          timedOut: input.timedOut ?? false,
          zeroResult: input.total?.value === 0,
          coverage:
            input.definition === undefined ? 'unknown' : input.partial ? 'partial' : 'complete',
        },
        status: {
          migration: 'not_required',
          alert: 'not_evaluated',
          activation: input.failed ? 'blocked' : 'not_applicable',
          rollback: 'not_required',
        },
        ...(input.diagnostics === undefined ? {} : { diagnostics: input.diagnostics }),
      })
      await (this.dependencies.observabilitySink ?? noopFilterObservabilitySink).record(event)
    } catch {
      // Observability is best effort and must never change query semantics.
    }
  }

  private async resolveEffectiveDefinition(
    criteria: QueryCriteriaRequest,
    principal: FilterPrincipal,
    signal: AbortSignal | undefined
  ): Promise<FilterContextDefinition> {
    const rawDefinition: unknown = await this.runStage(
      () =>
        this.dependencies.contextProvider.getEffectiveDefinition({
          context: criteria.context,
          principal,
        }),
      'FILTER_CONTEXT_UNAVAILABLE',
      signal
    )
    let definition: FilterContextDefinition
    try {
      if (!isFilterContextDefinitionEnvelope(rawDefinition)) {
        throw new FilterExecutionError('FILTER_CONTEXT_UNAVAILABLE')
      }
      definition = rawDefinition
    } catch (error) {
      if (error instanceof FilterExecutionError) throw error
      throw new FilterExecutionError('FILTER_CONTEXT_UNAVAILABLE')
    }
    validateContextIdentity(criteria, definition)
    return definition
  }

  private resolveExecutor(profile: string): FilterQueryExecutor {
    try {
      const executor = this.dependencies.executorResolver.getExecutor(profile)
      if (!executor) throw new FilterExecutionError('FILTER_EXECUTOR_UNAVAILABLE')
      return executor
    } catch {
      throw new FilterExecutionError('FILTER_EXECUTOR_UNAVAILABLE')
    }
  }

  private async resolveMandatoryFilter(
    definition: FilterContextDefinition,
    principal: FilterPrincipal,
    signal: AbortSignal | undefined
  ): Promise<{ mandatoryFilter?: FilterExpression; authorizationVersion: string }> {
    const rawConstraint: unknown = await this.runStage(
      () =>
        this.dependencies.permissionProvider.buildMandatoryExpression({
          context: definition.key,
          principal,
        }),
      'FILTER_PERMISSION_UNAVAILABLE',
      signal
    )
    let constraint: FilterPermissionConstraint
    try {
      if (!isPermissionConstraint(rawConstraint, definition)) {
        throw new FilterExecutionError('FILTER_PERMISSION_INVALID')
      }
      constraint = rawConstraint
    } catch (error) {
      if (error instanceof FilterExecutionError) throw error
      throw new FilterExecutionError('FILTER_PERMISSION_INVALID')
    }
    if (constraint.expression === undefined) {
      return { authorizationVersion: constraint.authorizationVersion }
    }

    const allowedFields = Object.fromEntries(
      constraint.fieldBindings.map((binding) => [
        binding.field,
        { type: binding.type, operators: binding.operators },
      ])
    )
    const validation = validateFilterExpression(constraint.expression, {
      allowedFields,
      limits: {
        maxDepth: definition.capabilities.maxDepth,
        maxConditions: definition.capabilities.maxConditions,
        maxSetValues: definition.limits.maxSetValues,
        maxTextLength: definition.limits.maxTextLength,
        maxRelationDepth: definition.limits.maxRelationDepth,
      },
    })
    if (
      !validation.valid ||
      !validateMandatoryEffects(constraint.expression, constraint.fieldBindings)
    ) {
      throw new FilterExecutionError('FILTER_PERMISSION_INVALID')
    }
    return {
      mandatoryFilter: canonicalizeFilterExpression(constraint.expression),
      authorizationVersion: constraint.authorizationVersion,
    }
  }

  private async runStage<T>(
    operation: () => Promise<T>,
    failureCode: FilterDiagnosticCode,
    signal?: AbortSignal,
    abortOnTimeout?: AbortController,
    timeoutCode: FilterDiagnosticCode = failureCode
  ): Promise<T> {
    throwIfAborted(signal)
    let promise: Promise<T>
    try {
      promise = Promise.resolve(operation())
    } catch (error) {
      if (error instanceof FilterExecutionError && SAFE_DIAGNOSTIC_CODES.has(error.code)) {
        throw error
      }
      throw new FilterExecutionError(failureCode)
    }

    let timeout: ReturnType<typeof setTimeout> | undefined
    let abortListener: (() => void) | undefined
    try {
      return await Promise.race([
        promise.catch((error: unknown) => {
          if (error instanceof FilterExecutionError && SAFE_DIAGNOSTIC_CODES.has(error.code)) {
            throw error
          }
          throw new FilterExecutionError(failureCode)
        }),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => {
            abortOnTimeout?.abort()
            reject(new FilterExecutionError(timeoutCode))
          }, this.dependencies.timeoutMs)
        }),
        new Promise<never>((_resolve, reject) => {
          if (signal === undefined) return
          abortListener = () => reject(new FilterExecutionError('FILTER_REQUEST_ABORTED'))
          if (signal.aborted) {
            abortListener()
          } else {
            signal.addEventListener('abort', abortListener, { once: true })
          }
        }),
      ])
    } finally {
      if (timeout !== undefined) clearTimeout(timeout)
      if (abortListener !== undefined) signal?.removeEventListener('abort', abortListener)
    }
  }
}