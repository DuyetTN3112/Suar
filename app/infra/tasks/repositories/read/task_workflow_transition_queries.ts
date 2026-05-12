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
    fromStatus: model.$preloaded.fromStatus as Record<string, unknown> | undefined,
    toStatus: model.$preloaded.toStatus as Record<string, unknown> | undefined,
  }
}

export async function findByOrganization(
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<TaskWorkflowTransitionRecord[]> {
  const query = trx
    ? TaskWorkflowTransition.query({ client: trx })
    : TaskWorkflowTransition.query()
  const transitions = await query
    .where('organization_id', organizationId)
    .preload('fromStatus')
    .preload('toStatus')
  return transitions.map(toTaskWorkflowTransitionRecord)
}

export async function findFromStatus(
  organizationId: DatabaseId,
  fromStatusId: DatabaseId,
  trx?: TransactionClientContract
): Promise<TaskWorkflowTransitionRecord[]> {
  const query = trx
    ? TaskWorkflowTransition.query({ client: trx })
    : TaskWorkflowTransition.query()
  const transitions = await query
    .where('organization_id', organizationId)
    .where('from_status_id', fromStatusId)
    .preload('toStatus')
  return transitions.map(toTaskWorkflowTransitionRecord)
}
