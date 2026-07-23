import {
  auditPublicApi,
  type AuditLogWriter,
} from '#modules/audit/public_contracts/audit_log_writer'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { SkillCommandAudit } from '#modules/skills/actions/dtos/skill_command_audit'
import type {
  ProfessionalRoleRepository,
  ProjectProfessionalRoleSkillRecord,
} from '#modules/skills/actions/ports/outbound/professional_role_repository'
import type { ProficiencyScaleRepository } from '#modules/skills/actions/ports/outbound/proficiency_scale_repository'
import type { ProjectSkillRepository } from '#modules/skills/actions/ports/outbound/project_skill_repository'
import {
  assertValidProfessionalRoleLevelConfiguration,
  getConfiguredProficiencyLevelIds,
  type ProfessionalRoleLevelConfiguration,
} from '#modules/skills/domain/project-skills/professional_role_level_policy'
import {
  DEFAULT_SKILL_IMPORTANCE,
  DEFAULT_SKILL_WEIGHT,
  type SkillImportance,
} from '#modules/skills/public_contracts/skill_constants'

export interface AddProjectRoleSkillInput extends ProfessionalRoleLevelConfiguration {
  projectId?: string
  projectProfessionalRoleId: string
  projectSkillId: string
  isMandatory?: boolean
  importance?: SkillImportance
  weight?: number
  sortOrder?: number
  notes?: string | null
}

export default class AddProjectRoleSkillCommand {
  constructor(
    private readonly professionalRoles: ProfessionalRoleRepository,
    private readonly projectSkills: ProjectSkillRepository,
    private readonly proficiencyScales: ProficiencyScaleRepository,
    private readonly audit: Pick<AuditLogWriter, 'log'> = auditPublicApi
  ) {}

  async execute(
    input: AddProjectRoleSkillInput,
    audit?: SkillCommandAudit
  ): Promise<ProjectProfessionalRoleSkillRecord> {
    const role = await this.professionalRoles.findProjectRoleById(input.projectProfessionalRoleId)
    if (!role) {
      throw new NotFoundException('Project professional role not found')
    }
    if (input.projectId !== undefined && role.project_id !== input.projectId) {
      throw new NotFoundException('Project professional role not found')
    }

    const projectSkill = await this.projectSkills.findProjectSkillById(input.projectSkillId)
    if (!projectSkill) {
      throw new NotFoundException('Project skill not found')
    }
    if (projectSkill.project_id !== role.project_id) {
      throw new ValidationException(
        'Project skill does not belong to the same project as this role'
      )
    }

    await this.assertSkillIsNotAssigned(input)
    await this.validateLevelConfiguration(input)

    const roleSkill = await this.professionalRoles.createProjectRoleSkill({
      project_professional_role_id: input.projectProfessionalRoleId,
      project_skill_id: input.projectSkillId,
      minimum_level_id: input.minimumLevelId ?? null,
      target_level_id: input.targetLevelId ?? null,
      assessment_ceiling_level_id: input.assessmentCeilingLevelId ?? null,
      is_mandatory: input.isMandatory ?? true,
      importance: input.importance ?? DEFAULT_SKILL_IMPORTANCE,
      weight: input.weight ?? DEFAULT_SKILL_WEIGHT,
      sort_order: input.sortOrder ?? 0,
      notes: input.notes ?? null,
    })
    if (audit) {
      await this.audit.log(
        {
          user_id: audit.actorId,
          action: 'create',
          entity_type: 'project_professional_role_skill',
          entity_id: roleSkill.id,
          old_values: null,
          new_values: {
            project_professional_role_id: input.projectProfessionalRoleId,
            project_skill_id: input.projectSkillId,
            ...this.toAuditValues(roleSkill),
          },
        },
        audit.context,
        { critical: true }
      )
    }
    return roleSkill
  }

  private toAuditValues(roleSkill: ProjectProfessionalRoleSkillRecord) {
    return {
      minimum_level_id: roleSkill.minimum_level_id,
      target_level_id: roleSkill.target_level_id,
      assessment_ceiling_level_id: roleSkill.assessment_ceiling_level_id,
      is_mandatory: roleSkill.is_mandatory,
      importance: roleSkill.importance,
      weight: roleSkill.weight,
      sort_order: roleSkill.sort_order,
      notes: roleSkill.notes,
    }
  }

  private async assertSkillIsNotAssigned(input: AddProjectRoleSkillInput): Promise<void> {
    const existingRoleSkill = await this.professionalRoles.findProjectRoleSkill(
      input.projectProfessionalRoleId,
      input.projectSkillId
    )
    if (existingRoleSkill) {
      throw new ConflictException('Skill already exists in this project professional role')
    }
  }

  private async validateLevelConfiguration(
    configuration: ProfessionalRoleLevelConfiguration
  ): Promise<void> {
    const levelIds = getConfiguredProficiencyLevelIds(configuration)
    if (levelIds.length === 0) return

    const levels = await this.proficiencyScales.findLevelsByIds(levelIds)
    assertValidProfessionalRoleLevelConfiguration(
      configuration,
      levels.map((level) => ({
        id: level.id,
        scaleId: level.scale_id,
        ordinal: level.ordinal,
      }))
    )
  }
}
