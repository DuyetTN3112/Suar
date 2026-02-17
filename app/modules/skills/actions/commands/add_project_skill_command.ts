import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import {
  auditPublicApi,
  type AuditLogWriter,
} from '#modules/audit/public_contracts/audit_log_writer'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type {
  ProjectSkillRecord,
  ProjectSkillRepository,
} from '#modules/skills/actions/ports/outbound/project_skill_repository'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'

export interface AddProjectSkillInput {
  projectId: string
  skillId: string
  addedBy?: string
  auditContext?: AuditActionContext
}

export default class AddProjectSkillCommand {
  constructor(
    private readonly repository: ProjectSkillRepository,
    private readonly audit: Pick<AuditLogWriter, 'log'> = auditPublicApi
  ) {}

  async execute(
    input: AddProjectSkillInput,
    transaction?: SkillTransaction
  ): Promise<ProjectSkillRecord> {
    const skill = await this.repository.findActiveSkill(input.skillId, transaction)
    if (!skill) {
      throw new NotFoundException('Skill is not active or does not exist')
    }

    const existing = await this.repository.findProjectSkill(
      input.projectId,
      input.skillId,
      transaction
    )
    if (existing) {
      throw new ConflictException('Skill already added to this project')
    }

    const projectSkill = await this.repository.createProjectSkill(
      {
        project_id: input.projectId,
        skill_id: input.skillId,
        added_by: input.addedBy ?? null,
        is_active: true,
        is_selectable_for_tasks: true,
        is_visible_in_project: true,
      },
      transaction
    )

    if (input.addedBy && input.auditContext) {
      await this.audit.log(
        {
          user_id: input.addedBy,
          action: 'create',
          entity_type: 'project_skill',
          entity_id: projectSkill.id,
          old_values: null,
          new_values: {
            project_id: projectSkill.project_id,
            skill_id: projectSkill.skill_id,
          },
        },
        input.auditContext,
        transaction ? { trx: transaction, critical: true } : { critical: true }
      )
    }

    return projectSkill
  }
}
