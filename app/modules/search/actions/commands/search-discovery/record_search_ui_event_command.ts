import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import { platformAuditLogger, platformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import { BaseCommand } from '#modules/search/actions/base_command'
import { buildSearchPlatformEvent } from '#modules/search/observability/search_event_factory'
import type { RecordSearchUiEventInput } from '#modules/search/public_contracts/search_ui_events'

const AUDIT_UI_EVENT_NAMES = new Set([
  'search.ui.submitted',
  'search.ui.failed',
  'search.ui.empty_results',
  'search.ui.result_clicked',
])

const SAFE_SEARCH_UI_METADATA_KEYS = new Set([
  'rank',
  'source_label',
  'matched_fields',
  'active_type',
  'active_field',
])

const SAFE_SEARCH_UI_FIELD_KEYS = new Set([
  'title',
  'description',
  'acceptance_criteria',
  'context_background',
  'name',
  'website',
  'username',
  'custom_headline',
  'bio',
  'skillName',
  'skillCode',
  'comment',
])

const SAFE_SEARCH_UI_LABELS = new Set([
  'Task',
  'Task title',
  'Task description',
  'Task acceptance criteria',
  'Task context',
  'Project',
  'Project name',
  'Project description',
  'Organization',
  'Organization name',
  'Organization description',
  'Talent',
  'Talent name',
  'Talent headline',
  'Talent bio',
  'Skill',
  'Skill name',
  'Skill code',
  'Skill description',
  'Comment',
])

function safeSearchUiMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return {}

  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (!SAFE_SEARCH_UI_METADATA_KEYS.has(key)) continue

    if (key === 'rank' && typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
      safe[key] = value
      continue
    }

    if (
      (key === 'source_label' || key === 'active_field') &&
      typeof value === 'string' &&
      SAFE_SEARCH_UI_LABELS.has(value)
    ) {
      safe[key] = value
      continue
    }

    if (
      key === 'matched_fields' &&
      Array.isArray(value) &&
      value.every((field) => typeof field === 'string' && SAFE_SEARCH_UI_FIELD_KEYS.has(field))
    ) {
      safe[key] = value
      continue
    }

    if (key === 'active_type' && typeof value === 'string' && ['all', 'task', 'project', 'talent', 'skill', 'organization', 'comment'].includes(value)) {
      safe[key] = value
    }
  }

  return safe
}

interface RecordSearchUiEventCommandInput {
  readonly input: RecordSearchUiEventInput
  readonly execCtx: HttpActionContext
}

export default class RecordSearchUiEventCommand extends BaseCommand<
  RecordSearchUiEventCommandInput,
  void
> {
  override async handle({ input, execCtx }: RecordSearchUiEventCommandInput): Promise<void> {
    const event = buildSearchPlatformEvent({
      eventName: input.eventName,
      eventFamily: 'ui',
      subsystem: 'global_search',
      workflow: 'global_search',
      stage: 'completed',
      severity: input.eventName === 'search.ui.failed' ? 'warn' : 'info',
      outcome: input.eventName === 'search.ui.failed' ? 'failure' : 'success',
      actor: {
        initiator_type: 'frontend',
        user_id: execCtx.userId,
        organization_id: execCtx.organizationId,
      },
      request: {
        id: execCtx.requestId ?? null,
        ip: execCtx.ip,
        user_agent: execCtx.userAgent,
      },
      trace: {
        id: execCtx.traceId ?? execCtx.requestId ?? `search-ui:${Date.now()}`,
        workflow_id: 'global_search',
        frontend_submission_id: input.frontendSubmissionId ?? null,
        correlation_key: input.queryHash ?? null,
      },
      target: {
        type: input.entityType ?? 'search_query',
        id: input.entityId ?? null,
        scope: input.surface,
      },
      change: {
        surface: input.surface,
        query_hash: input.queryHash ?? null,
        query_text_length: input.queryTextLength ?? null,
        result_counts: input.resultCounts ?? null,
        ...safeSearchUiMetadata(input.metadata),
      },
      runtime: {
        duration_ms: input.durationMs ?? null,
      },
      compliance: {
        redaction_applied: true,
        retention_class: AUDIT_UI_EVENT_NAMES.has(input.eventName)
          ? 'support_trace'
          : 'transient_runtime',
        contains_user_input: (input.queryTextLength ?? 0) > 0,
      },
    })

    platformOperationalLogger.log(
      input.eventName === 'search.ui.failed' ? 'warn' : 'info',
      event
    )

    if (!AUDIT_UI_EVENT_NAMES.has(input.eventName)) {
      return
    }

    await platformAuditLogger.record(
      {
        userId: execCtx.userId,
        ip: execCtx.ip,
        userAgent: execCtx.userAgent,
        organizationId: execCtx.organizationId,
        ...(execCtx.requestId !== undefined ? { requestId: execCtx.requestId } : {}),
        ...(execCtx.traceId !== undefined ? { traceId: execCtx.traceId } : {}),
        ...(execCtx.workflowId !== undefined ? { workflowId: execCtx.workflowId } : {}),
      },
      event
    )
  }

  /** Backward-compatible adapter for composition callers. */
  async execute(input: RecordSearchUiEventInput, execCtx: HttpActionContext): Promise<void> {
    return this.handle({ input, execCtx })
  }
}
