import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { ApplicationStatus } from '#constants/task_constants'
import TaskApplication from '#models/task_application'
import type { DatabaseId } from '#types/database'

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

  private static baseQuery(trx?: TransactionClientContract) {
    return trx ? TaskApplication.query({ client: trx }) : TaskApplication.query()
  }

  static async findPendingOwnedByApplicantWithTask(
    applicationId: DatabaseId,
    applicantId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskApplication | null> {
    return this.baseQuery(trx)
      .where('id', applicationId)
      .where('applicant_id', applicantId)
      .where('application_status', ApplicationStatus.PENDING)
      .preload('task')
      .first()
  }

  static async findPendingByIdWithTaskAndApplicant(
    applicationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskApplication | null> {
    return this.baseQuery(trx)
      .where('id', applicationId)
      .where('application_status', ApplicationStatus.PENDING)
      .preload('task')
      .preload('applicant')
      .first()
  }

  static async findPendingByTaskAndApplicant(
    taskId: DatabaseId,
    applicantId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskApplication | null> {
    return this.baseQuery(trx)
      .where('task_id', taskId)
      .where('applicant_id', applicantId)
      .where('application_status', ApplicationStatus.PENDING)
      .first()
  }

  static async findExistingNonWithdrawnByTaskAndApplicant(
    taskId: DatabaseId,
    applicantId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskApplication | null> {
    return this.baseQuery(trx)
      .where('task_id', taskId)
      .where('applicant_id', applicantId)
      .whereNot('application_status', ApplicationStatus.WITHDRAWN)
      .first()
  }

  static async create(
    data: Partial<TaskApplication>,
    trx?: TransactionClientContract
  ): Promise<TaskApplication> {
    return TaskApplication.create(data, trx ? { client: trx } : undefined)
  }

  static async save(
    application: TaskApplication,
    trx?: TransactionClientContract
  ): Promise<TaskApplication> {
    if (trx) {
      application.useTransaction(trx)
    }
    await application.save()
    return application
  }

  static async rejectOtherPendingByTask(
    taskId: DatabaseId,
    excludedApplicationId: DatabaseId,
    reviewedBy: DatabaseId,
    rejectionReason: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    await this.baseQuery(trx)
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
}
