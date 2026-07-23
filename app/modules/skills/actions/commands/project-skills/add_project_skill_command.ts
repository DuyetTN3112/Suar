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
import type { ProficiencyScaleRepository } from '#modules/skills/actions/ports/outbound/proficiency_scale_repository'
import type { ProjectSkillTaskMetadataCacheInvalidator } from '#modules/skills/actions/ports/outbound/project_skill_task_metadata_cache_invalidator'
import {
  assertValidProjectTaskRequirementRange,
  getProjectTaskRequirementRangeLevelIds,
} from '#modules/skills/domain/project-skills/project_task_requirement_range_policy'

export interface AddProjectSkillInput {
  projectId: string
  skillId: string
  addedBy?: string
  minimumTaskRequirementLevelId?: string | null
  maximumTaskRequirementLevelId?: string | null
  /** Chỉ dành cho luồng nội bộ khi sao chép vai trò mẫu. */
  allowUnconfiguredTaskRequirementRange?: boolean
  auditContext?: AuditActionContext
}

export default class AddProjectSkillCommand {
  constructor(
    private readonly repository: ProjectSkillRepository,
    private readonly proficiencyScales: ProficiencyScaleRepository,
    private readonly audit: Pick<AuditLogWriter, 'log'> = auditPublicApi,
    private readonly taskMetadataCache: ProjectSkillTaskMetadataCacheInvalidator = {
      invalidateTaskMetadata: () => Promise.resolve(),
    }
  ) {}

  async execute(
    input: AddProjectSkillInput,
    transaction?: SkillTransaction
  ): Promise<ProjectSkillRecord> {
    await this.validateTaskRequirementRange(input, transaction)
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
        minimum_task_requirement_level_id: input.minimumTaskRequirementLevelId ?? null,
        maximum_task_requirement_level_id: input.maximumTaskRequirementLevelId ?? null,
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
            minimum_task_requirement_level_id:
              projectSkill.minimum_task_requirement_level_id,
            maximum_task_requirement_level_id:
              projectSkill.maximum_task_requirement_level_id,
          },
        },
        input.auditContext,
        transaction ? { trx: transaction, critical: true } : { critical: true }
      )
    }

    // A caller that supplied a transaction owns the commit boundary. It must
    // invalidate after commit rather than exposing uncommitted configuration.
    if (!transaction) {
      await this.taskMetadataCache.invalidateTaskMetadata()
    }

    return projectSkill
  }

  private async validateTaskRequirementRange(
    input: AddProjectSkillInput,
    transaction?: SkillTransaction
  ): Promise<void> {
    const range = {
      minimumTaskRequirementLevelId: input.minimumTaskRequirementLevelId ?? null,
      maximumTaskRequirementLevelId: input.maximumTaskRequirementLevelId ?? null,
    }
    const levelIds = getProjectTaskRequirementRangeLevelIds(range)
    const levels = await this.proficiencyScales.findLevelsByIds(levelIds, transaction)
    assertValidProjectTaskRequirementRange(
      range,
      levels.map((level) => ({ id: level.id, scaleId: level.scale_id, ordinal: level.ordinal })),
      { allowUnconfigured: input.allowUnconfiguredTaskRequirementRange === true }
    )
  }
}
