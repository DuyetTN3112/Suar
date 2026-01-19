import {
  auditPublicApi,
  type AuditLogWriter,
} from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { SkillCommandAudit } from '#modules/skills/actions/dtos/skill_command_audit'
import type {
  ProfessionalRoleRepository,
  ProjectProfessionalRoleRecord,
} from '#modules/skills/actions/ports/outbound/professional_role_repository'

export default class DeactivateProjectRoleCommand {
  constructor(
    private readonly professionalRoles: ProfessionalRoleRepository,
    private readonly audit: Pick<AuditLogWriter, 'log'> = auditPublicApi
  ) {}

  async execute(
    projectRoleId: string,
    audit?: SkillCommandAudit
  ): Promise<ProjectProfessionalRoleRecord> {
    const role = await this.professionalRoles.deactivateProjectRole(projectRoleId)
    if (!role) {
      throw new NotFoundException('Project professional role not found')
    }
    if (audit) {
      await this.audit.log(
        {
          user_id: audit.actorId,
          action: 'deactivate',
          entity_type: 'project_professional_role',
          entity_id: projectRoleId,
          old_values: { is_active: true },
          new_values: { is_active: role.is_active },
        },
        audit.context,
        { critical: true }
      )
    }
    return role
  }
}
