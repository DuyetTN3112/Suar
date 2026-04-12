import type { DateTime } from 'luxon'

import { ProjectStatus, ProjectVisibility } from '#constants/project_constants'
import ValidationException from '#exceptions/validation_exception'
import type { DatabaseId } from '#types/database'

/**
 * DTO for creating a new project
 *
 * @implements {CreateProjectDTOInterface}
 */
export interface CreateProjectDTOInterface {
  name: string
  description?: string
  organization_id: DatabaseId
  status?: string
  start_date?: DateTime | null
  end_date?: DateTime | null
  manager_id?: DatabaseId | null
  visibility?: ProjectVisibility
  budget?: number
}

export type CreateProjectValidatedPayload = Omit<CreateProjectDTOInterface, 'organization_id'>

export class CreateProjectDTO implements CreateProjectDTOInterface {
  public readonly name: string
  public readonly description?: string
  public readonly organization_id: DatabaseId
  public readonly status: string
  public readonly start_date?: DateTime | null
  public readonly end_date?: DateTime | null
  public readonly manager_id?: DatabaseId | null
  public readonly visibility: ProjectVisibility
  public readonly budget: number

  static fromInput(data: CreateProjectDTOInterface): CreateProjectDTO {
    return new CreateProjectDTO(data)
  }

  static fromValidatedPayload(
    payload: CreateProjectValidatedPayload,
    organizationId: DatabaseId
  ): CreateProjectDTO {
    return new CreateProjectDTO({
      ...payload,
      organization_id: organizationId,
    })
  }

  constructor(data: CreateProjectDTOInterface) {
    // Validate and sanitize input
    this.validateInput(data)

    this.name = data.name.trim()
    this.description = data.description?.trim() ?? undefined
    this.organization_id = data.organization_id
    this.status = data.status ?? ProjectStatus.PENDING
    this.start_date = data.start_date ?? null
    this.end_date = data.end_date ?? null
    this.manager_id = data.manager_id ?? null
    this.visibility = data.visibility ?? ProjectVisibility.TEAM
    this.budget = data.budget ?? 0
  }

  /**
   * Validate input data
   */
  private validateInput(data: CreateProjectDTOInterface): void {
    // Name validation
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationException('Tên dự án là bắt buộc')
    }

    if (data.name.trim().length < 3) {
      throw new ValidationException('Tên dự án phải có ít nhất 3 ký tự')
    }

    if (data.name.trim().length > 100) {
      throw new ValidationException('Tên dự án không được vượt quá 100 ký tự')
    }

    // Description validation
    if (data.description && data.description.trim().length > 1000) {
      throw new ValidationException('Mô tả dự án không được vượt quá 1000 ký tự')
    }

    // Organization ID validation
    if (!data.organization_id) {
      throw new ValidationException('ID tổ chức không hợp lệ')
    }

    // Status validation (v3: inline VARCHAR)
    if (data.status !== undefined) {
      const validStatuses = Object.values(ProjectStatus) as string[]
      if (!validStatuses.includes(data.status)) {
        throw new ValidationException('Trạng thái dự án không hợp lệ')
      }
    }

    // Date validation
    if (data.start_date && data.end_date) {
      if (data.end_date < data.start_date) {
        throw new ValidationException('Ngày kết thúc phải sau ngày bắt đầu')
      }
    }

    // Manager ID validation
    if (data.manager_id !== undefined && data.manager_id !== null && !data.manager_id) {
      throw new ValidationException('ID người quản lý không hợp lệ')
    }

    // Visibility validation
    if (data.visibility && !Object.values(ProjectVisibility).includes(data.visibility)) {
      throw new ValidationException('Chế độ hiển thị không hợp lệ (public/private/team)')
    }

    // Budget validation
    if (data.budget !== undefined && data.budget < 0) {
      throw new ValidationException('Ngân sách không thể là số âm')
    }
  }

  /**
   * Convert to plain object for database insertion
   */
  public toObject(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      organization_id: this.organization_id,
      status: this.status,
      start_date: this.start_date?.toJSDate() ?? null,
      end_date: this.end_date?.toJSDate() ?? null,
      manager_id: this.manager_id,
      visibility: this.visibility,
      budget: this.budget,
    }
  }

  /**
   * Get a human-readable summary of the project
   */
  public getSummary(): string {
    const dates =
      this.start_date && this.end_date
        ? ` (${this.start_date.toFormat('dd/MM/yyyy')} - ${this.end_date.toFormat('dd/MM/yyyy')})`
        : ''
    const budgetInfo =
      this.budget > 0 ? ` - Ngân sách: ${this.budget.toLocaleString('vi-VN')}đ` : ''
    return `Project: ${this.name}${dates}${budgetInfo}`
  }
}
