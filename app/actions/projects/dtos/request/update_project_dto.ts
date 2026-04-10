import type { DateTime } from 'luxon'
import type { DatabaseId } from '#types/database'
import { ProjectStatus, ProjectVisibility } from '#constants/project_constants'
import ValidationException from '#exceptions/validation_exception'

/**
 * DTO for updating an existing project
 *
 * @implements {UpdateProjectDTOInterface}
 */
export interface UpdateProjectDTOInterface {
  project_id: DatabaseId
  name?: string
  description?: string | null
  status?: string
  start_date?: DateTime | null
  end_date?: DateTime | null
  manager_id?: DatabaseId | null
  owner_id?: DatabaseId | null
  visibility?: ProjectVisibility
  budget?: number
}

export type UpdateProjectValidatedPayload = Omit<UpdateProjectDTOInterface, 'project_id'>

export class UpdateProjectDTO implements UpdateProjectDTOInterface {
  public readonly project_id: DatabaseId
  public readonly name?: string
  public readonly description?: string | null
  public readonly status?: string
  public readonly start_date?: DateTime | null
  public readonly end_date?: DateTime | null
  public readonly manager_id?: DatabaseId | null
  public readonly owner_id?: DatabaseId | null
  public readonly visibility?: ProjectVisibility
  public readonly budget?: number

  static fromInput(data: UpdateProjectDTOInterface): UpdateProjectDTO {
    return new UpdateProjectDTO(data)
  }

  static fromValidatedPayload(
    payload: UpdateProjectValidatedPayload,
    projectId: DatabaseId
  ): UpdateProjectDTO {
    return new UpdateProjectDTO({
      ...payload,
      project_id: projectId,
    })
  }

  constructor(data: UpdateProjectDTOInterface) {
    this.validateInput(data)

    this.project_id = data.project_id
    this.name = data.name?.trim()
    this.description = data.description?.trim() || null
    this.status = data.status
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
    if (!data.project_id) {
      throw new ValidationException('ID dự án không hợp lệ')
    }

    // Name validation (if provided)
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new ValidationException('Tên dự án không được để trống')
      }

      if (data.name.trim().length < 3) {
        throw new ValidationException('Tên dự án phải có ít nhất 3 ký tự')
      }

      if (data.name.trim().length > 100) {
        throw new ValidationException('Tên dự án không được vượt quá 100 ký tự')
      }
    }

    // Description validation (if provided)
    if (data.description && data.description.trim().length > 1000) {
      throw new ValidationException('Mô tả dự án không được vượt quá 1000 ký tự')
    }

    // Status validation (v3: inline VARCHAR)
    if (data.status !== undefined) {
      const validStatuses = Object.values(ProjectStatus) as string[]
      if (!validStatuses.includes(data.status)) {
        throw new ValidationException('Trạng thái dự án không hợp lệ')
      }
    }

    // Date validation (if both provided)
    if (data.start_date && data.end_date) {
      if (data.end_date < data.start_date) {
        throw new ValidationException('Ngày kết thúc phải sau ngày bắt đầu')
      }
    }

    // Manager ID validation (if provided)
    if (data.manager_id !== undefined && data.manager_id !== null && !data.manager_id) {
      throw new ValidationException('ID người quản lý không hợp lệ')
    }

    // Owner ID validation (if provided)
    if (data.owner_id !== undefined && data.owner_id !== null && !data.owner_id) {
      throw new ValidationException('ID chủ sở hữu không hợp lệ')
    }

    // Visibility validation (if provided)
    if (data.visibility && !Object.values(ProjectVisibility).includes(data.visibility)) {
      throw new ValidationException('Chế độ hiển thị không hợp lệ (public/private/team)')
    }

    // Budget validation (if provided)
    if (data.budget !== undefined && data.budget < 0) {
      throw new ValidationException('Ngân sách không thể là số âm')
    }
  }

  /**
   * Check if any fields are being updated
   */
  public hasUpdates(): boolean {
    return (
      this.name !== undefined ||
      this.description !== undefined ||
      this.status !== undefined ||
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
    if (this.status !== undefined) result.status = this.status
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
    if (this.status !== undefined) fields.push('status')
    if (this.start_date !== undefined) fields.push('start_date')
    if (this.end_date !== undefined) fields.push('end_date')
    if (this.manager_id !== undefined) fields.push('manager_id')
    if (this.owner_id !== undefined) fields.push('owner_id')
    if (this.visibility !== undefined) fields.push('visibility')
    if (this.budget !== undefined) fields.push('budget')

    return fields
  }
}
