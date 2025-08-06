import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { ApplicationStatus } from '#constants/task_constants'
import { TaskInfraMapper } from '#infra/tasks/mapper/task_infra_mapper'
import TaskApplication from '#infra/tasks/models/task_application'
import type { DatabaseId } from '#types/database'
import type { PaginatedTaskApplicationRecords, TaskApplicationRecord } from '#types/task_records'

function toTaskApplicationRecord(model: TaskApplication): TaskApplicationRecord {
  return TaskInfraMapper.toApplicationRecord(model)
}

function toPaginatedTaskApplicationRecords(result: {
  all(): TaskApplication[]
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}): PaginatedTaskApplicationRecords {
  return {
    data: result.all().map(toTaskApplicationRecord),
    meta: {
      total: result.total,
      per_page: result.perPage,
      current_page: result.currentPage,
      last_page: result.lastPage,
    },
  }
}

export async function paginateByTask(
  taskId: DatabaseId,
  options: {
    status?: string
    page: number
    perPage: number
  },
  trx?: TransactionClientContract
): Promise<PaginatedTaskApplicationRecords> {
  const query = trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  const scopedQuery = query
    .where('task_id', taskId)
    .preload('applicant', (userQuery) => {
      void userQuery.preload('skills', (skillsQuery) => {
        void skillsQuery.preload('skill')
      })
    })
    .orderBy('applied_at', 'desc')

  if (options.status && options.status !== 'all') {
    void scopedQuery.where('application_status', options.status)
  }

  const result = await scopedQuery.paginate(options.page, options.perPage)
  return toPaginatedTaskApplicationRecords(result)
}

export async function paginateByApplicant(
  applicantId: DatabaseId,
  options: {
    status?: string
    page: number
    perPage: number
  },
  trx?: TransactionClientContract
): Promise<PaginatedTaskApplicationRecords> {
  const query = trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  const scopedQuery = query
    .where('applicant_id', applicantId)
    .preload('task', (taskQuery) => {
      void taskQuery.preload('organization', (orgQuery) => {
        void orgQuery.select(['id', 'name', 'logo'])
      })
    })
    .orderBy('applied_at', 'desc')

  if (options.status && options.status !== 'all') {
    void scopedQuery.where('application_status', options.status)
  }

  const result = await scopedQuery.paginate(options.page, options.perPage)
  return toPaginatedTaskApplicationRecords(result)
}

export async function findPendingOwnedByApplicantWithTask(
  applicationId: DatabaseId,
  applicantId: DatabaseId,
  trx?: TransactionClientContract
): Promise<TaskApplicationRecord | null> {
  const query = trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  const model = await query
    .where('id', applicationId)
    .where('applicant_id', applicantId)
    .where('application_status', ApplicationStatus.PENDING)
    .preload('task')
    .first()

  return model ? toTaskApplicationRecord(model) : null
}

export async function findPendingByIdWithTaskAndApplicant(
  applicationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<TaskApplicationRecord | null> {
  const query = trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  const model = await query
    .where('id', applicationId)
    .where('application_status', ApplicationStatus.PENDING)
    .preload('task')
    .preload('applicant')
    .first()

  return model ? toTaskApplicationRecord(model) : null
}

export async function findPendingByTaskAndApplicant(
  taskId: DatabaseId,
  applicantId: DatabaseId,
  trx?: TransactionClientContract
): Promise<TaskApplicationRecord | null> {
  const query = trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  const model = await query
    .where('task_id', taskId)
    .where('applicant_id', applicantId)
    .where('application_status', ApplicationStatus.PENDING)
    .first()

  return model ? toTaskApplicationRecord(model) : null
}

export async function findExistingNonWithdrawnByTaskAndApplicant(
  taskId: DatabaseId,
  applicantId: DatabaseId,
  trx?: TransactionClientContract
): Promise<TaskApplicationRecord | null> {
  const query = trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  const model = await query
    .where('task_id', taskId)
    .where('applicant_id', applicantId)
    .whereNot('application_status', ApplicationStatus.WITHDRAWN)
    .first()

  return model ? toTaskApplicationRecord(model) : null
}
