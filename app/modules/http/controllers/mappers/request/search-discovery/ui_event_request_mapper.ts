import type { HttpPlatformUiEventInput } from '#modules/http/actions/dtos/platform_ui_event'

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function readOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readOptionalBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function readOptionalObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function buildRecordPlatformUiEventInput(payload: unknown): HttpPlatformUiEventInput {
  const body = (payload ?? {}) as Record<string, unknown>
  const severity = readOptionalString(body['severity']) as NonNullable<
    HttpPlatformUiEventInput['severity']
  > | null
  const outcome = readOptionalString(body['outcome']) as NonNullable<
    HttpPlatformUiEventInput['outcome']
  > | null

  return {
    eventName: readOptionalString(body['eventName']) ?? 'ui.event.occurred',
    module: readOptionalString(body['module']) ?? 'unknown',
    subsystem: readOptionalString(body['subsystem']) ?? 'ui_surface',
    workflow: readOptionalString(body['workflow']) ?? 'ui_workflow',
    eventFamily: readOptionalString(body['eventFamily']) ?? 'ui',
    surface: readOptionalString(body['surface']) ?? 'unknown_surface',
    frontendSubmissionId: readOptionalString(body['frontendSubmissionId']),
    userInputHash: readOptionalString(body['userInputHash']),
    userInputLength: readOptionalNumber(body['userInputLength']),
    durationMs: readOptionalNumber(body['durationMs']),
    targetType: readOptionalString(body['targetType']),
    targetId: readOptionalString(body['targetId']),
    metadata: readOptionalObject(body['metadata']),
    persist: readOptionalBoolean(body['persist']) ?? false,
    ...(severity !== null ? { severity } : {}),
    ...(outcome !== null ? { outcome } : {}),
  }
}
