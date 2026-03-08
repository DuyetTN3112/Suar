import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'
import type { ApplicationStatus } from '#constants/task_constants'
import { PAGINATION } from '#constants/common_constants'

/**
 * ApplyForTaskDTO
 *
 * Data for freelancer applying to a task
 */
export class ApplyForTaskDTO {
  declare task_id: DatabaseId
  declare message: string | null
  declare expected_rate: number | null
  declare portfolio_links: string[] | null
  declare application_source: 'public_listing' | 'invitation' | 'referral'

  constructor(data: Partial<ApplyForTaskDTO>) {
    if (data.task_id === undefined) {
      throw new ValidationException('task_id is required')
    }
    this.task_id = data.task_id
    this.message = data.message ?? null
    this.expected_rate = data.expected_rate ?? null
    this.portfolio_links = data.portfolio_links ?? null
    this.application_source = data.application_source ?? 'public_listing'
  }
}

/**
 * ProcessApplicationDTO
 *
 * Data for approving or rejecting an application
 */
export class ProcessApplicationDTO {
  declare application_id: DatabaseId
  declare action: 'approve' | 'reject'
  declare rejection_reason: string | null
  declare assignment_type: 'member' | 'freelancer' | 'volunteer'
  declare estimated_hours: number | null

  constructor(data: Partial<ProcessApplicationDTO>) {
    if (data.application_id === undefined) {
      throw new ValidationException('application_id is required')
    }
    if (data.action === undefined) {
      throw new ValidationException('action is required')
    }
    this.application_id = data.application_id
    this.action = data.action
    this.rejection_reason = data.rejection_reason ?? null
    this.assignment_type = data.assignment_type ?? 'freelancer'
    this.estimated_hours = data.estimated_hours ?? null
  }
}

/**
 * WithdrawApplicationDTO
 *
 * Data for withdrawing an application
 */
export class WithdrawApplicationDTO {
  declare application_id: DatabaseId

  constructor(applicationId: DatabaseId) {
    this.application_id = applicationId
  }
}

/**
 * GetTaskApplicationsDTO
 *
 * Filters for fetching task applications
 */
export class GetTaskApplicationsDTO {
  declare task_id: DatabaseId
  declare status?: ApplicationStatus | 'all'
  declare page: number
  declare per_page: number

  constructor(data: Partial<GetTaskApplicationsDTO>) {
    if (data.task_id === undefined) {
      throw new ValidationException('task_id is required')
    }
    this.task_id = data.task_id
    this.status = data.status ?? 'all'
    this.page = data.page ?? 1
    this.per_page = data.per_page ?? PAGINATION.DEFAULT_PER_PAGE
  }
}

/**
 * GetPublicTasksDTO
 *
 * Filters for marketplace/public task listing
 */
export class GetPublicTasksDTO {
  declare page: number
  declare per_page: number
  declare skill_ids: DatabaseId[] | null
  declare difficulty: string | null
  declare min_budget: number | null
  declare max_budget: number | null
  declare sort_by: 'created_at' | 'budget' | 'due_date'
  declare sort_order: 'asc' | 'desc'

  constructor(data: Partial<GetPublicTasksDTO>) {
    this.page = data.page ?? 1
    this.per_page = data.per_page ?? PAGINATION.DEFAULT_PER_PAGE
    this.skill_ids = data.skill_ids ?? null
    this.difficulty = data.difficulty ?? null
    this.min_budget = data.min_budget ?? null
    this.max_budget = data.max_budget ?? null
    this.sort_by = data.sort_by ?? 'created_at'
    this.sort_order = data.sort_order ?? 'desc'
  }
}
