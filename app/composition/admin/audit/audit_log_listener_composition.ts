import emitter from '@adonisjs/core/services/emitter'

import ProcessAuditLogEventCommand from '#modules/audit/actions/commands/audit-log/process_audit_log_event_command'
import { auditRepositoryProvider } from '#modules/audit/infra/repositories/audit-log/audit_repository_provider'
import {
  handleAuditLogEvent,
  type AuditLogListenerDependencies,
} from '#modules/audit/listeners/audit_log_listener'
import loggerService from '#modules/logger/public_contracts/application_logger'

const processAuditLogEvent = new ProcessAuditLogEventCommand(
  auditRepositoryProvider.getAuditLogRepository()
)

const dependencies: AuditLogListenerDependencies = {
  processAuditLogEvent: (event) => processAuditLogEvent.execute(event),
  logger: loggerService,
}

emitter.on('audit:log', (event) => handleAuditLogEvent(event, dependencies))
