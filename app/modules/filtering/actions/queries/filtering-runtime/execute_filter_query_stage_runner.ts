import { SAFE_DIAGNOSTIC_CODES } from './execute_filter_query_types.js'
import {
  throwIfAborted,
  toObservabilityExecutor,
} from './execute_filter_query_validators.js'

import {
  noopFilterObservabilitySink,
  type FilterObservabilitySink,
} from '#modules/filtering/actions/ports/outbound/filter_observability_sink'
import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import { buildFilterObservabilityEvent } from '#modules/filtering/observability/filtering-observability/filter_event_factory'
import {
  FilterExecutionError,
  type FilterDiagnosticCode,
} from '#modules/filtering/public_contracts/filter_diagnostics'

export async function runFilterStage<T>(
  operation: () => Promise<T>,
  failureCode: FilterDiagnosticCode,
  timeoutMs: number,
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
        }, timeoutMs)
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

export async function recordFilterObservabilityEvent(
  sink: FilterObservabilitySink | undefined,
  input: {
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
  }
): Promise<void> {
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
    await (sink ?? noopFilterObservabilitySink).record(event)
  } catch {
    // Observability is best effort and must never change query semantics.
  }
}
