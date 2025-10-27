import { createHash, randomUUID } from 'node:crypto'

import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type { PlatformTraceContext } from '#modules/observability/contracts/platform_event'

export interface BuildPlatformTraceContextInput {
  readonly requestId?: string | null
  readonly traceId?: string | null
  readonly workflow: string
  readonly parentId?: string | null
  readonly frontendSubmissionId?: string | null
  readonly correlationKey?: string | null
}

export function buildPlatformTraceContext(
  input: BuildPlatformTraceContextInput
): PlatformTraceContext {
  return {
    id: input.traceId ?? input.requestId ?? randomUUID(),
    workflow_id: input.workflow,
    parent_id: input.parentId ?? null,
    frontend_submission_id: input.frontendSubmissionId ?? null,
    correlation_key: input.correlationKey ?? null,
  }
}

export function buildPlatformTraceContextFromHttp(
  execCtx: HttpActionContext,
  workflow: string,
  options: Omit<BuildPlatformTraceContextInput, 'requestId' | 'traceId' | 'workflow'> = {}
): PlatformTraceContext {
  return buildPlatformTraceContext({
    workflow,
    ...(execCtx.requestId !== undefined ? { requestId: execCtx.requestId } : {}),
    ...(execCtx.traceId !== undefined ? { traceId: execCtx.traceId } : {}),
    ...options,
  })
}

export function buildPlatformTraceContextFromAudit(
  execCtx: AuditActionContext,
  workflow: string,
  options: Omit<BuildPlatformTraceContextInput, 'requestId' | 'traceId' | 'workflow'> = {}
): PlatformTraceContext {
  return buildPlatformTraceContext({
    workflow,
    ...(execCtx.requestId !== undefined ? { requestId: execCtx.requestId } : {}),
    ...(execCtx.traceId !== undefined ? { traceId: execCtx.traceId } : {}),
    ...options,
  })
}

export function createCorrelationKey(parts: Array<string | null | undefined>): string {
  const normalized = parts.map((part) => part?.trim()).filter(Boolean).join(':')
  return createHash('sha256').update(normalized).digest('hex')
}
