import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  TaskOrgReader,
  TaskProjectReader,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { TaskInfraMapper } from '#modules/tasks/infra/adapters/task-authoring/task_infra_mapper'
import TaskApplication from '#modules/tasks/infra/models/task-applications/task_application'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'
import type { PaginatedTaskApplicationRecords, TaskApplicationRecord } from '#modules/tasks/types/task_records'

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

function applyStableTaskApplicationOrder(
  query: ReturnType<typeof TaskApplication.query>,
  sortOrder: 'asc' | 'desc'
): void {
  void query.orderBy('applied_at', sortOrder).orderBy('id', sortOrder)
}

export async function paginateByTask(
  taskId: string,
  options: {
    status?: string
    page: number
    perPage: number
  },
  trx?: TransactionClientContract
): Promise<PaginatedTaskApplicationRecords> {
  const query = trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  const scopedQuery = query.where('task_id', taskId)

  if (options.status && options.status !== 'all') {
    void scopedQuery.where('application_status', options.status)
  }

  applyStableTaskApplicationOrder(scopedQuery, 'desc')
  const result = await scopedQuery.paginate(options.page, options.perPage)
  return toPaginatedTaskApplicationRecords(result)
}

export async function paginateByOrganization(
  organizationId: string,
  options: {
    status?: string
    page: number
    perPage: number
  },
  trx?: TransactionClientContract
): Promise<PaginatedTaskApplicationRecords> {
  const query = trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  const scopedQuery = query
    .whereHas('task', (taskQuery) => {
      void taskQuery.where('organization_id', organizationId)
    })
    .preload('task')

  if (options.status && options.status !== 'all') {
    void scopedQuery.where('application_status', options.status)
  }

  applyStableTaskApplicationOrder(scopedQuery, 'desc')
  const result = await scopedQuery.paginate(options.page, options.perPage)
  return toPaginatedTaskApplicationRecords(result)
}

export async function paginateByApplicant(
  applicantId: string,
  options: {
    status?: string
    page: number
    perPage: number
  },
  trx?: TransactionClientContract,
  orgReader?: Pick<TaskOrgReader, 'findOrganizationSummaries'>,
  projectReader?: Pick<TaskProjectReader, 'findProjectSummaries'>
): Promise<PaginatedTaskApplicationRecords> {
  const query = trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  const scopedQuery = query.where('applicant_id', applicantId).preload('task')

  if (options.status && options.status !== 'all') {
    void scopedQuery.where('application_status', options.status)
  }

  applyStableTaskApplicationOrder(scopedQuery, 'desc')
  const result = await scopedQuery.paginate(options.page, options.perPage)
  const records = toPaginatedTaskApplicationRecords(result)
  if (!orgReader && !projectReader) {
    return records
  }

  const organizationIds = [
    ...new Set(
      records.data.flatMap((application) =>
        application.task?.organization_id ? [application.task.organization_id] : []
      )
    ),
  ]
  const organizations = orgReader
    ? await orgReader.findOrganizationSummaries(organizationIds, trx)
    : []
  const organizationById = new Map(
    organizations.map((organization) => [organization.id, organization])
  )
  const projectIds = [
    ...new Set(
      records.data.flatMap((application) =>
        application.task?.project_id ? [application.task.project_id] : []
      )
    ),
  ]
  const projects = projectReader
    ? await projectReader.findProjectSummaries(projectIds, trx)
    : []
  const projectById = new Map(projects.map((project) => [project.id, project]))

  return {
    ...records,
    data: records.data.map((application) => {
      if (!application.task) {
        return application
      }
      const organization = organizationById.get(application.task.organization_id)
      const project = application.task.project_id
        ? projectById.get(application.task.project_id)
        : undefined
      return {
        ...application,
        task: {
          ...application.task,
          organization: organization
            ? {
                id: organization.id,
                name: organization.name,
                logo: organization.logo,
              }
            : null,
          project: project
            ? {
                id: project.id,
                name: project.name,
              }
            : null,
        },
      }
    }),
  }
}

export async function findPendingOwnedByApplicantWithTask(
  applicationId: string,
  applicantId: string,
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
  applicationId: string,
  trx?: TransactionClientContract
): Promise<TaskApplicationRecord | null> {
  const query = trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  const model = await query
    .where('id', applicationId)
    .where('application_status', ApplicationStatus.PENDING)
    .preload('task')
    .first()

  return model ? toTaskApplicationRecord(model) : null
}

export async function findPendingByTaskAndApplicant(
  taskId: string,
  applicantId: string,
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
  taskId: string,
  applicantId: string,
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

export async function findWithdrawnByTaskAndApplicant(
  taskId: string,
  applicantId: string,
  trx?: TransactionClientContract
): Promise<TaskApplicationRecord | null> {
  const query = trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  const model = await query
    .where('task_id', taskId)
    .where('applicant_id', applicantId)
    .where('application_status', ApplicationStatus.WITHDRAWN)
    .first()

  return model ? toTaskApplicationRecord(model) : null
}
