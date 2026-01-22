import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type { PlatformTraceContext } from '#modules/observability/public_contracts/platform_event'

export interface BuildPlatformTraceContextInput {
  readonly requestId?: string | null
  readonly traceId?: string | null
  readonly workflow: string
  readonly parentId?: string | null
  readonly frontendSubmissionId?: string | null
  readonly correlationKey?: string | null
}

export interface PlatformTraceIdentityProvider {
  nextId(): string
  digest(value: string): string
}

let provider: PlatformTraceIdentityProvider | null = null

export function registerPlatformTraceIdentityProvider(
  implementation: PlatformTraceIdentityProvider
): void {
  provider = implementation
}

function identityProvider(): PlatformTraceIdentityProvider {
  if (!provider) {
    throw new InvariantViolationException(
      'Platform trace identity provider has not been registered'
    )
  }
  return provider
}

export function buildPlatformTraceContext(
  input: BuildPlatformTraceContextInput
): PlatformTraceContext {
  return {
    id: input.traceId ?? input.requestId ?? identityProvider().nextId(),
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
  const normalized = parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(':')
  return identityProvider().digest(normalized)
}
