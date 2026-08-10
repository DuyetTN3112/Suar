import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { TaskInfraMapper } from '#modules/tasks/infra/adapters/task-authoring/task_infra_mapper'
import TaskApplication from '#modules/tasks/infra/models/task-applications/task_application'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'
import type { TaskApplicationRecord } from '#modules/tasks/types/task_records'

function toTaskApplicationRecord(model: TaskApplication): TaskApplicationRecord {
  return TaskInfraMapper.toApplicationRecord(model)
}

export async function create(
  data: Partial<TaskApplication>,
  trx?: TransactionClientContract
): Promise<TaskApplicationRecord> {
  const model = await TaskApplication.create(data, trx ? { client: trx } : undefined)
  return toTaskApplicationRecord(model)
}

export async function save(
  application: TaskApplication,
  trx?: TransactionClientContract
): Promise<TaskApplication> {
  if (trx) {
    application.useTransaction(trx)
  }
  await application.save()
  return application
}

export async function updateStatus(
  applicationId: string,
  data: {
    application_status: TaskApplication['application_status']
    reviewed_by?: string | null
    reviewed_at?: TaskApplication['reviewed_at']
    rejection_reason?: string | null
  },
  trx?: TransactionClientContract
): Promise<TaskApplicationRecord> {
  const query = trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  const application = await query.where('id', applicationId).firstOrFail()

  application.merge(data)
  await application.save()

  return toTaskApplicationRecord(application)
}

export async function reviveWithdrawnApplication(
  applicationId: string,
  data: {
    application_source: TaskApplication['application_source']
    message: string | null
    portfolio_links: string[] | null
    applied_at: TaskApplication['applied_at']
  },
  trx?: TransactionClientContract
): Promise<TaskApplicationRecord> {
  const query = trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  const application = await query
    .where('id', applicationId)
    .where('application_status', ApplicationStatus.WITHDRAWN)
    .firstOrFail()

  application.merge({
    application_status: ApplicationStatus.PENDING,
    application_source: data.application_source,
    message: data.message,
    portfolio_links: data.portfolio_links,
    applied_at: data.applied_at,
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
  })
  await application.save()

  return toTaskApplicationRecord(application)
}

export async function rejectOtherPendingByTask(
  taskId: string,
  excludedApplicationId: string,
  reviewedBy: string,
  rejectionReason: string,
  trx?: TransactionClientContract
): Promise<void> {
  const query = trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  await query
    .where('task_id', taskId)
    .where('application_status', ApplicationStatus.PENDING)
    .whereNot('id', excludedApplicationId)
    .update({
      application_status: ApplicationStatus.REJECTED,
      reviewed_by: reviewedBy,
      reviewed_at: new Date(),
      rejection_reason: rejectionReason,
    })
}
