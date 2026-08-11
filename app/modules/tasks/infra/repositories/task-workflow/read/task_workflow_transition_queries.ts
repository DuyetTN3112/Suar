import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import TaskWorkflowTransition from '#modules/tasks/infra/models/task-workflow/task_workflow_transition'
import type { TaskWorkflowTransitionRecord } from '#modules/tasks/types/task_records'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


function serializeDateTime(value: { toISO(): string | null } | null | undefined): string | null {
  return value?.toISO() ?? null
}

function toTaskWorkflowTransitionRecord(
  model: TaskWorkflowTransition
): TaskWorkflowTransitionRecord {
  return omitUndefined({
    id: model.id,
    organization_id: model.organization_id,
    project_id: model.project_id,
    from_status_id: model.from_status_id,
    to_status_id: model.to_status_id,
    conditions: model.conditions,
    created_at: serializeDateTime(model.created_at),
    fromStatus: model.$preloaded['fromStatus'] as Record<string, unknown> | undefined,
    toStatus: model.$preloaded['toStatus'] as Record<string, unknown> | undefined,
  })
}

export async function findByOrganization(
  organizationId: string,
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

/** Find workflow transitions belonging to one project. */
export async function findByProject(
  projectId: string,
  trx?: TransactionClientContract,
  organizationId?: string
): Promise<TaskWorkflowTransitionRecord[]> {
  const query = trx
    ? TaskWorkflowTransition.query({ client: trx })
    : TaskWorkflowTransition.query()
  const scopedQuery = query
    .where('project_id', projectId)
    .preload('fromStatus')
  if (organizationId) {
    void scopedQuery.where('organization_id', organizationId)
  }
  const transitions = await scopedQuery.preload('toStatus')
  return transitions.map(toTaskWorkflowTransitionRecord)
}

export async function findFromStatus(
  organizationId: string,
  fromStatusId: string,
  trx?: TransactionClientContract,
  projectId?: string
): Promise<TaskWorkflowTransitionRecord[]> {
  const query = trx
    ? TaskWorkflowTransition.query({ client: trx })
    : TaskWorkflowTransition.query()
  const scopedQuery = query
    .where('organization_id', organizationId)
    .where('from_status_id', fromStatusId)
  if (projectId) {
    void scopedQuery.where('project_id', projectId)
  }
  const transitions = await scopedQuery.preload('toStatus')
  return transitions.map(toTaskWorkflowTransitionRecord)
}
