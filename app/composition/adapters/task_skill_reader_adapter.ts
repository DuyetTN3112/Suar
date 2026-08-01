import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  listProjectSkillsQuery,
  skillApplication as skillPublicApi,
} from '#composition/skills_application_composition'
import type {
  TaskProjectRole,
  TaskProjectSkillOption,
  TaskProficiencyLevelDetail,
  TaskRequirementReferenceFacts,
  TaskSkillOption,
  TaskSkillReader,
  TaskSkillSummary,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'

type SkillsTaskApi = Pick<
  typeof skillPublicApi,
  'findSummaryFactsByIds' | 'findTaskRequirementReferenceFactsV1' | 'resolveSkillIdsByCategoryCodes'
>

export class TaskSkillReaderAdapter implements TaskSkillReader {
  constructor(private readonly skillsApi: SkillsTaskApi = skillPublicApi) {}

  async listActiveSkills(): Promise<TaskSkillOption[]> {
    const skills = await skillPublicApi.listActive()

    return skills.map((skill) => ({
      id: skill.id,
      name: skill.skill_name,
      category_code: typeof skill.category_code === 'string' ? skill.category_code : null,
    }))
  }

  async listProjectTaskSkills(projectId: string): Promise<TaskProjectSkillOption[]> {
    const projectSkills = await listProjectSkillsQuery.execute(projectId)

    return projectSkills.map((projectSkill) => ({
      id: projectSkill.skill.id,
      name: projectSkill.display_name_override ?? projectSkill.skill.skill_name,
      categoryCode: projectSkill.skill.category_code,
      rubricVersionId: projectSkill.rubric_version_id,
      isActive: projectSkill.is_active,
      isSelectableForTasks: projectSkill.is_selectable_for_tasks,
    }))
  }

  listActiveProficiencyLevels(): Promise<{ value: string; label: string }[]> {
    return skillPublicApi.listActiveProficiencyLevels()
  }

  async findActiveSkillIds(skillIds: string[], trx?: TransactionClientContract): Promise<string[]> {
    const skills = await skillPublicApi.findActiveByIds(skillIds, trx)
    return skills.map((skill) => skill.id)
  }

  async findSkillSummariesByIds(
    skillIds: string[],
    trx?: TransactionClientContract
  ): Promise<TaskSkillSummary[]> {
    const facts = await this.skillsApi.findSummaryFactsByIds(skillIds, trx)

    return facts.map((fact) => ({
      skillId: fact.id,
      skillName: fact.name,
    }))
  }

  async resolveSkillIdsByCategoryCodes(categoryCodes: string[]): Promise<string[]> {
    const facts = await this.skillsApi.resolveSkillIdsByCategoryCodes(categoryCodes)
    return facts.map((fact) => fact.id)
  }

  async findTaskRequirementReferenceFacts(
    ids: {
      skillIds: string[]
      proficiencyLevelIds: string[]
    },
    trx?: TransactionClientContract
  ): Promise<TaskRequirementReferenceFacts> {
    const facts = await this.skillsApi.findTaskRequirementReferenceFactsV1(ids, trx)
    return {
      skills: facts.skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        code: skill.code,
        categoryCode: skill.categoryCode,
        iconUrl: skill.iconUrl,
      })),
      proficiencyLevels: facts.proficiencyLevels.map((level) => ({
        id: level.id,
        code: level.code,
        displayName: level.displayName,
        shortName: level.shortName,
        ordinal: level.ordinal,
      })),
    }
  }

  async findProficiencyLevelsByIds(ids: string[]): Promise<TaskProficiencyLevelDetail[]> {
    const levels = await skillPublicApi.findProficiencyLevelsByIds(ids)
    return levels.map((level) => ({
      id: level.id,
      code: level.code,
      ordinal: level.ordinal,
      scaleId: level.scale_id,
    }))
  }

  async findProficiencyLevelById(id: string): Promise<TaskProficiencyLevelDetail | null> {
    const level = await skillPublicApi.findProficiencyLevelById(id)
    return level
      ? {
          id: level.id,
          code: level.code,
          ordinal: level.ordinal,
          scaleId: level.scale_id,
        }
      : null
  }

  async findRubricVersion(
    rubricVersionId: string
  ): Promise<{ id: string; skillId: string } | null> {
    const version = await skillPublicApi.findRubricVersion(rubricVersionId)
    return version ? { id: version.id, skillId: version.skill_id } : null
  }

  async findProjectRole(roleId: string): Promise<TaskProjectRole | null> {
    const role = await skillPublicApi.findProjectProfessionalRoleById(roleId, true)
    if (!role) {
      return null
    }

    return {
      id: role.id,
      projectId: role.project_id,
      name: role.name,
      isActive: role.is_active,
      roleSkills: role.role_skills.map((roleSkill) => ({
        id: roleSkill.id,
        projectSkillId: roleSkill.project_skill_id,
        skillId: roleSkill.projectSkill.skill_id,
        skillName: roleSkill.projectSkill.skill.skill_name,
        categoryCode: roleSkill.projectSkill.skill.category_code,
        minimumLevelId: roleSkill.minimum_level_id,
        targetLevelId: roleSkill.target_level_id,
        assessmentCeilingLevelId: roleSkill.assessment_ceiling_level_id,
        isMandatory: roleSkill.is_mandatory,
        importance: roleSkill.importance,
        weight: roleSkill.weight,
        notes: roleSkill.notes,
      })),
    }
  }
}
