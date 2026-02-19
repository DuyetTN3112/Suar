import type {
  TaskFactSourceReader,
  TaskTalentMatchContextSource,
} from '#modules/tasks/actions/ports/outbound/task_fact_source_reader'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type {
  TaskTalentMatchContextV1,
  TaskTalentMatchRequirementV1,
} from '#modules/tasks/public_contracts/task_talent_match_context_v1'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toWeight(value: number | string | null): number | null {
  if (value === null) return null
  const weight = Number(value)
  return Number.isFinite(weight) ? weight : null
}

function toRequirement(
  row: TaskTalentMatchContextSource
): TaskTalentMatchRequirementV1 | null {
  if (
    row.requirement_id === null ||
    row.skill_id === null ||
    row.required_public_proficiency_code === null ||
    row.is_mandatory === null
  ) {
    return null
  }

  const weight = toWeight(row.weight)
  if (weight === null) return null

  return {
    skillId: row.skill_id,
    requiredPublicProficiencyCode: row.required_public_proficiency_code,
    isMandatory: row.is_mandatory,
    minimumLevelId: row.minimum_level_id,
    targetLevelId: row.target_level_id,
    assessmentCeilingLevelId: row.assessment_ceiling_level_id,
    importance: row.importance ?? 'medium',
    weight,
    projectSkillId: row.project_skill_id,
    rubricVersionId: row.rubric_version_id,
  }
}

export default class FindTaskTalentMatchContextV1Query {
  constructor(private readonly sources: TaskFactSourceReader) {}

  async execute(
    lookup: string,
    organizationId: string | null,
    trx?: TaskTransaction
  ): Promise<TaskTalentMatchContextV1 | null> {
    const normalizedLookup = lookup.trim()
    if (
      normalizedLookup === '' ||
      (organizationId !== null && !UUID_PATTERN.test(organizationId))
    ) {
      return null
    }

    const rows = await this.sources.listTalentMatchContext(
      normalizedLookup,
      organizationId,
      trx
    )
    if (rows.length === 0) return null

    const selectedTaskId = rows[0]?.task_id
    if (!selectedTaskId) return null

    const matchedTaskIds = new Set(rows.map((row) => row.task_id))
    const lookupIsExactTaskId = UUID_PATTERN.test(normalizedLookup)
    if (!lookupIsExactTaskId && matchedTaskIds.size > 1) return null

    const taskRows = rows.filter((row) => row.task_id === selectedTaskId)
    const task = taskRows[0]
    if (!task) return null

    const requirements: TaskTalentMatchRequirementV1[] = []
    for (const row of taskRows) {
      if (row.requirement_id === null) continue
      const requirement = toRequirement(row)
      if (requirement === null) return null
      requirements.push(requirement)
    }

    return {
      taskId: task.task_id,
      businessDomain: task.business_domain,
      problemCategory: task.problem_category,
      taskType: task.task_type,
      requiredSkills: requirements,
    }
  }
}
