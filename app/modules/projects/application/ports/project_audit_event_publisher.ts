import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'

export interface ProjectAuditEvent {
  action: string
  entityId: string
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
}

export interface ProjectAuditEventPublisher {
  publishProjectAudit(execCtx: ProjectActionContext, event: ProjectAuditEvent): Promise<void>
}
