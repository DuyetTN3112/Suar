export interface UiTelemetryPayload {
  readonly eventName: string
  readonly module: string
  readonly subsystem: string
  readonly workflow: string
  readonly eventFamily?: string
  readonly surface: string
  readonly frontendSubmissionId?: string | null
  readonly userInput?: string | null
  readonly durationMs?: number | null
  readonly targetType?: string | null
  readonly targetId?: string | null
  readonly metadata?: Record<string, unknown> | null
  readonly persist?: boolean
  readonly severity?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | null
  readonly outcome?: 'success' | 'failure' | 'skipped' | 'warning' | null
  readonly delivery?: 'standard' | 'keepalive'
}

function normalizeInput(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toLowerCase()
}

async function hashInput(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function buildUiTelemetryBody(
  payload: UiTelemetryPayload,
  options: { hashUserInput?: boolean } = {}
) {
  const normalizedInput = payload.userInput ? normalizeInput(payload.userInput) : null
  const shouldHashInput = options.hashUserInput ?? true

  return {
    eventName: payload.eventName,
    module: payload.module,
    subsystem: payload.subsystem,
    workflow: payload.workflow,
    eventFamily: payload.eventFamily ?? 'ui',
    surface: payload.surface,
    frontendSubmissionId: payload.frontendSubmissionId ?? null,
    userInputHash: normalizedInput && shouldHashInput ? await hashInput(normalizedInput) : null,
    userInputLength: normalizedInput?.length ?? null,
    durationMs: payload.durationMs ?? null,
    targetType: payload.targetType ?? null,
    targetId: payload.targetId ?? null,
    metadata: payload.metadata ?? null,
    persist: payload.persist ?? false,
    severity: payload.severity ?? null,
    outcome: payload.outcome ?? null,
  }
}

export async function postUiTelemetry(payload: UiTelemetryPayload): Promise<void> {
  const body = await buildUiTelemetryBody(payload, {
    hashUserInput: payload.delivery !== 'keepalive',
  })

  await fetch('/api/telemetry/ui-events', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    keepalive: payload.delivery === 'keepalive',
  })
}
