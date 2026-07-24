import {
  auditPublicApi,
  type AuditLogWriter,
} from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { SkillCommandAudit } from '#modules/skills/actions/dtos/skill_command_audit'
import type {
  ProfessionalRoleRepository,
  ProjectProfessionalRoleSkillRecord,
} from '#modules/skills/actions/ports/outbound/professional_role_repository'
import type { SkillTransactionRunner } from '#modules/skills/actions/ports/outbound/skill_transaction'

export default class RemoveProjectRoleSkillCommand {
  constructor(
    private readonly professionalRoles: ProfessionalRoleRepository,
    private readonly transactionRunner: SkillTransactionRunner,
    private readonly audit: Pick<AuditLogWriter, 'log'> = auditPublicApi
  ) {}

  execute(
    projectRoleSkillId: string,
    audit?: SkillCommandAudit,
    projectId?: string,
    projectRoleId?: string
  ): Promise<ProjectProfessionalRoleSkillRecord> {
    return this.transactionRunner.run(async (transaction) => {
      const roleSkill = await this.professionalRoles.findProjectRoleSkillById(
        projectRoleSkillId,
        transaction
      )
      if (!roleSkill) {
        throw new NotFoundException('Project professional role skill not found')
      }
      if (projectRoleId !== undefined && roleSkill.project_professional_role_id !== projectRoleId) {
        throw new NotFoundException('Project professional role skill not found')
      }
      if (projectId !== undefined) {
        const role = await this.professionalRoles.findProjectRoleById(
          roleSkill.project_professional_role_id,
          false,
          transaction
        )
        if (!role || role.project_id !== projectId) {
          throw new NotFoundException('Project professional role skill not found')
        }
      }

      await this.professionalRoles.deleteProjectRoleSkill(projectRoleSkillId, transaction)
      await this.professionalRoles.incrementProjectRoleVersion(
        roleSkill.project_professional_role_id,
        transaction
      )
      if (audit) {
        await this.audit.log(
          {
            user_id: audit.actorId,
            action: 'delete',
            entity_type: 'project_professional_role_skill',
            entity_id: projectRoleSkillId,
            old_values: {
              project_professional_role_id: roleSkill.project_professional_role_id,
              project_skill_id: roleSkill.project_skill_id,
            },
            new_values: null,
          },
          audit.context,
          { trx: transaction, critical: true }
        )
      }
      return roleSkill
    })
  }
}
