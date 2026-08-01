import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import {
  auditPublicApi,
  type AuditLogWriter,
} from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type {
  ProjectSkillRecord,
  ProjectSkillRepository,
  UpdateProjectSkillRecord,
} from '#modules/skills/actions/ports/outbound/project_skill_repository'

export interface UpdateProjectSkillInput {
  projectSkillId: string
  actorId: string
  auditContext: AuditActionContext
  displayNameOverride?: string | null
  descriptionOverride?: string | null
  rubricVersionId?: string | null
}

export interface UpdateProjectSkillResult {
  projectSkill: ProjectSkillRecord
  previous: {
    display_name_override: string | null
    description_override: string | null
    rubric_version_id: string | null
  }
}

export default class UpdateProjectSkillCommand {
  constructor(
    private readonly repository: ProjectSkillRepository,
    private readonly audit: Pick<AuditLogWriter, 'log'> = auditPublicApi
  ) {}

  async execute(input: UpdateProjectSkillInput): Promise<UpdateProjectSkillResult> {
    const projectSkill = await this.repository.findProjectSkillById(input.projectSkillId)
    if (!projectSkill) {
      throw new NotFoundException('Project skill configuration not found')
    }

    if (input.rubricVersionId !== undefined && input.rubricVersionId !== null) {
      const rubricVersion = await this.repository.findRubricVersion(input.rubricVersionId)
      if (!rubricVersion) {
        throw new NotFoundException('Rubric version not found')
      }
      if (rubricVersion.skill_id !== projectSkill.skill_id) {
        throw new ValidationException('Rubric version does not belong to this skill')
      }
    }

    const previous = {
      display_name_override: projectSkill.display_name_override,
      description_override: projectSkill.description_override,
      rubric_version_id: projectSkill.rubric_version_id,
    }
    const changes: UpdateProjectSkillRecord = {
      ...(input.displayNameOverride === undefined
        ? {}
        : { display_name_override: input.displayNameOverride }),
      ...(input.descriptionOverride === undefined
        ? {}
        : { description_override: input.descriptionOverride }),
      ...(input.rubricVersionId === undefined ? {} : { rubric_version_id: input.rubricVersionId }),
    }
    const updated =
      (await this.repository.updateProjectSkill(input.projectSkillId, changes)) ?? projectSkill

    await this.audit.log(
      {
        user_id: input.actorId,
        action: 'update',
        entity_type: 'project_skill',
        entity_id: input.projectSkillId,
        old_values: previous,
        new_values: {
          display_name_override: updated.display_name_override,
          description_override: updated.description_override,
          rubric_version_id: updated.rubric_version_id,
        },
      },
      input.auditContext,
      { critical: true }
    )

    return { projectSkill: updated, previous }
  }
}
