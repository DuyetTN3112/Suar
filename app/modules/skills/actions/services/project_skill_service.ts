import { ProjectSkillRepository, type ProjectSkill } from '#modules/skills/infra/repositories/project_skill_repository'

export const ProjectSkillService = {
  /**
   * Add a global active skill to a project's catalog.
   */
  async addSkillToProject(payload: {
    projectId: string
    skillId: string
    addedBy?: string
  }): Promise<ProjectSkill> {
    const skill = await ProjectSkillRepository.findActiveSkill(payload.skillId)
    if (!skill) {
      throw new Error('Skill is not active or does not exist')
    }

    const existing = await ProjectSkillRepository.findProjectSkill(payload.projectId, payload.skillId)
    if (existing) {
      throw new Error('Skill already added to this project')
    }

    return await ProjectSkillRepository.createProjectSkill({
      project_id: payload.projectId,
      skill_id: payload.skillId,
      added_by: payload.addedBy ?? null,
      is_active: true,
      is_selectable_for_tasks: true,
      is_visible_in_project: true,
    })
  },

  /**
   * Update display name and description overrides for a project skill.
   */
  async updateOverrides(
    projectSkillId: string,
    payload: {
      displayNameOverride?: string | null
      descriptionOverride?: string | null
    }
  ): Promise<ProjectSkill> {
    const projectSkill = await ProjectSkillRepository.findProjectSkillById(projectSkillId)
    if (!projectSkill) {
      throw new Error('Project skill configuration not found')
    }

    if (payload.displayNameOverride !== undefined) {
      projectSkill.display_name_override = payload.displayNameOverride
    }
    if (payload.descriptionOverride !== undefined) {
      projectSkill.description_override = payload.descriptionOverride
    }

    await projectSkill.save()
    return projectSkill
  },

  /**
   * Select a custom rubric version for a project skill.
   */
  async changeRubricVersion(
    projectSkillId: string,
    rubricVersionId: string | null
  ): Promise<ProjectSkill> {
    const projectSkill = await ProjectSkillRepository.findProjectSkillById(projectSkillId)
    if (!projectSkill) {
      throw new Error('Project skill configuration not found')
    }

    if (rubricVersionId !== null) {
      const rubricVersion = await ProjectSkillRepository.findRubricVersion(rubricVersionId)
      if (!rubricVersion) {
        throw new Error('Rubric version not found')
      }
      if (rubricVersion.skill_id !== projectSkill.skill_id) {
        throw new Error('Rubric version does not belong to this skill')
      }
    }

    projectSkill.rubric_version_id = rubricVersionId
    await projectSkill.save()
    return projectSkill
  },

  /**
   * Deactivate a project skill. We don't delete to preserve historical task records.
   */
  async deactivateProjectSkill(projectSkillId: string): Promise<ProjectSkill> {
    const projectSkill = await ProjectSkillRepository.findProjectSkillById(projectSkillId)
    if (!projectSkill) {
      throw new Error('Project skill configuration not found')
    }

    projectSkill.is_active = false
    projectSkill.is_selectable_for_tasks = false
    await projectSkill.save()
    return projectSkill
  },

  /**
   * List all skills in a project catalog.
   */
  async getProjectSkills(projectId: string): Promise<ProjectSkill[]> {
    return await ProjectSkillRepository.listProjectSkills(projectId)
  },
}
