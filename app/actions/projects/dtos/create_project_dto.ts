import { DateTime } from 'luxon'

/**
 * DTO for creating a new project
 *
 * @implements {CreateProjectDTOInterface}
 */
export interface CreateProjectDTOInterface {
  name: string
  description?: string
  organization_id: number
  status_id?: number
  start_date?: DateTime | null
  end_date?: DateTime | null
  manager_id?: number | null
  visibility?: 'public' | 'private' | 'team'
  budget?: number
}

export class CreateProjectDTO implements CreateProjectDTOInterface {
  public readonly name: string
  public readonly description?: string
  public readonly organization_id: number
  public readonly status_id: number
  public readonly start_date?: DateTime | null
  public readonly end_date?: DateTime | null
  public readonly manager_id?: number | null
  public readonly visibility: 'public' | 'private' | 'team'
  public readonly budget: number

  constructor(data: CreateProjectDTOInterface) {
    // Validate and sanitize input
    this.validateInput(data)

    this.name = data.name.trim()
    this.description = data.description?.trim() || undefined
    this.organization_id = data.organization_id
    this.status_id = data.status_id || 1 // Default: pending
    this.start_date = data.start_date || null
    this.end_date = data.end_date || null
    this.manager_id = data.manager_id || null
    this.visibility = data.visibility || 'team'
    this.budget = data.budget || 0
  }

  /**
   * Validate input data
   */
  private validateInput(data: CreateProjectDTOInterface): void {
    // Name validation
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Tên dự án là bắt buộc')
    }

    if (data.name.trim().length < 3) {
      throw new Error('Tên dự án phải có ít nhất 3 ký tự')
    }

    if (data.name.trim().length > 100) {
      throw new Error('Tên dự án không được vượt quá 100 ký tự')
    }

    // Description validation
    if (data.description && data.description.trim().length > 1000) {
      throw new Error('Mô tả dự án không được vượt quá 1000 ký tự')
    }

    // Organization ID validation
    if (!data.organization_id || data.organization_id <= 0) {
      throw new Error('ID tổ chức không hợp lệ')
    }

    // Status ID validation
    if (data.status_id !== undefined && data.status_id <= 0) {
      throw new Error('ID trạng thái không hợp lệ')
    }

    // Date validation
    if (data.start_date && data.end_date) {
      if (data.end_date < data.start_date) {
        throw new Error('Ngày kết thúc phải sau ngày bắt đầu')
      }
    }

    // Manager ID validation
    if (data.manager_id !== undefined && data.manager_id !== null && data.manager_id <= 0) {
      throw new Error('ID người quản lý không hợp lệ')
    }

    // Visibility validation
    if (data.visibility && !['public', 'private', 'team'].includes(data.visibility)) {
      throw new Error('Chế độ hiển thị không hợp lệ (public/private/team)')
    }

    // Budget validation
    if (data.budget !== undefined && data.budget < 0) {
      throw new Error('Ngân sách không thể là số âm')
    }
  }

  /**
   * Convert to plain object for database insertion
   */
  public toObject(): Record<string, any> {
    return {
      name: this.name,
      description: this.description,
      organization_id: this.organization_id,
      status_id: this.status_id,
      start_date: this.start_date?.toJSDate() || null,
      end_date: this.end_date?.toJSDate() || null,
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
    const budgetInfo = this.budget > 0 ? ` - Ngân sách: ${this.budget.toLocaleString('vi-VN')}đ` : ''
    return `Project: ${this.name}${dates}${budgetInfo}`
  }
}
