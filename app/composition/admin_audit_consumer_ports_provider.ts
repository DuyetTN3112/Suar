import type { ApplicationService } from '@adonisjs/core/types'

import {
  adminAuditEventReader,
  adminAuditLogActionFactory,
  adminAuditProjectionReader,
} from './admin_action_factory_composition.js'

import { AdminAuditLogActionFactory } from '#modules/admin/audit_logs/actions/ports/inbound/admin_audit_log_action_factory'
import { AdminAuditEventReader } from '#modules/admin/audit_logs/actions/ports/outbound/admin_audit_event_reader'
import { AdminAuditProjectionReader } from '#modules/admin/audit_logs/actions/ports/outbound/admin_audit_projection_reader'

export default class AdminAuditConsumerPortsProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    this.app.container.singleton(
      AdminAuditLogActionFactory,
      () => adminAuditLogActionFactory
    )
    this.app.container.singleton(AdminAuditEventReader, () => adminAuditEventReader)
    this.app.container.singleton(
      AdminAuditProjectionReader,
      () => adminAuditProjectionReader
    )
  }
}
