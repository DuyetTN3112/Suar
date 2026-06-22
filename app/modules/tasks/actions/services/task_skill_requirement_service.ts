import { skillPublicApi } from '#modules/skills/actions/services/skill_public_api'
import {
  TaskRequirementRepository,
  type TaskRequiredSkill,
} from '#modules/tasks/infra/repositories/task_requirement_repository'

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

  const levels = await skillPublicApi.proficiencyScale.findLevelsByIds(ids)
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

  const min = minimumLevelId ? levelMap.get(minimumLevelId) : null
  const target = targetLevelId ? levelMap.get(targetLevelId) : null
  const ceiling = assessmentCeilingLevelId ? levelMap.get(assessmentCeilingLevelId) : null

  if (min && target && min.ordinal > target.ordinal) {
    throw new Error('Minimum level ordinal must be <= target level ordinal')
  }
  if (target && ceiling && target.ordinal > ceiling.ordinal) {
    throw new Error('Target level ordinal must be <= assessment ceiling level ordinal')
  }
  if (min && ceiling && min.ordinal > ceiling.ordinal) {
    throw new Error('Minimum level ordinal must be <= assessment ceiling level ordinal')
  }
}

async function resolveLegacyRequiredLevelCode(
  options: {
    requiredLevelCode?: string | null
    minimumLevelId?: string | null
    targetLevelId?: string | null
    assessmentCeilingLevelId?: string | null
  }
): Promise<string> {
  if (options.requiredLevelCode && options.requiredLevelCode.trim().length > 0) {
    return options.requiredLevelCode
  }

  const levelId =
    options.minimumLevelId ??
    options.targetLevelId ??
    options.assessmentCeilingLevelId ??
    null

  if (!levelId) {
    return 'junior'
  }

  const level = await skillPublicApi.proficiencyScale.findLevelById(levelId)
  return level?.code ?? 'junior'
}

