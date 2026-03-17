import type { HttpSearchUiEventInput } from '#modules/http/actions/dtos/search_ui_event'

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function readOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readResultCounts(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, count]) => typeof count === 'number' && Number.isFinite(count)
  )

  if (entries.length === 0) {
    return null
  }

  return Object.fromEntries(entries) as Record<string, number>
}

function readOptionalObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

export function buildRecordSearchUiEventInput(payload: unknown): HttpSearchUiEventInput {
  const body = (payload ?? {}) as Record<string, unknown>

  return {
    eventName: readOptionalString(body['eventName']) ?? 'search.ui.submitted',
    surface: readOptionalString(body['surface']) ?? 'command_menu',
    frontendSubmissionId: readOptionalString(body['frontendSubmissionId']),
    queryHash: readOptionalString(body['queryHash']),
    queryTextLength: readOptionalNumber(body['queryTextLength']),
    durationMs: readOptionalNumber(body['durationMs']),
    resultCounts: readResultCounts(body['resultCounts']),
    entityType: readOptionalString(body['entityType']),
    entityId: readOptionalString(body['entityId']),
    metadata: readOptionalObject(body['metadata']),
  }
}
