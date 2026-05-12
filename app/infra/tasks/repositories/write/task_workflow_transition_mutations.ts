import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import TaskWorkflowTransition from '#infra/tasks/models/task_workflow_transition'
import type { DatabaseId } from '#types/database'
import type { TaskWorkflowTransitionRecord } from '#types/task_records'

function serializeDateTime(value: { toISO(): string | null } | null | undefined): string | null {
  return value?.toISO() ?? null
}

function toTaskWorkflowTransitionRecord(
  model: TaskWorkflowTransition
): TaskWorkflowTransitionRecord {
  return {
    id: model.id,
    organization_id: model.organization_id,
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
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<void> {
  const query = trx
    ? TaskWorkflowTransition.query({ client: trx })
    : TaskWorkflowTransition.query()
  await query.where('organization_id', organizationId).delete()
}
