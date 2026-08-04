import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  TaskRequirementProficiencyLevelProjection,
  TaskRequirementProjection,
  TaskRequirementSemanticLevelProvenance,
  TaskRequirementSkillProjection,
} from '#modules/tasks/actions/dtos/response/task_requirement_projection'
import type { TaskRequirementReferenceFacts } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskRequirementProjectionSource } from '#modules/tasks/actions/ports/outbound/task_requirement_projection_reader'

export interface TaskRequirementReferenceIds {
  skillIds: string[]
  proficiencyLevelIds: string[]
}

function classifySemanticLevelProvenance(
  requirement: TaskRequirementProjectionSource
): TaskRequirementSemanticLevelProvenance {
  const levelIds = [
    requirement.minimum_level_id,
    requirement.target_level_id,
    requirement.assessment_ceiling_level_id,
  ]
  if (levelIds.every((levelId) => levelId === null)) {
    return 'public_hint_only'
  }

  const [minimumLevelId, targetLevelId, ceilingLevelId] = levelIds
  const hasSuspiciousFlattenedTriplet =
    minimumLevelId !== null &&
    minimumLevelId === targetLevelId &&
    minimumLevelId === ceilingLevelId &&
    requirement.rubric_version_id === null &&
    requirement.project_skill_id === null &&
    requirement.source_project_professional_role_id === null &&
    requirement.source_role_skill_id === null &&
    ['manual', 'copied_task', 'imported_legacy'].includes(requirement.requirement_source)

  return hasSuspiciousFlattenedTriplet ? 'legacy_flattened_unverified' : 'explicit_range'
}

export function collectTaskRequirementReferenceIds(
  requirements: TaskRequirementProjectionSource[]
): TaskRequirementReferenceIds {
  return {
    skillIds: [...new Set(requirements.map((requirement) => requirement.skill_id))],
    proficiencyLevelIds: [
      ...new Set(
        requirements.flatMap((requirement) =>
          [
            requirement.minimum_level_id,
            requirement.target_level_id,
            requirement.assessment_ceiling_level_id,
          ].filter((id): id is string => id !== null)
        )
      ),
    ],
  }
}

/** Maps already-loaded Tasks and Skills facts into the Tasks-owned read projection. */
export function mapTaskRequirementProjections(
  requirements: TaskRequirementProjectionSource[],
  references: TaskRequirementReferenceFacts
): TaskRequirementProjection[] {
  if (requirements.length === 0) return []

  const { skillIds, proficiencyLevelIds } = collectTaskRequirementReferenceIds(requirements)
  const skillsById = new Map<string, TaskRequirementSkillProjection>(
    references.skills.map((skill) => [
      skill.id,
      {
        id: skill.id,
        skill_name: skill.name,
        skill_code: skill.code,
        category_code: skill.categoryCode,
        icon_url: skill.iconUrl,
      },
    ])
  )
  const levelsById = new Map<string, TaskRequirementProficiencyLevelProjection>(
    references.proficiencyLevels.map((level) => [
      level.id,
      {
        id: level.id,
        code: level.code,
        display_name: level.displayName,
        short_name: level.shortName,
        ordinal: level.ordinal,
      },
    ])
  )

  const missingSkillIds = skillIds.filter((skillId) => !skillsById.has(skillId))
  const missingLevelIds = proficiencyLevelIds.filter((levelId) => !levelsById.has(levelId))
  if (missingSkillIds.length > 0 || missingLevelIds.length > 0) {
    throw new InvariantViolationException(
      'Task requirement projection is missing Skills reference facts',
      {
        details: {
          missingSkillIds,
          missingLevelIds,
        },
      }
    )
  }

  return requirements.map((requirement) => {
    const skill = skillsById.get(requirement.skill_id)
    if (!skill) {
      throw new InvariantViolationException(
        `Task requirement ${requirement.id} lost skill fact ${requirement.skill_id}`
      )
    }

    const semanticLevelProvenance = classifySemanticLevelProvenance(requirement)

    return {
      id: requirement.id,
      task_id: requirement.task_id,
      skill_id: requirement.skill_id,
      project_skill_id: requirement.project_skill_id,
      source_project_professional_role_id: requirement.source_project_professional_role_id,
      source_role_skill_id: requirement.source_role_skill_id,
      minimum_level_id: requirement.minimum_level_id,
      target_level_id: requirement.target_level_id,
      assessment_ceiling_level_id: requirement.assessment_ceiling_level_id,
      rubric_version_id: requirement.rubric_version_id,
      semantic_level_provenance: semanticLevelProvenance,
      is_semantic_level_claimable: semanticLevelProvenance === 'explicit_range',
      required_public_proficiency_code: requirement.required_public_proficiency_code,
      proficiency_level_id: requirement.proficiency_level_id,
      is_mandatory: requirement.is_mandatory,
      importance: requirement.importance,
      weight: Number(requirement.weight),
      requirement_source: requirement.requirement_source,
      requirement_notes: requirement.requirement_notes,
      created_at: serializeDate(requirement.created_at),
      skill,
      minimum_level: requirement.minimum_level_id
        ? (levelsById.get(requirement.minimum_level_id) ?? null)
        : null,
      target_level: requirement.target_level_id
        ? (levelsById.get(requirement.target_level_id) ?? null)
        : null,
      assessment_ceiling_level: requirement.assessment_ceiling_level_id
        ? (levelsById.get(requirement.assessment_ceiling_level_id) ?? null)
        : null,
    }
  })
}

function serializeDate(value: TaskRequirementProjectionSource['created_at']): string | null {
  if (value === null) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return value.toISO()
}
