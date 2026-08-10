export interface TaskRequirementLevelFact {
  id: string
  ordinal: number
  scaleId: string
}

export interface TaskRequirementVersionComparableItem {
  skill_id: string
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  rubric_version_id: string | null
  weight: number
  importance: string
  is_mandatory: boolean
  requirement_source: string
}

export interface TaskRequirementVersionDiff {
  addedSkills: string[]
  removedSkills: string[]
  modifiedSkills: string[]
}

export function getTaskRequirementLevelConfigurationViolation(input: {
  minimumLevelId: string | null
  targetLevelId: string | null
  assessmentCeilingLevelId: string | null
  levels: TaskRequirementLevelFact[]
}): string | null {
  const requestedIds = [
    input.minimumLevelId,
    input.targetLevelId,
    input.assessmentCeilingLevelId,
  ].filter((value): value is string => value !== null)
  const levelsById = new Map(input.levels.map((level) => [level.id, level]))

  const missingLevelId = requestedIds.find((id) => !levelsById.has(id))
  if (missingLevelId) {
    return `Proficiency level not found: ${missingLevelId}`
  }

  if (new Set(input.levels.map((level) => level.scaleId)).size > 1) {
    return 'All proficiency levels must belong to the same proficiency scale'
  }

  const minimum = input.minimumLevelId ? levelsById.get(input.minimumLevelId) : null
  const target = input.targetLevelId ? levelsById.get(input.targetLevelId) : null
  const ceiling = input.assessmentCeilingLevelId
    ? levelsById.get(input.assessmentCeilingLevelId)
    : null

  if (minimum && target && minimum.ordinal > target.ordinal) {
    return 'Minimum level ordinal must be <= target level ordinal'
  }
  if (target && ceiling && target.ordinal > ceiling.ordinal) {
    return 'Target level ordinal must be <= assessment ceiling level ordinal'
  }
  if (minimum && ceiling && minimum.ordinal > ceiling.ordinal) {
    return 'Minimum level ordinal must be <= assessment ceiling level ordinal'
  }

  return null
}

export function getTaskRequirementValueViolation(input: {
  isMandatory: boolean
  minimumLevelId: string | null
  weight: number
}): string | null {
  if (input.isMandatory && !input.minimumLevelId) {
    return 'Mandatory skill requirement must have a minimum level'
  }
  if (input.weight < 0) {
    return 'Weight must be >= 0'
  }
  return null
}

export function diffTaskRequirementVersionItems(
  previousItems: TaskRequirementVersionComparableItem[],
  currentItems: TaskRequirementVersionComparableItem[]
): TaskRequirementVersionDiff {
  const previousBySkill = new Map(previousItems.map((item) => [item.skill_id, item]))
  const currentBySkill = new Map(currentItems.map((item) => [item.skill_id, item]))

  const addedSkills = [...currentBySkill.keys()].filter((id) => !previousBySkill.has(id))
  const removedSkills = [...previousBySkill.keys()].filter((id) => !currentBySkill.has(id))
  const modifiedSkills: string[] = []

  for (const [skillId, previous] of previousBySkill) {
    const current = currentBySkill.get(skillId)
    if (
      current &&
      (previous.minimum_level_id !== current.minimum_level_id ||
        previous.target_level_id !== current.target_level_id ||
        previous.assessment_ceiling_level_id !== current.assessment_ceiling_level_id ||
        previous.rubric_version_id !== current.rubric_version_id ||
        previous.weight !== current.weight ||
        previous.importance !== current.importance ||
        previous.is_mandatory !== current.is_mandatory ||
        previous.requirement_source !== current.requirement_source)
    ) {
      modifiedSkills.push(skillId)
    }
  }

  return { addedSkills, removedSkills, modifiedSkills }
}
