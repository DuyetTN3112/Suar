import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import {
  auditPublicApi,
  type AuditLogWriter,
} from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { ProficiencyScaleRepository } from '#modules/skills/actions/ports/outbound/proficiency_scale_repository'
import type {
  ProjectSkillRecord,
  ProjectSkillRepository,
  UpdateProjectSkillRecord,
} from '#modules/skills/actions/ports/outbound/project_skill_repository'
import type { ProjectSkillTaskMetadataCacheInvalidator } from '#modules/skills/actions/ports/outbound/project_skill_task_metadata_cache_invalidator'
import {
  assertValidProjectTaskRequirementRange,
  getProjectTaskRequirementRangeLevelIds,
} from '#modules/skills/domain/project-skills/project_task_requirement_range_policy'
import { SKILL_RUBRIC_VERSION_STATUSES } from '#modules/skills/public_contracts/skill_constants'

export interface UpdateProjectSkillInput {
  projectId?: string
  projectSkillId: string
  actorId: string
  auditContext: AuditActionContext
  displayNameOverride?: string | null
  descriptionOverride?: string | null
  rubricVersionId?: string | null
  isActive?: boolean
  minimumTaskRequirementLevelId?: string | null
  maximumTaskRequirementLevelId?: string | null
}

export interface UpdateProjectSkillResult {
  projectSkill: ProjectSkillRecord
  previous: {
    display_name_override: string | null
    description_override: string | null
    rubric_version_id: string | null
    minimum_task_requirement_level_id: string | null
    maximum_task_requirement_level_id: string | null
  }
}

export default class UpdateProjectSkillCommand {
  constructor(
    private readonly repository: ProjectSkillRepository,
    private readonly proficiencyScales: ProficiencyScaleRepository,
    private readonly audit: Pick<AuditLogWriter, 'log'> = auditPublicApi,
    private readonly taskMetadataCache: ProjectSkillTaskMetadataCacheInvalidator = {
      invalidateTaskMetadata: () => Promise.resolve(),
    }
  ) {}

  async execute(input: UpdateProjectSkillInput): Promise<UpdateProjectSkillResult> {
    const projectSkill = await this.repository.findProjectSkillById(input.projectSkillId)
    if (!projectSkill) {
      throw new NotFoundException('Project skill configuration not found')
    }
    if (input.projectId !== undefined && projectSkill.project_id !== input.projectId) {
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
      if (rubricVersion.status !== SKILL_RUBRIC_VERSION_STATUSES.PUBLISHED) {
        throw new ValidationException('Only a published rubric version can be attached to a project skill')
      }
    }

    const proposedRange = {
      minimumTaskRequirementLevelId:
        input.minimumTaskRequirementLevelId === undefined
          ? projectSkill.minimum_task_requirement_level_id
          : input.minimumTaskRequirementLevelId,
      maximumTaskRequirementLevelId:
        input.maximumTaskRequirementLevelId === undefined
          ? projectSkill.maximum_task_requirement_level_id
          : input.maximumTaskRequirementLevelId,
    }
    const isUpdatingTaskRequirementRange =
      input.minimumTaskRequirementLevelId !== undefined ||
      input.maximumTaskRequirementLevelId !== undefined
    if (isUpdatingTaskRequirementRange) {
      const rangeLevels = await this.proficiencyScales.findLevelsByIds(
        getProjectTaskRequirementRangeLevelIds(proposedRange)
      )
      assertValidProjectTaskRequirementRange(
        proposedRange,
        rangeLevels.map((level) => ({ id: level.id, scaleId: level.scale_id, ordinal: level.ordinal }))
      )
    }

    const previous = {
      display_name_override: projectSkill.display_name_override,
    description_override: projectSkill.description_override,
    rubric_version_id: projectSkill.rubric_version_id,
    is_active: projectSkill.is_active,
    is_selectable_for_tasks: projectSkill.is_selectable_for_tasks,
      minimum_task_requirement_level_id: projectSkill.minimum_task_requirement_level_id,
      maximum_task_requirement_level_id: projectSkill.maximum_task_requirement_level_id,
    }
    const changes: UpdateProjectSkillRecord = {
      ...(input.displayNameOverride === undefined
        ? {}
        : { display_name_override: input.displayNameOverride }),
      ...(input.descriptionOverride === undefined
        ? {}
        : { description_override: input.descriptionOverride }),
      ...(input.rubricVersionId === undefined ? {} : { rubric_version_id: input.rubricVersionId }),
      ...(input.isActive === undefined
        ? {}
        : { is_active: input.isActive, is_selectable_for_tasks: input.isActive }),
      ...(input.minimumTaskRequirementLevelId === undefined
        ? {}
        : { minimum_task_requirement_level_id: input.minimumTaskRequirementLevelId }),
      ...(input.maximumTaskRequirementLevelId === undefined
        ? {}
        : { maximum_task_requirement_level_id: input.maximumTaskRequirementLevelId }),
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
          is_active: updated.is_active,
          is_selectable_for_tasks: updated.is_selectable_for_tasks,
          minimum_task_requirement_level_id: updated.minimum_task_requirement_level_id,
          maximum_task_requirement_level_id: updated.maximum_task_requirement_level_id,
        },
      },
      input.auditContext,
      { critical: true }
    )

    await this.taskMetadataCache.invalidateTaskMetadata()

    return { projectSkill: updated, previous }
  }
}
