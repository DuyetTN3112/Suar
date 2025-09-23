import { ProjectSkillService } from './project_skill_service.js'

import {
  ProfessionalRoleRepository,
  type ProfessionalRoleTemplate,
  type ProfessionalRoleTemplateSkill,
  type ProjectProfessionalRole,
  type ProjectProfessionalRoleSkill,
} from '#modules/skills/infra/repositories/professional_role_repository'
import { ProficiencyScaleRepository } from '#modules/skills/infra/repositories/proficiency_scale_repository'
import { ProjectSkillRepository } from '#modules/skills/infra/repositories/project_skill_repository'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function validateLevelConfiguration(
  minimumLevelId: string | null | undefined,
  targetLevelId: string | null | undefined,
  assessmentCeilingLevelId: string | null | undefined
): Promise<void> {
  const ids = [minimumLevelId, targetLevelId, assessmentCeilingLevelId].filter(Boolean) as string[]
  if (ids.length === 0) return

  const levels = await ProficiencyScaleRepository.findLevelsByIds(ids)
  const levelMap = new Map(levels.map((l) => [l.id, l]))

  for (const id of ids) {
    if (!levelMap.has(id)) {
      throw new Error(`Proficiency level not found: ${id}`)
    }
  }

  const scaleIds = new Set(levels.map((l) => l.scale_id))
  if (scaleIds.size > 1) {
    throw new Error('All proficiency levels must belong to the same proficiency scale')
  }

  const minLevel = minimumLevelId ? levelMap.get(minimumLevelId) : null
  const targetLevel = targetLevelId ? levelMap.get(targetLevelId) : null
  const ceilingLevel = assessmentCeilingLevelId ? levelMap.get(assessmentCeilingLevelId) : null

  if (minLevel && targetLevel && minLevel.ordinal > targetLevel.ordinal) {
    throw new Error('Minimum level ordinal must be <= target level ordinal')
  }
  if (targetLevel && ceilingLevel && targetLevel.ordinal > ceilingLevel.ordinal) {
    throw new Error('Target level ordinal must be <= assessment ceiling level ordinal')
  }
  if (minLevel && ceilingLevel && minLevel.ordinal > ceilingLevel.ordinal) {
    throw new Error('Minimum level ordinal must be <= assessment ceiling level ordinal')
  }
}

