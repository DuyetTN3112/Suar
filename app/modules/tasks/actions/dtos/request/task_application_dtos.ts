import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import ValidationException from '#modules/http/exceptions/validation_exception'
import { TASK_PAGINATION as PAGINATION } from '#modules/tasks/application/dtos/common/task_pagination'
import type { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'

/**
 * ApplyForTaskDTO
 *
 * Data for requesting to join a marketplace task
 */
export class ApplyForTaskDTO {
  declare task_id: string
  declare message: string | null
  declare portfolio_links: string[] | null
  declare application_source: 'public_listing' | 'invitation' | 'referral'

  constructor(data: Partial<ApplyForTaskDTO>) {
    if (data.task_id === undefined) {
      throw new ValidationException('task_id is required')
    }
    this.task_id = data.task_id
    this.message = data.message ?? null
    this.portfolio_links = data.portfolio_links ?? null
    this.application_source = data.application_source ?? 'public_listing'
  }

  static fromValidatedPayload(
    payload: {
      message?: string | null | undefined
      portfolio_links?: string[] | null | undefined
      application_source?: 'public_listing' | 'invitation' | 'referral' | undefined
    },
    taskId: string
  ): ApplyForTaskDTO {
    return new ApplyForTaskDTO(omitUndefined({
      task_id: taskId,
      message: payload.message,
      portfolio_links: payload.portfolio_links,
      application_source: payload.application_source,
    }))
  }
}

/**
 * ProcessApplicationDTO
 *
 * Data for approving or rejecting an application
 */
export class ProcessApplicationDTO {
  declare application_id: string
  declare action: 'approve' | 'reject'
  declare rejection_reason: string | null
  declare assignment_type: 'member' | 'external_contributor' | 'volunteer'
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
    this.assignment_type = data.assignment_type ?? 'external_contributor'
    this.estimated_hours = data.estimated_hours ?? null
  }

  static fromValidatedPayload(
    payload: {
      action: 'approve' | 'reject'
      rejection_reason?: string | null | undefined
      assignment_type?: 'member' | 'external_contributor' | 'volunteer' | undefined
      estimated_hours?: number | null | undefined
    },
    applicationId: string
  ): ProcessApplicationDTO {
    return new ProcessApplicationDTO(omitUndefined({
      application_id: applicationId,
      action: payload.action,
      rejection_reason: payload.rejection_reason,
      assignment_type: payload.assignment_type,
      estimated_hours: payload.estimated_hours,
    }))
  }
}

/**
 * WithdrawApplicationDTO
 *
 * Data for withdrawing an application
 */
export class WithdrawApplicationDTO {
  declare application_id: string

  constructor(applicationId: string) {
    this.application_id = applicationId
  }

  static fromApplicationId(applicationId: string): WithdrawApplicationDTO {
    return new WithdrawApplicationDTO(applicationId)
  }
}

/**
 * GetTaskApplicationsDTO
 *
 * Filters for fetching task applications
 */
export class GetTaskApplicationsDTO {
  declare task_id: string
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

  static forTask(
    taskId: string,
    params: {
      status?: ApplicationStatus | 'all'
      page?: number
      per_page?: number
    }
  ): GetTaskApplicationsDTO {
    return new GetTaskApplicationsDTO(omitUndefined({
      task_id: taskId,
      status: params.status,
      page: params.page,
      per_page: params.per_page,
    }))
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
  declare task_ids: string[] | null
  declare skill_categories: string[] | null
  declare skill_ids: string[] | null
  declare keyword: string | null
  declare difficulty: string | null
  declare task_type: string | null
  declare business_domain: string | null
  declare problem_category: string | null
  declare role_in_task: string | null
  declare verification_method: string | null
  declare tech_stack: string | null
  declare domain_tags: string | null
  declare accepting_applications: 'open' | 'closed' | null
  declare sort_by: 'created_at' | 'due_date' | 'recommended'
  declare sort_order: 'asc' | 'desc'

  constructor(data: Partial<GetPublicTasksDTO>) {
    this.page = data.page ?? 1
    this.per_page = data.per_page ?? PAGINATION.DEFAULT_PER_PAGE
    this.task_ids = this.normalizeStringList(data.task_ids)
    this.skill_categories = this.normalizeStringList(data.skill_categories)
    this.skill_ids = data.skill_ids ?? null
    this.keyword = this.normalizeKeyword(data.keyword)
    this.difficulty = data.difficulty ?? null
    this.task_type = this.normalizeKeyword(data.task_type)
    this.business_domain = this.normalizeKeyword(data.business_domain)
    this.problem_category = this.normalizeKeyword(data.problem_category)
    this.role_in_task = this.normalizeKeyword(data.role_in_task)
    this.verification_method = this.normalizeKeyword(data.verification_method)
    this.tech_stack = this.normalizeKeyword(data.tech_stack)
    this.domain_tags = this.normalizeKeyword(data.domain_tags)
    this.accepting_applications = this.normalizeAcceptingApplications(data.accepting_applications)
    this.sort_by = data.sort_by ?? 'created_at'
    this.sort_order = data.sort_order ?? 'desc'
  }

  static fromFilters(data: Partial<GetPublicTasksDTO>): GetPublicTasksDTO {
    return new GetPublicTasksDTO(data)
  }

  private normalizeKeyword(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null
    }

    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  private normalizeStringList(value: unknown): string[] | null {
    if (!Array.isArray(value)) {
      return null
    }

    const normalized = value.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0
    )

    return normalized.length > 0 ? normalized : null
  }

  private normalizeAcceptingApplications(value: unknown): 'open' | 'closed' | null {
    return value === 'open' || value === 'closed' ? value : null
  }

}
