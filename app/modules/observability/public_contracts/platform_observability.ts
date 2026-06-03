import {
  platformAuditLogger,
  type PlatformAuditLogger,
  type PlatformAuditLoggerPort,
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
  platformOperationalLogger,
  type PlatformOperationalLogger,
  type PlatformOperationalLoggerPort,
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
  platformWorkflowLogger,
  type PlatformWorkflowLogger,
  type PlatformWorkflowLoggerPort,
} from '#modules/observability/public_contracts/platform_workflow_logger'

export type {
  PlatformAuditLoggerPort,
  PlatformAuditLogger,
  PlatformComplianceContext,
  PlatformEvent,
  PlatformEventName,
  PlatformEventOutcome,
  PlatformEventSeverity,
  PlatformOperationalLoggerPort,
  PlatformOperationalLogger,
  PlatformRequestContext,
  PlatformRetentionClass,
  PlatformTargetContext,
  PlatformTraceContext,
  PlatformWorkflowLoggerPort,
  PlatformWorkflowLogger,
}

export {
  PLATFORM_EVENT_NAMES,
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
