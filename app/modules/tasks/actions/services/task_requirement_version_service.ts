import {
  TaskRequirementRepository,
  type TaskRequirementVersion,
  type RequirementVersionReason,
} from '#modules/tasks/infra/repositories/task_requirement_repository'

export const TaskRequirementVersionService = {
  /**
   * Create an immutable snapshot of the current task skill requirements.
   */
  async snapshotRequirements(
    taskId: string,
    reason: RequirementVersionReason,
    createdBy?: string,
    professionalRoleSnapshot?: Record<string, unknown>
  ): Promise<TaskRequirementVersion> {
    const currentRequirements = await TaskRequirementRepository.findByTask(taskId)

    const latestVersion = await TaskRequirementRepository.findLatestVersionByTask(taskId)
    const nextVersionNumber = latestVersion ? latestVersion.version_number + 1 : 1

    // Idempotency: compare skill sets with the latest version
    if (latestVersion?.reason === reason) {
      const latestItems = await TaskRequirementRepository.findVersionItems(latestVersion.id)

      const currentSkillIds = new Set(currentRequirements.map((r) => r.skill_id))
      const latestSkillIds = new Set(latestItems.map((i) => i.skill_id))

      const sameSkills =
        currentSkillIds.size === latestSkillIds.size &&
        [...currentSkillIds].every((id) => latestSkillIds.has(id))

      if (sameSkills) {
        const reloaded = await TaskRequirementRepository.findVersionById(latestVersion.id, true)
        if (!reloaded) throw new Error(`Requirement version ${latestVersion.id} not found`)
        return reloaded
      }
    }

    const version = await TaskRequirementRepository.createVersion({
      task_id: taskId,
      version_number: nextVersionNumber,
      reason,
      created_by: createdBy ?? null,
      professional_role_snapshot: professionalRoleSnapshot ?? null,
    })

    if (currentRequirements.length > 0) {
      await TaskRequirementRepository.createVersionItems(
        currentRequirements.map((req) => ({
          requirement_version_id: version.id,
          skill_id: req.skill_id,
          project_skill_id: req.project_skill_id,
          minimum_level_id: req.minimum_level_id,
          target_level_id: req.target_level_id,
          assessment_ceiling_level_id: req.assessment_ceiling_level_id,
          rubric_version_id: req.rubric_version_id,
          required_level_code: req.required_level_code,
          is_mandatory: req.is_mandatory,
          importance: req.importance,
          weight: req.weight,
          requirement_source: req.requirement_source,
          requirement_notes: req.requirement_notes,
        }))
      )
    }

    const reloaded = await TaskRequirementRepository.findVersionById(version.id, true)
    if (!reloaded) throw new Error(`Requirement version ${version.id} not found`)
    return reloaded
  },

  /**
   * Get the latest version for a task (with items preloaded).
   */
  async getLatestVersion(taskId: string): Promise<TaskRequirementVersion | null> {
    return TaskRequirementRepository.findLatestVersionByTask(taskId, true)
  },

  /**
   * Get a specific version by ID (with items preloaded).
   */
  async getVersionById(versionId: string): Promise<TaskRequirementVersion> {
    const version = await TaskRequirementRepository.findVersionById(versionId, true)
    if (!version) {
      throw new Error('Task requirement version not found')
    }
    return version
  },

  /**
   * Diff two version snapshots.
   */
  async diffVersions(
    versionIdA: string,
    versionIdB: string
  ): Promise<{
    addedSkills: string[]
    removedSkills: string[]
    modifiedSkills: string[]
  }> {
    const [itemsA, itemsB] = await Promise.all([
      TaskRequirementRepository.findVersionItems(versionIdA),
      TaskRequirementRepository.findVersionItems(versionIdB),
    ])

    const mapA = new Map(itemsA.map((i) => [i.skill_id, i]))
    const mapB = new Map(itemsB.map((i) => [i.skill_id, i]))

    const addedSkills = [...mapB.keys()].filter((id) => !mapA.has(id))
    const removedSkills = [...mapA.keys()].filter((id) => !mapB.has(id))

    const modifiedSkills: string[] = []
    for (const [skillId, itemA] of mapA) {
      const itemB = mapB.get(skillId)
      if (!itemB) continue

      const changed =
        itemA.minimum_level_id !== itemB.minimum_level_id ||
        itemA.target_level_id !== itemB.target_level_id ||
        itemA.assessment_ceiling_level_id !== itemB.assessment_ceiling_level_id ||
        itemA.rubric_version_id !== itemB.rubric_version_id ||
        itemA.weight !== itemB.weight ||
        itemA.importance !== itemB.importance ||
        itemA.is_mandatory !== itemB.is_mandatory ||
        itemA.requirement_source !== itemB.requirement_source

      if (changed) {
        modifiedSkills.push(skillId)
      }
    }

    return { addedSkills, removedSkills, modifiedSkills }
  },

  /**
   * List all versions for a task ordered by version number ascending.
   */
  async listVersions(taskId: string): Promise<TaskRequirementVersion[]> {
    return TaskRequirementRepository.findVersionsByTask(taskId)
  },
}
