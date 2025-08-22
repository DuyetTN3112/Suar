import emitter from '@adonisjs/core/services/emitter'

import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type {
  ProjectAuditEvent,
  ProjectAuditEventPublisher,
} from '#modules/projects/application/ports/project_audit_event_publisher'

export class AuditEventProjectAuditEventPublisher implements ProjectAuditEventPublisher {
  async publishProjectAudit(execCtx: ProjectActionContext, event: ProjectAuditEvent): Promise<void> {
    if (!execCtx.userId) return

    await emitter.emit('audit:log', {
      userId: execCtx.userId,
      action: event.action,
      entityType: 'project',
      entityId: event.entityId,
      oldValues: event.oldValues ?? null,
      newValues: event.newValues ?? null,
    })
  }
}
