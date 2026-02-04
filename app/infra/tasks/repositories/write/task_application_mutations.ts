import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import TaskApplication from '#infra/tasks/models/task_application'
import { ApplicationStatus } from '#modules/tasks/constants/task_constants'
import type { DatabaseId } from '#types/database'
import type { TaskApplicationRecord } from '#types/task_records'

function toTaskApplicationRecord(model: TaskApplication): TaskApplicationRecord {
  return model.serialize() as TaskApplicationRecord
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
  applicationId: DatabaseId,
  data: {
    application_status: TaskApplication['application_status']
    reviewed_by?: DatabaseId | null
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

export async function rejectOtherPendingByTask(
  taskId: DatabaseId,
  excludedApplicationId: DatabaseId,
  reviewedBy: DatabaseId,
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
