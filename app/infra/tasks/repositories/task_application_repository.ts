import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import TaskApplication from '#models/task_application'

/**
 * TaskApplicationRepository
 *
 * Data access for task applications (marketplace).
 */
export default class TaskApplicationRepository {
  private readonly _instanceMarker = true

  static {
    void new TaskApplicationRepository()._instanceMarker
  }

  static async paginateByTask(
    taskId: DatabaseId,
    options: {
      status?: string
      page: number
      perPage: number
    },
    trx?: TransactionClientContract
  ) {
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

    return scopedQuery.paginate(options.page, options.perPage)
  }

  static async paginateByApplicant(
    applicantId: DatabaseId,
    options: {
      status?: string
      page: number
      perPage: number
    },
    trx?: TransactionClientContract
  ) {
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

    return scopedQuery.paginate(options.page, options.perPage)
  }
}
