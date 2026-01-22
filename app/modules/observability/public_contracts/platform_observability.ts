import {
  PlatformAuditLogger,
  platformAuditLogger,
} from '#modules/observability/public_contracts/platform_audit_logger'
import type {
  PlatformComplianceContext,
  PlatformEvent,
  PlatformEventOutcome,
  PlatformEventSeverity,
  PlatformRequestContext,
  PlatformRetentionClass,
  PlatformTargetContext,
  PlatformTraceContext,
} from '#modules/observability/public_contracts/platform_event'
import {
  PLATFORM_EVENT_NAMES,
  type PlatformEventName,
} from '#modules/observability/public_contracts/platform_event_names'
import {
  PlatformOperationalLogger,
  platformOperationalLogger,
} from '#modules/observability/public_contracts/platform_operational_logger'
import {
  redactSensitiveObject,
  redactSensitiveValue,
} from '#modules/observability/public_contracts/platform_redaction'
import {
  buildPlatformTraceContext,
  buildPlatformTraceContextFromAudit,
  buildPlatformTraceContextFromHttp,
  createCorrelationKey,
} from '#modules/observability/public_contracts/platform_trace_context'
import {
  PlatformWorkflowLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_workflow_logger'

export type {
  PlatformComplianceContext,
  PlatformEvent,
  PlatformEventOutcome,
  PlatformEventSeverity,
  PlatformRequestContext,
  PlatformRetentionClass,
  PlatformTargetContext,
  PlatformTraceContext,
  PlatformEventName,
}
export {
  PLATFORM_EVENT_NAMES,
  PlatformAuditLogger,
  PlatformOperationalLogger,
  PlatformWorkflowLogger,
  buildPlatformTraceContext,
  buildPlatformTraceContextFromAudit,
  buildPlatformTraceContextFromHttp,
  createCorrelationKey,
  platformAuditLogger,
  platformOperationalLogger,
  platformWorkflowLogger,
  redactSensitiveObject,
  redactSensitiveValue,
}