export const TaskSkillRequirementService = {
  /**
   * Add a skill requirement to a task with full semantic fields.
   */
  async addRequirement(
    taskId: string,
    payload: {
      skillId: string
      projectSkillId?: string | null
      sourceProjectProfessionalRoleId?: string | null
      sourceRoleSkillId?: string | null
      minimumLevelId?: string | null
      targetLevelId?: string | null
      assessmentCeilingLevelId?: string | null
      rubricVersionId?: string | null
      requiredLevelCode?: string
      isMandatory?: boolean
      importance?: 'low' | 'medium' | 'high' | 'critical'
      weight?: number
      requirementSource?: 'manual' | 'professional_role_prefill' | 'template' | 'copied_task' | 'imported_legacy'
      requirementNotes?: string | null
    }
  ): Promise<TaskRequiredSkill> {
    const existing = await TaskRequirementRepository.findByTaskAndSkill(taskId, payload.skillId)
    if (existing) {
      throw new Error('Skill already required in this task')
    }

    const isMandatory = payload.isMandatory ?? true
    if (isMandatory && !payload.minimumLevelId) {
      throw new Error('Mandatory skill requirement must have a minimum level')
    }

    const weight = payload.weight ?? 1.0
    if (weight < 0) {
      throw new Error('Weight must be >= 0')
    }

    await validateLevelConfiguration(
      payload.minimumLevelId,
      payload.targetLevelId,
      payload.assessmentCeilingLevelId
    )

    if (payload.rubricVersionId) {
      const rubricVersion = await skillPublicApi.skillRubric.findRubricVersion(payload.rubricVersionId)
      if (!rubricVersion) {
        throw new Error('Rubric version not found')
      }
      if (rubricVersion.skill_id !== payload.skillId) {
        throw new Error('Rubric version does not belong to the specified skill')
      }
    }

    const requiredLevelCode = await resolveLegacyRequiredLevelCode({
      requiredLevelCode: payload.requiredLevelCode,
      minimumLevelId: payload.minimumLevelId,
      targetLevelId: payload.targetLevelId,
      assessmentCeilingLevelId: payload.assessmentCeilingLevelId,
    })

    return await TaskRequirementRepository.create({
      task_id: taskId,
      skill_id: payload.skillId,
      project_skill_id: payload.projectSkillId ?? null,
      source_project_professional_role_id: payload.sourceProjectProfessionalRoleId ?? null,
      source_role_skill_id: payload.sourceRoleSkillId ?? null,
      minimum_level_id: payload.minimumLevelId ?? null,
      target_level_id: payload.targetLevelId ?? null,
      assessment_ceiling_level_id: payload.assessmentCeilingLevelId ?? null,
      rubric_version_id: payload.rubricVersionId ?? null,
      required_level_code: requiredLevelCode,
      is_mandatory: isMandatory,
      importance: payload.importance ?? 'medium',
      weight,
      requirement_source: payload.requirementSource ?? 'manual',
      requirement_notes: payload.requirementNotes ?? null,
    })
  },

  /**
   * Prefill task skill requirements from a project professional role.
   */
  async prefillFromProjectRole(
    taskId: string,
    projectProfessionalRoleId: string
  ): Promise<{ addedCount: number; skippedCount: number }> {
    const role = await skillPublicApi.professionalRole.findProjectRoleById(projectProfessionalRoleId, true)
    if (!role) {
      throw new Error('Project professional role not found')
    }
    if (!role.is_active) {
      throw new Error('Cannot prefill from an inactive project professional role')
    }

    let addedCount = 0
    let skippedCount = 0

    for (const roleSkill of role.role_skills) {
      const skillId = roleSkill.projectSkill.skill_id
      if (!skillId) {
        skippedCount++
        continue
      }

      const existing = await TaskRequirementRepository.findByTaskAndSkill(taskId, skillId)
      if (existing) {
        skippedCount++
        continue
      }

      const minimumLevelId =
        roleSkill.minimum_level_id ?? (roleSkill.is_mandatory ? roleSkill.target_level_id : null)

      if (roleSkill.is_mandatory && !minimumLevelId) {
        skippedCount++
        continue
      }

      const requiredLevelCode = await resolveLegacyRequiredLevelCode({
        minimumLevelId,
        targetLevelId: roleSkill.target_level_id,
        assessmentCeilingLevelId: roleSkill.assessment_ceiling_level_id,
      })

      await TaskRequirementRepository.create({
        task_id: taskId,
        skill_id: skillId,
        project_skill_id: roleSkill.project_skill_id,
        source_project_professional_role_id: projectProfessionalRoleId,
        source_role_skill_id: roleSkill.id,
        minimum_level_id: minimumLevelId,
        target_level_id: roleSkill.target_level_id,
        assessment_ceiling_level_id: roleSkill.assessment_ceiling_level_id,
        rubric_version_id: null,
        required_level_code: requiredLevelCode,
        is_mandatory: roleSkill.is_mandatory,
        importance: roleSkill.importance,
        weight: roleSkill.weight,
        requirement_source: 'professional_role_prefill',
        requirement_notes: roleSkill.notes,
      })

      addedCount++
    }

    return { addedCount, skippedCount }
  },

  /**
   * Update an existing task skill requirement.
   */
  async updateRequirement(
    requirementId: string,
    payload: {
      minimumLevelId?: string | null
      targetLevelId?: string | null
      assessmentCeilingLevelId?: string | null
      rubricVersionId?: string | null
      isMandatory?: boolean
      importance?: 'low' | 'medium' | 'high' | 'critical'
      weight?: number
      requirementNotes?: string | null
    }
  ): Promise<TaskRequiredSkill> {
    const requirement = await TaskRequirementRepository.findById(requirementId)
    if (!requirement) {
      throw new Error('Task skill requirement not found')
    }

    const effectiveMin =
      payload.minimumLevelId !== undefined ? payload.minimumLevelId : requirement.minimum_level_id
    const effectiveTarget =
      payload.targetLevelId !== undefined ? payload.targetLevelId : requirement.target_level_id
    const effectiveCeiling =
      payload.assessmentCeilingLevelId !== undefined
        ? payload.assessmentCeilingLevelId
        : requirement.assessment_ceiling_level_id

    await validateLevelConfiguration(effectiveMin, effectiveTarget, effectiveCeiling)

    const effectiveMandatory = payload.isMandatory ?? requirement.is_mandatory
    if (effectiveMandatory && !effectiveMin) {
      throw new Error('Mandatory skill requirement must have a minimum level')
    }

    if (payload.weight !== undefined && payload.weight < 0) {
      throw new Error('Weight must be >= 0')
    }

    if (payload.rubricVersionId !== undefined && payload.rubricVersionId !== null) {
      const rubric = await skillPublicApi.skillRubric.findRubricVersion(payload.rubricVersionId)
      if (!rubric) throw new Error('Rubric version not found')
      if (rubric.skill_id !== requirement.skill_id) {
        throw new Error('Rubric version does not belong to the specified skill')
      }
    }

    if (payload.minimumLevelId !== undefined) requirement.minimum_level_id = payload.minimumLevelId
    if (payload.targetLevelId !== undefined) requirement.target_level_id = payload.targetLevelId
    if (payload.assessmentCeilingLevelId !== undefined)
      requirement.assessment_ceiling_level_id = payload.assessmentCeilingLevelId
    if (payload.rubricVersionId !== undefined) requirement.rubric_version_id = payload.rubricVersionId
    if (payload.isMandatory !== undefined) requirement.is_mandatory = payload.isMandatory
    if (payload.importance !== undefined) requirement.importance = payload.importance
    if (payload.weight !== undefined) requirement.weight = payload.weight
    if (payload.requirementNotes !== undefined) requirement.requirement_notes = payload.requirementNotes

    await requirement.save()
    return requirement
  },

  /**
   * Remove a skill requirement from a task.
   */
  async removeRequirement(requirementId: string): Promise<void> {
    const requirement = await TaskRequirementRepository.findById(requirementId)
    if (!requirement) {
      throw new Error('Task skill requirement not found')
    }
    await requirement.delete()
  },

  /**
   * List all skill requirements for a task (with level + rubric preloaded).
   */
  async getRequirements(taskId: string): Promise<TaskRequiredSkill[]> {
    return await TaskRequirementRepository.findByTaskWithRelations(taskId)
  },
}
