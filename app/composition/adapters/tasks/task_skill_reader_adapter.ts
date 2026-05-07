import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import db from '@adonisjs/lucid/services/db'

import {
  listProjectSkillsQuery,
  skillApplication as skillPublicApi,
} from '#composition/skills/skill-application/skills_application_composition'
import type {
  TaskProjectRole,
  TaskProjectSkillOption,
  TaskProficiencyLevelDetail,
  TaskRequirementReferenceFacts,
  TaskSkillEligibility,
  TaskSkillOption,
  TaskSkillReader,
  TaskSkillSummary,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import {
  findCanonicalProficiencyLevelOption,
  getCanonicalProficiencyLevelOrder,
} from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_catalog'

type SkillsTaskApi = Pick<
  typeof skillPublicApi,
  | 'findSummaryFactsByIds'
  | 'findTaskRequirementReferenceFactsV1'
  | 'findProficiencyLevelsByIds'
  | 'resolveSkillIdsByCategoryCodes'
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
    const levelIds = [
      ...new Set(
        projectSkills.flatMap((projectSkill) => [
          projectSkill.minimum_task_requirement_level_id,
          projectSkill.maximum_task_requirement_level_id,
        ]).filter((id): id is string => Boolean(id))
      ),
    ]
    const levels = await this.skillsApi.findProficiencyLevelsByIds(levelIds)
    const levelCodeById = new Map(levels.map((level) => [level.id, level.code]))

    return projectSkills.map((projectSkill) => ({
      id: projectSkill.skill.id,
      projectSkillId: projectSkill.id,
      name: projectSkill.display_name_override ?? projectSkill.skill.skill_name,
      categoryCode: projectSkill.skill.category_code,
      rubricVersionId: projectSkill.rubric_version_id,
      minimumTaskRequirementLevelId: projectSkill.minimum_task_requirement_level_id,
      maximumTaskRequirementLevelId: projectSkill.maximum_task_requirement_level_id,
      minimumTaskRequirementLevelCode:
        projectSkill.minimum_task_requirement_level_id
          ? (levelCodeById.get(projectSkill.minimum_task_requirement_level_id) ?? null)
          : null,
      maximumTaskRequirementLevelCode:
        projectSkill.maximum_task_requirement_level_id
          ? (levelCodeById.get(projectSkill.maximum_task_requirement_level_id) ?? null)
          : null,
      isActive: projectSkill.is_active,
      isSelectableForTasks: projectSkill.is_selectable_for_tasks,
    }))
  }

  listActiveProficiencyLevels(): Promise<{ id: string; value: string; label: string }[]> {
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

  async getTaskSkillEligibility(
    taskId: string,
    userId: string,
    trx?: TransactionClientContract
  ): Promise<TaskSkillEligibility> {
    const connection = trx ?? db
    const requiredSkills = (await connection
      .from('task_required_skills as task_skill')
      .join('skills as skill', 'skill.id', 'task_skill.skill_id')
      .where('task_skill.task_id', taskId)
      .where('task_skill.is_mandatory', true)
      .select(
        'task_skill.skill_id',
        'task_skill.required_public_proficiency_code',
        'skill.skill_name'
      )) as Array<{
      skill_id: string
      required_public_proficiency_code: string | null
      skill_name: string
    }>
    const requiredSkillIds = requiredSkills.map((skill) => skill.skill_id)
    if (requiredSkillIds.length === 0) return { isEligible: true, unmetRequirements: [] }

    const userSkills = (await connection
      .from('user_skills')
      .where('user_id', userId)
      .whereIn('skill_id', requiredSkillIds)
      .select('skill_id', 'verified_public_proficiency_code')) as Array<{
      skill_id: string
      verified_public_proficiency_code: string | null
    }>
    const strongestLevelBySkillId = new Map<string, string>()
    for (const userSkill of userSkills) {
      const currentLevel = userSkill.verified_public_proficiency_code
      if (!currentLevel || !findCanonicalProficiencyLevelOption(currentLevel)) continue
      const previousLevel = strongestLevelBySkillId.get(userSkill.skill_id)
      if (
        !previousLevel ||
        getCanonicalProficiencyLevelOrder(currentLevel) >
          getCanonicalProficiencyLevelOrder(previousLevel)
      ) {
        strongestLevelBySkillId.set(userSkill.skill_id, currentLevel)
      }
    }

    const unmetRequirements = requiredSkills.flatMap((requiredSkill) => {
      const requiredLevel = requiredSkill.required_public_proficiency_code
      const requiredLevelOption = findCanonicalProficiencyLevelOption(requiredLevel)
      const actualLevel = strongestLevelBySkillId.get(requiredSkill.skill_id) ?? null
      if (
        requiredLevelOption &&
        actualLevel &&
        getCanonicalProficiencyLevelOrder(actualLevel) >= requiredLevelOption.order
      ) {
        return []
      }
      return [{
        skillId: requiredSkill.skill_id,
        skillName: requiredSkill.skill_name,
        requiredLevel: requiredLevelOption?.value ?? 'l14',
        actualLevel,
      }]
    })

    return { isEligible: unmetRequirements.length === 0, unmetRequirements }
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
