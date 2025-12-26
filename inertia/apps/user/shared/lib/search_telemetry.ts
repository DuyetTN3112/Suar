import { postUiTelemetry } from '@/apps/user/shared/lib/ui_telemetry'

export interface SearchTelemetryPayload {
  readonly eventName: string
  readonly surface: string
  readonly frontendSubmissionId?: string | null
  readonly query: string
  readonly durationMs?: number | null
  readonly resultCounts?: Record<string, number> | null
  readonly entityType?: string | null
  readonly entityId?: string | null
  readonly metadata?: Record<string, unknown> | null
}

const PERSISTED_SEARCH_UI_EVENTS = new Set([
  'search.ui.submitted',
  'search.ui.failed',
  'search.ui.empty_results',
  'search.ui.result_clicked',
])

export function buildSearchTelemetryBody(payload: SearchTelemetryPayload) {
  return {
    eventName: payload.eventName,
    module: 'search',
    subsystem: 'global_search',
    workflow: 'global_search',
    eventFamily: 'ui',
    surface: payload.surface,
    frontendSubmissionId: payload.frontendSubmissionId ?? null,
    durationMs: payload.durationMs ?? null,
    targetType: payload.entityType ?? null,
    targetId: payload.entityId ?? null,
    metadata: {
      result_counts: payload.resultCounts ?? null,
      ...(payload.metadata ?? {}),
    },
    persist: PERSISTED_SEARCH_UI_EVENTS.has(payload.eventName),
  }
}

export async function postSearchTelemetry(payload: SearchTelemetryPayload): Promise<void> {
  const body = buildSearchTelemetryBody(payload)
  await postUiTelemetry({
    eventName: body.eventName,
    module: body.module,
    subsystem: body.subsystem,
    workflow: body.workflow,
    eventFamily: body.eventFamily,
    surface: body.surface,
    frontendSubmissionId: body.frontendSubmissionId,
    userInput: payload.query,
    durationMs: body.durationMs,
    targetType: body.targetType,
    targetId: body.targetId,
    metadata: body.metadata,
    persist: body.persist,
    delivery: body.persist ? 'keepalive' : 'standard',
  })
}
