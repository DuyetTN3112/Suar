import AppException from '#modules/errors/public_contracts/application_exception'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import { FilterContextResolutionError } from '#modules/filtering/public_contracts/filter_context_provider'

/** Translate filtering failures at the HTTP boundary without leaking internals. */
export function toFilterHttpException(error: unknown): AppException | undefined {
  if (error instanceof FilterContextResolutionError) {
    return new AppException('The filter context is unavailable.', {
      status: 401,
      code: 'FILTER_CONTEXT_UNAVAILABLE',
      safeMessage: 'The filter context is unavailable.',
    })
  }

  if (!(error instanceof FilterExecutionError)) return undefined

  const status = statusFor(error.code)
  return new AppException(error.message, {
    status,
    code: error.code,
    safeMessage: error.message,
    retryable: status >= 500 || error.code === 'FILTER_REQUEST_ABORTED',
    details: { diagnosticCode: error.code },
  })
}

function statusFor(code: FilterExecutionError['code']): number {
  if (code === 'FILTER_CONTEXT_UNAVAILABLE' || code === 'FILTER_PERMISSION_UNAVAILABLE') return 401
  if (code === 'FILTER_EXECUTOR_UNAVAILABLE' || code === 'FILTER_PROVIDER_DEGRADED') return 503
  if (code === 'FILTER_PROVIDER_TIMED_OUT') return 504
  if (code === 'FILTER_REQUEST_ABORTED') return 408
  return 400
}