export const ProfessionalRoleService = {
  // ==========================================================================
  // Template management (global, admin-managed)
  // ==========================================================================

  async createTemplate(payload: {
    code: string
    name: string
    description?: string | null
    isActive?: boolean
  }): Promise<ProfessionalRoleTemplate> {
    const existing = await ProfessionalRoleRepository.findTemplateByCode(payload.code)
    if (existing) {
      throw new Error(`Professional role template with code '${payload.code}' already exists`)
    }

    return await ProfessionalRoleRepository.createTemplate({
      code: payload.code,
      name: payload.name,
      description: payload.description ?? null,
      is_active: payload.isActive ?? true,
    })
  },

  async addSkillToTemplate(payload: {
    roleTemplateId: string
    skillId: string
    minimumLevelId?: string | null
    targetLevelId?: string | null
    assessmentCeilingLevelId?: string | null
    isMandatory?: boolean
    importance?: 'low' | 'medium' | 'high' | 'critical'
    weight?: number
    sortOrder?: number
  }): Promise<ProfessionalRoleTemplateSkill> {
    const template = await ProfessionalRoleRepository.findTemplateById(payload.roleTemplateId)
    if (!template) {
      throw new Error('Professional role template not found')
    }

    const existing = await ProfessionalRoleRepository.findTemplateSkill(payload.roleTemplateId, payload.skillId)
    if (existing) {
      throw new Error('Skill already exists in this role template')
    }

    await validateLevelConfiguration(
      payload.minimumLevelId,
      payload.targetLevelId,
      payload.assessmentCeilingLevelId
    )

    return await ProfessionalRoleRepository.createTemplateSkill({
      role_template_id: payload.roleTemplateId,
      skill_id: payload.skillId,
      minimum_level_id: payload.minimumLevelId ?? null,
      target_level_id: payload.targetLevelId ?? null,
      assessment_ceiling_level_id: payload.assessmentCeilingLevelId ?? null,
      is_mandatory: payload.isMandatory ?? true,
      importance: payload.importance ?? 'medium',
      weight: payload.weight ?? 1.0,
      sort_order: payload.sortOrder ?? 0,
    })
  },

  async getTemplates(): Promise<ProfessionalRoleTemplate[]> {
    return await ProfessionalRoleRepository.listActiveTemplates()
  },

  async getTemplateById(id: string): Promise<ProfessionalRoleTemplate> {
    const template = await ProfessionalRoleRepository.findTemplateById(id, true)
    if (!template) {
      throw new Error('Professional role template not found')
    }
    return template
  },

  // ==========================================================================
  // Project professional role management
  // ==========================================================================

  async cloneTemplateToProject(
    projectId: string,
    templateId: string,
    createdBy?: string
  ): Promise<ProjectProfessionalRole> {
    const template = await ProfessionalRoleRepository.findTemplateById(templateId, true)
    if (!template) {
      throw new Error('Professional role template not found')
    }
    if (!template.is_active) {
      throw new Error('Cannot clone an inactive professional role template')
    }

    const existingRole = await ProfessionalRoleRepository.findProjectRoleByCode(projectId, template.code)
    if (existingRole) {
      throw new Error(
        `A professional role with code '${template.code}' already exists in this project`
      )
    }

    const projectRole = await ProfessionalRoleRepository.createProjectRole({
      project_id: projectId,
      source_template_id: templateId,
      code: template.code,
      name: template.name,
      description: template.description,
      is_active: true,
      version: 1,
      created_by: createdBy ?? null,
    })

    for (const templateSkill of template.template_skills) {
      const existingProjectSkill = await ProjectSkillRepository.findProjectSkill(
        projectId,
        templateSkill.skill_id
      )
      const projectSkill =
        existingProjectSkill ??
        (await ProjectSkillService.addSkillToProject({
          projectId,
          skillId: templateSkill.skill_id,
        }))

      await ProfessionalRoleRepository.createProjectRoleSkill({
        project_professional_role_id: projectRole.id,
        project_skill_id: projectSkill.id,
        minimum_level_id: templateSkill.minimum_level_id,
        target_level_id: templateSkill.target_level_id,
        assessment_ceiling_level_id: templateSkill.assessment_ceiling_level_id,
        is_mandatory: templateSkill.is_mandatory,
        importance: templateSkill.importance,
        weight: templateSkill.weight,
        sort_order: templateSkill.sort_order,
        notes: null,
      })
    }

    return projectRole
  },

  async createCustomProjectRole(payload: {
    projectId: string
    code: string
    name: string
    description?: string | null
    createdBy?: string
  }): Promise<ProjectProfessionalRole> {
    const existing = await ProfessionalRoleRepository.findProjectRoleByCode(payload.projectId, payload.code)
    if (existing) {
      throw new Error(
        `A professional role with code '${payload.code}' already exists in this project`
      )
    }

    return await ProfessionalRoleRepository.createProjectRole({
      project_id: payload.projectId,
      source_template_id: null,
      code: payload.code,
      name: payload.name,
      description: payload.description ?? null,
      is_active: true,
      version: 1,
      created_by: payload.createdBy ?? null,
    })
  },

  async addSkillToProjectRole(payload: {
    projectProfessionalRoleId: string
    projectSkillId: string
    minimumLevelId?: string | null
    targetLevelId?: string | null
    assessmentCeilingLevelId?: string | null
    isMandatory?: boolean
    importance?: 'low' | 'medium' | 'high' | 'critical'
    weight?: number
    sortOrder?: number
    notes?: string | null
  }): Promise<ProjectProfessionalRoleSkill> {
    const role = await ProfessionalRoleRepository.findProjectRoleById(payload.projectProfessionalRoleId)
    if (!role) {
      throw new Error('Project professional role not found')
    }

    const projectSkill = await ProjectSkillRepository.findProjectSkillById(payload.projectSkillId)
    if (!projectSkill) {
      throw new Error('Project skill not found')
    }

    if (projectSkill.project_id !== role.project_id) {
      throw new Error('Project skill does not belong to the same project as this role')
    }

    const existing = await ProfessionalRoleRepository.findProjectRoleSkill(
      payload.projectProfessionalRoleId,
      payload.projectSkillId
    )
    if (existing) {
      throw new Error('Skill already exists in this project professional role')
    }

    await validateLevelConfiguration(
      payload.minimumLevelId,
      payload.targetLevelId,
      payload.assessmentCeilingLevelId
    )

    return await ProfessionalRoleRepository.createProjectRoleSkill({
      project_professional_role_id: payload.projectProfessionalRoleId,
      project_skill_id: payload.projectSkillId,
      minimum_level_id: payload.minimumLevelId ?? null,
      target_level_id: payload.targetLevelId ?? null,
      assessment_ceiling_level_id: payload.assessmentCeilingLevelId ?? null,
      is_mandatory: payload.isMandatory ?? true,
      importance: payload.importance ?? 'medium',
      weight: payload.weight ?? 1.0,
      sort_order: payload.sortOrder ?? 0,
      notes: payload.notes ?? null,
    })
  },

  async updateProjectRoleSkill(
    projectRoleSkillId: string,
    payload: {
      minimumLevelId?: string | null
      targetLevelId?: string | null
      assessmentCeilingLevelId?: string | null
      isMandatory?: boolean
      importance?: 'low' | 'medium' | 'high' | 'critical'
      weight?: number
      sortOrder?: number
      notes?: string | null
    }
  ): Promise<ProjectProfessionalRoleSkill> {
    const roleSkill = await ProfessionalRoleRepository.findProjectRoleSkillById(projectRoleSkillId)
    if (!roleSkill) {
      throw new Error('Project professional role skill not found')
    }

    const effectiveMin =
      payload.minimumLevelId !== undefined ? payload.minimumLevelId : roleSkill.minimum_level_id
    const effectiveTarget =
      payload.targetLevelId !== undefined ? payload.targetLevelId : roleSkill.target_level_id
    const effectiveCeiling =
      payload.assessmentCeilingLevelId !== undefined
        ? payload.assessmentCeilingLevelId
        : roleSkill.assessment_ceiling_level_id

    await validateLevelConfiguration(effectiveMin, effectiveTarget, effectiveCeiling)

    if (payload.minimumLevelId !== undefined) roleSkill.minimum_level_id = payload.minimumLevelId
    if (payload.targetLevelId !== undefined) roleSkill.target_level_id = payload.targetLevelId
    if (payload.assessmentCeilingLevelId !== undefined)
      roleSkill.assessment_ceiling_level_id = payload.assessmentCeilingLevelId
    if (payload.isMandatory !== undefined) roleSkill.is_mandatory = payload.isMandatory
    if (payload.importance !== undefined) roleSkill.importance = payload.importance
    if (payload.weight !== undefined) roleSkill.weight = payload.weight
    if (payload.sortOrder !== undefined) roleSkill.sort_order = payload.sortOrder
    if (payload.notes !== undefined) roleSkill.notes = payload.notes

    await roleSkill.save()

    const role = await ProfessionalRoleRepository.findProjectRoleById(roleSkill.project_professional_role_id)
    if (role) {
      role.version = role.version + 1
      await role.save()
    }

    return roleSkill
  },

  async removeSkillFromProjectRole(projectRoleSkillId: string): Promise<void> {
    const roleSkill = await ProfessionalRoleRepository.findProjectRoleSkillById(projectRoleSkillId)
    if (!roleSkill) {
      throw new Error('Project professional role skill not found')
    }

    const roleId = roleSkill.project_professional_role_id
    await roleSkill.delete()

    const role = await ProfessionalRoleRepository.findProjectRoleById(roleId)
    if (role) {
      role.version = role.version + 1
      await role.save()
    }
  },

  async deactivateProjectRole(id: string): Promise<ProjectProfessionalRole> {
    const role = await ProfessionalRoleRepository.findProjectRoleById(id)
    if (!role) {
      throw new Error('Project professional role not found')
    }

    role.is_active = false
    await role.save()
    return role
  },

  async getProjectRoles(projectId: string): Promise<ProjectProfessionalRole[]> {
    return await ProfessionalRoleRepository.listProjectRoles(projectId)
  },

  async compareRoleWithTemplate(projectProfessionalRoleId: string): Promise<{
    sourceTemplateId: string | null
    addedSkills: string[]
    removedSkills: string[]
    modifiedSkills: string[]
  }> {
    const role = await ProfessionalRoleRepository.findProjectRoleById(projectProfessionalRoleId, true)
    if (!role) {
      throw new Error('Project professional role not found')
    }

    if (!role.source_template_id) {
      return {
        sourceTemplateId: null,
        addedSkills: role.role_skills.map((rs) => rs.project_skill_id),
        removedSkills: [],
        modifiedSkills: [],
      }
    }

    const template = await ProfessionalRoleRepository.findTemplateById(role.source_template_id, true)
    if (!template) {
      return {
        sourceTemplateId: role.source_template_id,
        addedSkills: [],
        removedSkills: [],
        modifiedSkills: [],
      }
    }

    const templateSkillIds = new Set(template.template_skills.map((ts) => ts.skill_id))
    const roleSkillToSkillId = new Map(
      role.role_skills.map((rs) => [rs.project_skill_id, rs.projectSkill.skill_id])
    )
    const roleSkillIds = new Set(roleSkillToSkillId.values())

    const addedSkills = [...roleSkillIds].filter((sid) => !templateSkillIds.has(sid))
    const removedSkills = [...templateSkillIds].filter((sid) => !roleSkillIds.has(sid))

    const modifiedSkills: string[] = []
    for (const ts of template.template_skills) {
      const matchingRoleSkill = role.role_skills.find(
        (rs) => rs.projectSkill.skill_id === ts.skill_id
      )
      if (!matchingRoleSkill) continue
      if (
        matchingRoleSkill.minimum_level_id !== ts.minimum_level_id ||
        matchingRoleSkill.target_level_id !== ts.target_level_id ||
        matchingRoleSkill.assessment_ceiling_level_id !== ts.assessment_ceiling_level_id ||
        matchingRoleSkill.weight !== ts.weight ||
        matchingRoleSkill.importance !== ts.importance ||
        matchingRoleSkill.is_mandatory !== ts.is_mandatory
      ) {
        modifiedSkills.push(ts.skill_id)
      }
    }

    return {
      sourceTemplateId: role.source_template_id,
      addedSkills,
      removedSkills,
      modifiedSkills,
    }
  },
}
