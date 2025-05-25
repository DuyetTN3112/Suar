import { DateTime } from 'luxon'

/**
 * DTO for updating an existing project
 *
 * @implements {UpdateProjectDTOInterface}
 */
export interface UpdateProjectDTOInterface {
  project_id: number
  name?: string
  description?: string | null
  status_id?: number
  start_date?: DateTime | null
  end_date?: DateTime | null
  manager_id?: number | null
  owner_id?: number | null
  visibility?: 'public' | 'private' | 'team'
  budget?: number
}

export class UpdateProjectDTO implements UpdateProjectDTOInterface {
  public readonly project_id: number
  public readonly name?: string
  public readonly description?: string | null
  public readonly status_id?: number
  public readonly start_date?: DateTime | null
  public readonly end_date?: DateTime | null
  public readonly manager_id?: number | null
  public readonly owner_id?: number | null
  public readonly visibility?: 'public' | 'private' | 'team'
  public readonly budget?: number

  constructor(data: UpdateProjectDTOInterface) {
    this.validateInput(data)

    this.project_id = data.project_id
    this.name = data.name?.trim()
    this.description = data.description?.trim() || null
    this.status_id = data.status_id
    this.start_date = data.start_date
    this.end_date = data.end_date
    this.manager_id = data.manager_id
    this.owner_id = data.owner_id
    this.visibility = data.visibility
    this.budget = data.budget
  }

  /**
   * Validate input data
   */
  private validateInput(data: UpdateProjectDTOInterface): void {
    // Project ID validation
    if (!data.project_id || data.project_id <= 0) {
      throw new Error('ID dự án không hợp lệ')
    }

    // Name validation (if provided)
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error('Tên dự án không được để trống')
      }

      if (data.name.trim().length < 3) {
        throw new Error('Tên dự án phải có ít nhất 3 ký tự')
      }

      if (data.name.trim().length > 100) {
        throw new Error('Tên dự án không được vượt quá 100 ký tự')
      }
    }

    // Description validation (if provided)
    if (data.description && data.description.trim().length > 1000) {
      throw new Error('Mô tả dự án không được vượt quá 1000 ký tự')
    }

    // Status ID validation (if provided)
    if (data.status_id !== undefined && data.status_id <= 0) {
      throw new Error('ID trạng thái không hợp lệ')
    }

    // Date validation (if both provided)
    if (data.start_date && data.end_date) {
      if (data.end_date < data.start_date) {
        throw new Error('Ngày kết thúc phải sau ngày bắt đầu')
      }
    }

    // Manager ID validation (if provided)
    if (data.manager_id !== undefined && data.manager_id !== null && data.manager_id <= 0) {
      throw new Error('ID người quản lý không hợp lệ')
    }

    // Owner ID validation (if provided)
    if (data.owner_id !== undefined && data.owner_id !== null && data.owner_id <= 0) {
      throw new Error('ID chủ sở hữu không hợp lệ')
    }

    // Visibility validation (if provided)
    if (data.visibility && !['public', 'private', 'team'].includes(data.visibility)) {
      throw new Error('Chế độ hiển thị không hợp lệ (public/private/team)')
    }

    // Budget validation (if provided)
    if (data.budget !== undefined && data.budget < 0) {
      throw new Error('Ngân sách không thể là số âm')
    }
  }

  /**
   * Check if any fields are being updated
   */
  public hasUpdates(): boolean {
    return (
      this.name !== undefined ||
      this.description !== undefined ||
      this.status_id !== undefined ||
      this.start_date !== undefined ||
      this.end_date !== undefined ||
      this.manager_id !== undefined ||
      this.owner_id !== undefined ||
      this.visibility !== undefined ||
      this.budget !== undefined
    )
  }

  /**
   * Convert to plain object (only fields that are being updated)
   */
  public toObject(): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    if (this.name !== undefined) result.name = this.name
    if (this.description !== undefined) result.description = this.description
    if (this.status_id !== undefined) result.status_id = this.status_id
    if (this.start_date !== undefined) result.start_date = this.start_date?.toJSDate() || null
    if (this.end_date !== undefined) result.end_date = this.end_date?.toJSDate() || null
    if (this.manager_id !== undefined) result.manager_id = this.manager_id
    if (this.owner_id !== undefined) result.owner_id = this.owner_id
    if (this.visibility !== undefined) result.visibility = this.visibility
    if (this.budget !== undefined) result.budget = this.budget

    return result
  }

  /**
   * Get list of fields being updated (for audit logging)
   */
  public getUpdatedFields(): string[] {
    const fields: string[] = []

    if (this.name !== undefined) fields.push('name')
    if (this.description !== undefined) fields.push('description')
    if (this.status_id !== undefined) fields.push('status_id')
    if (this.start_date !== undefined) fields.push('start_date')
    if (this.end_date !== undefined) fields.push('end_date')
    if (this.manager_id !== undefined) fields.push('manager_id')
    if (this.owner_id !== undefined) fields.push('owner_id')
    if (this.visibility !== undefined) fields.push('visibility')
    if (this.budget !== undefined) fields.push('budget')

    return fields
  }
}
