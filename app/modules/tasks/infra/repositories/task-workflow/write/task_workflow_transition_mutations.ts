import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import TaskWorkflowTransition from '#modules/tasks/infra/models/task-workflow/task_workflow_transition'
import type { TaskWorkflowTransitionRecord } from '#modules/tasks/types/task_records'

function serializeDateTime(value: { toISO(): string | null } | null | undefined): string | null {
  return value?.toISO() ?? null
}

function toTaskWorkflowTransitionRecord(
  model: TaskWorkflowTransition
): TaskWorkflowTransitionRecord {
  return {
    id: model.id,
    organization_id: model.organization_id,
    project_id: model.project_id,
    from_status_id: model.from_status_id,
    to_status_id: model.to_status_id,
    conditions: model.conditions,
    created_at: serializeDateTime(model.created_at),
  }
}

export async function create(
  data: Record<string, unknown>,
  trx?: TransactionClientContract
): Promise<TaskWorkflowTransitionRecord> {
  const transition = await TaskWorkflowTransition.create(
    data,
    trx ? { client: trx } : undefined
  )
  return toTaskWorkflowTransitionRecord(transition)
}

export async function deleteByOrganization(
  organizationId: string,
  trx?: TransactionClientContract,
  projectId?: string
): Promise<void> {
  const query = trx
    ? TaskWorkflowTransition.query({ client: trx })
    : TaskWorkflowTransition.query()
  const scopedQuery = query.where('organization_id', organizationId)
  if (projectId) {
    void scopedQuery.where('project_id', projectId)
  }
  await scopedQuery.delete()
}
