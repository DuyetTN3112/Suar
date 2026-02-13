import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import {
  auditPublicApi,
  type AuditLogWriter,
} from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type {
  ProjectSkillRecord,
  ProjectSkillRepository,
} from '#modules/skills/actions/ports/outbound/project_skill_repository'

export interface DeactivateProjectSkillInput {
  projectSkillId: string
  actorId: string
  auditContext: AuditActionContext
}

export default class DeactivateProjectSkillCommand {
  constructor(
    private readonly repository: ProjectSkillRepository,
    private readonly audit: Pick<AuditLogWriter, 'log'> = auditPublicApi
  ) {}

  async execute(input: DeactivateProjectSkillInput): Promise<ProjectSkillRecord> {
    const projectSkill = await this.repository.findProjectSkillById(input.projectSkillId)
    if (!projectSkill) {
      throw new NotFoundException('Project skill configuration not found')
    }

    const updated =
      (await this.repository.updateProjectSkill(input.projectSkillId, {
        is_active: false,
        is_selectable_for_tasks: false,
      })) ?? projectSkill

    await this.audit.log(
      {
        user_id: input.actorId,
        action: 'deactivate',
        entity_type: 'project_skill',
        entity_id: input.projectSkillId,
        old_values: {
          is_active: projectSkill.is_active,
          is_selectable_for_tasks: projectSkill.is_selectable_for_tasks,
        },
        new_values: {
          is_active: updated.is_active,
          is_selectable_for_tasks: updated.is_selectable_for_tasks,
        },
      },
      input.auditContext,
      { critical: true }
    )

    return updated
  }
}
