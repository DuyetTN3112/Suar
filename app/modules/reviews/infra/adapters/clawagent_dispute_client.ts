export type ClawagentTriggerFailureCode =
  | 'CLAWAGENT_TIMEOUT'
  | 'CLAWAGENT_NETWORK_ERROR'
  | 'CLAWAGENT_HTTP_ERROR'

export type ClawagentTriggerResult =
  | {
      ok: true
      externalRunId: string | null
    }
  | {
      ok: false
      code: ClawagentTriggerFailureCode
      retryable: boolean
      diagnostic: string
      httpStatus: number | null
    }

export interface ClawagentDisputeClientOptions {
  url: string
  apiKey?: string
  timeoutMs?: number
  maxDiagnosticBytes?: number
  fetchImpl?: typeof fetch
}

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_MAX_DIAGNOSTIC_BYTES = 1_024
const MAX_TIMEOUT_MS = 120_000
const MAX_DIAGNOSTIC_BYTES = 8_192

function validateInteger(name: string, value: number, minimum: number, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`)
  }
}

function parseConfiguredInteger(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const raw = environment[name]
  if (raw === undefined || raw.trim() === '') {
    return fallback
  }

  const value = Number(raw)
  validateInteger(name, value, minimum, maximum)
  return value
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function externalRunIdFromAcceptedPayload(payload: Record<string, unknown>): string | null {
  return (
    optionalString(payload['evaluation_id']) ??
    optionalString(payload['external_run_id']) ??
    optionalString(payload['externalRunId']) ??
    optionalString(payload['run_id']) ??
    optionalString(payload['runId']) ??
    optionalString(payload['id'])
  )
}

function parseJsonObject(value: string): Record<string, unknown> {
  if (!value.trim()) {
    return {}
  }

  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function truncateUtf8(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, 'utf8') <= maxBytes) {
    return value
  }

  let result = ''
  for (const character of value) {
    if (Buffer.byteLength(result + character, 'utf8') > maxBytes) {
      break
    }
    result += character
  }
  return result
}

function sanitizeDiagnostic(
  value: unknown,
  maxBytes: number,
  sensitiveValues: readonly string[]
): string {
  let sanitized = value instanceof Error ? value.message : String(value)

  for (const sensitiveValue of sensitiveValues) {
    if (sensitiveValue) {
      sanitized = sanitized.replaceAll(sensitiveValue, '[REDACTED]')
    }
  }

  sanitized = sanitized
    .replace(/\bBearer\s+[^\s"',;]+/gi, 'Bearer [REDACTED]')
    .replace(
      /((?:password|secret|token|api[_-]?key|authorization)\s*["']?\s*[:=]\s*["']?)[^"',}\s;]+/gi,
      '$1[REDACTED]'
    )
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]*/gi, '$1?[REDACTED]')

  return truncateUtf8(sanitized, maxBytes)
}

async function readBoundedResponseText(
  response: Response,
  maxBytes: number
): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) {
    return { text: '', truncated: false }
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  let truncated = false

  try {
    while (totalBytes <= maxBytes) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      const remainingBytes = maxBytes - totalBytes
      if (value.byteLength > remainingBytes) {
        if (remainingBytes > 0) {
          chunks.push(value.subarray(0, remainingBytes))
          totalBytes += remainingBytes
        }
        truncated = true
        break
      }

      chunks.push(value)
      totalBytes += value.byteLength
    }
  } finally {
    if (truncated) {
      await reader.cancel().catch(() => undefined)
    }
    reader.releaseLock()
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return {
    text: new TextDecoder().decode(bytes),
    truncated,
  }
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500
}

class ClawagentTimeoutError extends Error {
  constructor() {
    super('Clawagent request deadline exceeded')
    this.name = 'ClawagentTimeoutError'
  }
}

export class ClawagentDisputeClient {
  static fromEnvironment(
    environment: NodeJS.ProcessEnv = process.env,
    fetchImpl: typeof fetch = globalThis.fetch
  ): ClawagentDisputeClient {
    const apiKey =
      environment['SUAR_DISPUTE_API_KEY'] ?? environment['DEVPORTAL_API_KEY_SECRET']

    return new ClawagentDisputeClient({
      url:
        environment['CLAWAGENT_API_URL'] ??
        'http://localhost:18080/api/public/disputes/arbitrate',
      ...(apiKey ? { apiKey } : {}),
      timeoutMs: parseConfiguredInteger(
        environment,
        'CLAWAGENT_REQUEST_TIMEOUT_MS',
        DEFAULT_TIMEOUT_MS,
        1,
        MAX_TIMEOUT_MS
      ),
      maxDiagnosticBytes: parseConfiguredInteger(
        environment,
        'CLAWAGENT_MAX_DIAGNOSTIC_BYTES',
        DEFAULT_MAX_DIAGNOSTIC_BYTES,
        128,
        MAX_DIAGNOSTIC_BYTES
      ),
      fetchImpl,
    })
  }

  private readonly url: string
  private readonly apiKey: string | undefined
  private readonly timeoutMs: number
  private readonly maxDiagnosticBytes: number
  private readonly fetchImpl: typeof fetch

  constructor(options: ClawagentDisputeClientOptions) {
    this.url = options.url
    this.apiKey = options.apiKey
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.maxDiagnosticBytes =
      options.maxDiagnosticBytes ?? DEFAULT_MAX_DIAGNOSTIC_BYTES
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch

    validateInteger('timeoutMs', this.timeoutMs, 1, MAX_TIMEOUT_MS)
    validateInteger(
      'maxDiagnosticBytes',
      this.maxDiagnosticBytes,
      128,
      MAX_DIAGNOSTIC_BYTES
    )
  }

  async trigger(
    evaluationId: string,
    payload: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<ClawagentTriggerResult> {
    signal?.throwIfAborted()
    const abortController = new AbortController()
    const abortForCaller = () => {
      abortController.abort(signal?.reason)
    }
    signal?.addEventListener('abort', abortForCaller, { once: true })
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutHandle = setTimeout(() => {
        abortController.abort()
        reject(new ClawagentTimeoutError())
      }, this.timeoutMs)
      timeoutHandle.unref()
    })

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Idempotency-Key': evaluationId,
        'X-Suar-Evaluation-Id': evaluationId,
      }
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey
      }

      const response = await Promise.race([
        this.fetchImpl(this.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: abortController.signal,
        }),
        timeoutPromise,
      ])
      const responseBody = await Promise.race([
        readBoundedResponseText(response, this.maxDiagnosticBytes),
        timeoutPromise,
      ])

      if (!response.ok) {
        const suffix = responseBody.truncated ? ' [truncated]' : ''
        const diagnostic = sanitizeDiagnostic(
          `Clawagent returned HTTP ${response.status}: ${responseBody.text}${suffix}`,
          this.maxDiagnosticBytes,
          this.apiKey ? [this.apiKey] : []
        )
        return {
          ok: false,
          code: 'CLAWAGENT_HTTP_ERROR',
          retryable: isRetryableHttpStatus(response.status),
          diagnostic,
          httpStatus: response.status,
        }
      }

      const acceptedPayload = parseJsonObject(responseBody.text)
      return {
        ok: true,
        externalRunId: externalRunIdFromAcceptedPayload(acceptedPayload),
      }
    } catch (error) {
      if (signal?.aborted) {
        throw signal.reason instanceof Error ? signal.reason : error
      }
      const timedOut =
        error instanceof ClawagentTimeoutError ||
        (abortController.signal.aborted &&
          error instanceof Error &&
          error.name === 'AbortError')
      if (timedOut) {
        return {
          ok: false,
          code: 'CLAWAGENT_TIMEOUT',
          retryable: true,
          diagnostic: 'Clawagent request deadline exceeded',
          httpStatus: null,
        }
      }

      return {
        ok: false,
        code: 'CLAWAGENT_NETWORK_ERROR',
        retryable: true,
        diagnostic: sanitizeDiagnostic(
          error,
          this.maxDiagnosticBytes,
          this.apiKey ? [this.apiKey] : []
        ),
        httpStatus: null,
      }
    } finally {
      signal?.removeEventListener('abort', abortForCaller)
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }
    }
  }
}
