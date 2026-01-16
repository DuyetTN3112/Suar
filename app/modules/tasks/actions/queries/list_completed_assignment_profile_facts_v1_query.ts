import {
  parsePersistedObjectArray,
  parsePersistedStringArray,
} from '#modules/errors/public_contracts/persisted_json_array'
import {
  type CompletedAssignmentProfileSource,
  type TaskFactSourceReader,
} from '#modules/tasks/actions/ports/outbound/task_fact_source_reader'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { CompletedAssignmentProfileFactV1 } from '#modules/tasks/public_contracts/completed_assignment_profile_fact_v1'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toNumber(value: number | string | null): number | null {
  if (value === null) return null
  const converted = Number(value)
  return Number.isFinite(converted) ? converted : null
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function toFact(row: CompletedAssignmentProfileSource): CompletedAssignmentProfileFactV1 {
  return {
    contractVersion: 1,
    taskAssignmentId: row.task_assignment_id,
    taskId: row.task_id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    taskTitle: row.task_title,
    taskType: row.task_type,
    businessDomain: row.business_domain,
    problemCategory: row.problem_category,
    roleInTask: row.role_in_task,
    autonomyLevel: row.autonomy_level,
    collaborationType: row.collaboration_type,
    techStack: parsePersistedStringArray(row.tech_stack, {
      table: 'tasks',
      field: 'tech_stack',
      recordId: row.task_id,
    }),
    domainTags: parsePersistedStringArray(row.domain_tags, {
      table: 'tasks',
      field: 'domain_tags',
      recordId: row.task_id,
    }),
    difficulty: row.difficulty,
    estimatedTime: toNumber(row.estimated_time),
    actualTime: toNumber(row.actual_time),
    assignmentEstimatedHours: toNumber(row.assignment_estimated_hours),
    assignmentActualHours: toNumber(row.assignment_actual_hours),
    dueDate: toIso(row.due_date),
    completedAt: toIso(row.completed_at),
    measurableOutcomes: parsePersistedObjectArray(row.measurable_outcomes, {
      table: 'tasks',
      field: 'measurable_outcomes',
      recordId: row.task_id,
    }),
    impactScope: row.impact_scope,
  }
}

export default class ListCompletedAssignmentProfileFactsV1Query {
  constructor(private readonly sources: TaskFactSourceReader) {}

  async execute(
    userId: string,
    trx?: TaskTransaction
  ): Promise<CompletedAssignmentProfileFactV1[]> {
    if (!UUID_PATTERN.test(userId)) return []

    const rows = await this.sources.listCompletedAssignmentProfiles(userId, trx)
    return rows.map(toFact)
  }
}
