import type { AxiosInstance } from 'axios'

import { normalizeApiProblem, type NormalizedApiProblem } from './api_problem.js'

export const API_PROBLEM_EVENT = 'suar:api-problem'
export const RUNTIME_ERROR_EVENT = 'suar:runtime-error'
export const DEFAULT_AXIOS_TIMEOUT_MS = 30_000

interface RuntimeErrorOptions {
  readonly surface: 'user' | 'org' | 'admin'
  readonly stage?: 'bootstrap' | 'runtime'
}

const configuredClients = new WeakSet<AxiosInstance>()
const configuredRuntimeSurfaces = new Set<string>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function publishProblem(problem: NormalizedApiProblem): void {
  if (typeof window === 'undefined' || problem.canceled) return
  window.dispatchEvent(new CustomEvent(API_PROBLEM_EVENT, { detail: problem }))
}

function attachProblem(error: unknown, problem: NormalizedApiProblem): void {
  if (!isRecord(error)) return
  Object.defineProperty(error, 'apiProblem', {
    configurable: true,
    enumerable: false,
    value: problem,
  })
}

export function installAxiosErrorPolicy(client: AxiosInstance): void {
  if (configuredClients.has(client)) return
  configuredClients.add(client)

  const configuredTimeout = client.defaults.timeout
  if (
    typeof configuredTimeout !== 'number' ||
    !Number.isFinite(configuredTimeout) ||
    configuredTimeout <= 0
  ) {
    client.defaults.timeout = DEFAULT_AXIOS_TIMEOUT_MS
  }

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const problem = normalizeApiProblem(error)
      attachProblem(error, problem)
      publishProblem(problem)
      if (error instanceof Error) {
        return Promise.reject(error)
      }

      const wrappedError = new Error(problem.detail)
      attachProblem(wrappedError, problem)
      return Promise.reject(wrappedError)
    }
  )
}

function runtimeErrorType(error: unknown): string {
  if (error instanceof Error) return error.name || 'Error'
  return typeof error
}

export function captureRuntimeError(error: unknown, options: RuntimeErrorOptions): void {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent(RUNTIME_ERROR_EVENT, {
      detail: {
        type: runtimeErrorType(error),
        surface: options.surface,
        stage: options.stage ?? 'runtime',
      },
    })
  )

  // This reporting path is intentionally independent from Axios, so an Axios
  // interceptor failure cannot recursively create more unhandled rejections.
  void fetch('/api/telemetry/ui-events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventName: 'frontend.runtime.failed',
      module: 'frontend',
      subsystem: 'runtime',
      workflow: 'frontend_runtime',
      eventFamily: 'exception',
      surface: options.surface,
      metadata: {
        error_type: runtimeErrorType(error),
        stage: options.stage ?? 'runtime',
        path: window.location.pathname,
      },
      persist: true,
      severity: 'error',
      outcome: 'failure',
    }),
    keepalive: true,
  }).catch(() => {
    // Telemetry is best-effort and must not recursively fail the UI runtime.
  })
}

export function installGlobalRuntimeErrorBoundary(surface: RuntimeErrorOptions['surface']): void {
  if (typeof window === 'undefined' || configuredRuntimeSurfaces.has(surface)) return
  configuredRuntimeSurfaces.add(surface)

  window.addEventListener('error', (event) => {
    captureRuntimeError(event.error ?? event.message, { surface })
  })
  window.addEventListener('unhandledrejection', (event) => {
    captureRuntimeError(event.reason, { surface })
  })
}
