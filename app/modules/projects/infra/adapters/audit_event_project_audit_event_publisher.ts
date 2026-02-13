import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type {
  ProjectAuditEvent,
  ProjectAuditEventPublisher,
} from '#modules/projects/actions/ports/outbound/project_audit_event_publisher'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'

export class AuditEventProjectAuditEventPublisher implements ProjectAuditEventPublisher {
  async publishProjectAudit(
    execCtx: ProjectActionContext,
    event: ProjectAuditEvent,
    trx: TransactionClientContract
  ): Promise<void> {
    if (!execCtx.userId) return

    await auditPublicApi.write(
      execCtx,
      {
        user_id: execCtx.userId,
        action: event.action,
        critical: true,
        entity_type: 'project',
        entity_id: event.entityId,
        event_name: `project.${event.action}`,
        event_family: 'business_mutation',
        module: 'projects',
        outcome: 'success',
        target_type: 'project',
        target_id: event.entityId,
        target_organization_id: execCtx.organizationId,
        old_values: event.oldValues ?? null,
        new_values: event.newValues ?? null,
      },
      trx
    )
  }
}
