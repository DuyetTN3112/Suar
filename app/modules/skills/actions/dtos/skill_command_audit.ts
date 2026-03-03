import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'

export interface SkillCommandAudit {
  actorId: string
  context: AuditActionContext
}
