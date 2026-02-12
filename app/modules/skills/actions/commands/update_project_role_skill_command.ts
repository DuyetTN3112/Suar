import {
  auditPublicApi,
  type AuditLogWriter,
} from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { SkillCommandAudit } from '#modules/skills/actions/dtos/skill_command_audit'
import type {
  ProfessionalRoleRepository,
  ProjectProfessionalRoleSkillRecord,
  UpdateProjectProfessionalRoleSkillRecord,
} from '#modules/skills/actions/ports/outbound/professional_role_repository'
import type { ProficiencyScaleRepository } from '#modules/skills/actions/ports/outbound/proficiency_scale_repository'
import type {
  SkillTransaction,
  SkillTransactionRunner,
} from '#modules/skills/actions/ports/outbound/skill_transaction'
import {
  assertValidProfessionalRoleLevelConfiguration,
  getConfiguredProficiencyLevelIds,
  type ProfessionalRoleLevelConfiguration,
} from '#modules/skills/domain/professional_role_level_policy'
import type { SkillImportance } from '#modules/skills/public_contracts/skill_constants'

export interface UpdateProjectRoleSkillInput extends ProfessionalRoleLevelConfiguration {
  projectRoleSkillId: string
  isMandatory?: boolean
  importance?: SkillImportance
  weight?: number
  sortOrder?: number
  notes?: string | null
}

export interface ProjectRoleSkillSnapshot {
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  is_mandatory: boolean
  importance: SkillImportance
  weight: number
  sort_order: number
  notes: string | null
}

export interface UpdateProjectRoleSkillResult {
  roleSkill: ProjectProfessionalRoleSkillRecord
  previous: ProjectRoleSkillSnapshot
}

export default class UpdateProjectRoleSkillCommand {
  constructor(
    private readonly professionalRoles: ProfessionalRoleRepository,
    private readonly proficiencyScales: ProficiencyScaleRepository,
    private readonly transactionRunner: SkillTransactionRunner,
    private readonly audit: Pick<AuditLogWriter, 'log'> = auditPublicApi
  ) {}

  execute(
    input: UpdateProjectRoleSkillInput,
    audit?: SkillCommandAudit
  ): Promise<UpdateProjectRoleSkillResult> {
    return this.transactionRunner.run(async (transaction) => {
      const roleSkill = await this.getRoleSkill(input.projectRoleSkillId, transaction)
      const previous = this.toSnapshot(roleSkill)
      const levelConfiguration = this.resolveLevelConfiguration(input, roleSkill)

      await this.validateLevelConfiguration(levelConfiguration, transaction)
      const updated = await this.professionalRoles.updateProjectRoleSkill(
        roleSkill.id,
        this.buildUpdates(input),
        transaction
      )
      if (!updated) {
        throw new NotFoundException('Project professional role skill not found')
      }
      await this.professionalRoles.incrementProjectRoleVersion(
        roleSkill.project_professional_role_id,
        transaction
      )
      if (audit) {
        await this.audit.log(
          {
            user_id: audit.actorId,
            action: 'update',
            entity_type: 'project_professional_role_skill',
            entity_id: roleSkill.id,
            old_values: previous,
            new_values: this.toSnapshot(updated),
          },
          audit.context,
          { trx: transaction, critical: true }
        )
      }

      return { roleSkill: updated, previous }
    })
  }

  private async getRoleSkill(
    projectRoleSkillId: string,
    transaction: SkillTransaction
  ): Promise<ProjectProfessionalRoleSkillRecord> {
    const roleSkill = await this.professionalRoles.findProjectRoleSkillById(
      projectRoleSkillId,
      transaction
    )
    if (!roleSkill) {
      throw new NotFoundException('Project professional role skill not found')
    }
    return roleSkill
  }

  private resolveLevelConfiguration(
    input: UpdateProjectRoleSkillInput,
    roleSkill: ProjectProfessionalRoleSkillRecord
  ): Required<ProfessionalRoleLevelConfiguration> {
    return {
      minimumLevelId:
        input.minimumLevelId === undefined ? roleSkill.minimum_level_id : input.minimumLevelId,
      targetLevelId:
        input.targetLevelId === undefined ? roleSkill.target_level_id : input.targetLevelId,
      assessmentCeilingLevelId:
        input.assessmentCeilingLevelId === undefined
          ? roleSkill.assessment_ceiling_level_id
          : input.assessmentCeilingLevelId,
    }
  }

  private async validateLevelConfiguration(
    configuration: ProfessionalRoleLevelConfiguration,
    transaction: SkillTransaction
  ): Promise<void> {
    const levelIds = getConfiguredProficiencyLevelIds(configuration)
    if (levelIds.length === 0) return

    const levels = await this.proficiencyScales.findLevelsByIds(levelIds, transaction)
    assertValidProfessionalRoleLevelConfiguration(
      configuration,
      levels.map((level) => ({
        id: level.id,
        scaleId: level.scale_id,
        ordinal: level.ordinal,
      }))
    )
  }

  private buildUpdates(
    input: UpdateProjectRoleSkillInput
  ): UpdateProjectProfessionalRoleSkillRecord {
    return {
      ...(input.minimumLevelId === undefined ? {} : { minimum_level_id: input.minimumLevelId }),
      ...(input.targetLevelId === undefined ? {} : { target_level_id: input.targetLevelId }),
      ...(input.assessmentCeilingLevelId === undefined
        ? {}
        : { assessment_ceiling_level_id: input.assessmentCeilingLevelId }),
      ...(input.isMandatory === undefined ? {} : { is_mandatory: input.isMandatory }),
      ...(input.importance === undefined ? {} : { importance: input.importance }),
      ...(input.weight === undefined ? {} : { weight: input.weight }),
      ...(input.sortOrder === undefined ? {} : { sort_order: input.sortOrder }),
      ...(input.notes === undefined ? {} : { notes: input.notes }),
    }
  }

  private toSnapshot(roleSkill: ProjectProfessionalRoleSkillRecord): ProjectRoleSkillSnapshot {
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
}
