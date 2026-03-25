import { DateTime } from 'luxon'
import type { DatabaseId } from '#types/database'
import { TaskStatus, TaskLabel, TaskPriority } from '#constants/task_constants'
import ValidationException from '#exceptions/validation_exception'

interface RequiredSkillInput {
  id: DatabaseId
  level: string
}

/**
 * DTO cho việc tạo task mới
 *
 * Validates:
 * - title: 3-255 ký tự, bắt buộc
 * - description: Không bắt buộc
 * - status: Trạng thái task (v3: inline VARCHAR), bắt buộc
 * - label: Nhãn (v3: inline VARCHAR), không bắt buộc
 * - priority: Mức độ ưu tiên (v3: inline VARCHAR), không bắt buộc
 * - assigned_to: ID của người được giao, không bắt buộc
 * - due_date: Ngày hết hạn, không bắt buộc
 * - parent_task_id: ID của task cha (subtask), không bắt buộc
 * - estimated_time: Thời gian ước tính (giờ), mặc định 0
 * - actual_time: Thời gian thực tế (giờ), mặc định 0
 * - project_id: ID của dự án, không bắt buộc
 * - organization_id: ID của tổ chức, bắt buộc
 */
export default class CreateTaskDTO {
  public readonly title: string
  public readonly description?: string
  public readonly status: string
  public readonly label?: string
  public readonly priority?: string
  public readonly assigned_to?: DatabaseId
  public readonly due_date?: DateTime
  public readonly parent_task_id?: DatabaseId
  public readonly estimated_time: number
  public readonly actual_time: number
  public readonly project_id?: DatabaseId
  public readonly organization_id: DatabaseId
  public readonly required_skills: RequiredSkillInput[]

  constructor(data: {
    title: string
    description?: string
    status: string
    label?: string
    priority?: string
    assigned_to?: DatabaseId
    due_date?: string | DateTime
    parent_task_id?: DatabaseId
    estimated_time?: number
    actual_time?: number
    project_id?: DatabaseId
    organization_id: DatabaseId
    required_skills?: RequiredSkillInput[]
  }) {
    // Validate title
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationException('Tiêu đề task là bắt buộc')
    }

    if (data.title.trim().length < 3) {
      throw new ValidationException('Tiêu đề task phải có ít nhất 3 ký tự')
    }

    if (data.title.length > 255) {
      throw new ValidationException('Tiêu đề task không được vượt quá 255 ký tự')
    }

    // Validate description length if provided
    if (data.description && data.description.length > 5000) {
      throw new ValidationException('Mô tả task không được vượt quá 5000 ký tự')
    }

    // Validate status (v3: inline VARCHAR)
    if (!data.status) {
      throw new ValidationException('Trạng thái task là bắt buộc')
    }
    const validStatuses = Object.values(TaskStatus) as string[]
    if (!validStatuses.includes(data.status)) {
      throw new ValidationException('Trạng thái task không hợp lệ')
    }

    // Validate label if provided (v3: inline VARCHAR)
    if (data.label !== undefined) {
      const validLabels = Object.values(TaskLabel) as string[]
      if (!validLabels.includes(data.label)) {
        throw new ValidationException('Nhãn task không hợp lệ')
      }
    }

    // Validate priority if provided (v3: inline VARCHAR)
    if (data.priority !== undefined) {
      const validPriorities = Object.values(TaskPriority) as string[]
      if (!validPriorities.includes(data.priority)) {
        throw new ValidationException('Mức độ ưu tiên không hợp lệ')
      }
    }

    if (data.assigned_to !== undefined && !data.assigned_to) {
      throw new ValidationException('ID người được giao không hợp lệ')
    }

    if (data.parent_task_id !== undefined && !data.parent_task_id) {
      throw new ValidationException('ID task cha không hợp lệ')
    }

    if (data.project_id !== undefined && !data.project_id) {
      throw new ValidationException('ID dự án không hợp lệ')
    }

    const requiredSkills = data.required_skills ?? []
    if (!Array.isArray(requiredSkills)) {
      throw new ValidationException('Danh sách kỹ năng yêu cầu không hợp lệ')
    }
    if (requiredSkills.length === 0) {
      throw new ValidationException('Task phải có ít nhất 1 kỹ năng yêu cầu')
    }
    const validLevels = new Set([
      'beginner',
      'elementary',
      'junior',
      'middle',
      'senior',
      'lead',
      'principal',
      'master',
    ])
    const seenSkillIds = new Set<string>()
    for (const skill of requiredSkills) {
      const skillId = skill.id
      if (!skillId) {
        throw new ValidationException('ID kỹ năng yêu cầu không hợp lệ')
      }
      if (seenSkillIds.has(skillId)) {
        throw new ValidationException('Kỹ năng yêu cầu bị trùng lặp')
      }
      seenSkillIds.add(skillId)

      const level = skill.level.trim().toLowerCase()
      if (!validLevels.has(level)) {
        throw new ValidationException(`Cấp độ kỹ năng không hợp lệ: ${level}`)
      }
    }

    // Validate organization_id
    if (!data.organization_id) {
      throw new ValidationException('ID tổ chức là bắt buộc')
    }

    // Validate time fields
    if (data.estimated_time !== undefined && data.estimated_time < 0) {
      throw new ValidationException('Thời gian ước tính không được âm')
    }

    if (data.actual_time !== undefined && data.actual_time < 0) {
      throw new ValidationException('Thời gian thực tế không được âm')
    }

    // Validate and parse due_date
    let parsedDueDate: DateTime | undefined
    if (data.due_date) {
      if (typeof data.due_date === 'string') {
        parsedDueDate = DateTime.fromISO(data.due_date)
        if (!parsedDueDate.isValid) {
          throw new ValidationException('Ngày hết hạn không hợp lệ')
        }
      } else {
        parsedDueDate = data.due_date
      }

      // Optional: Check if due_date is in the past
      // if (parsedDueDate < DateTime.now()) {
      //   throw new ValidationException('Ngày hết hạn không được là quá khứ')
      // }
    }

    // Assign validated values
    this.title = data.title.trim()
    this.description = data.description?.trim()
    this.status = data.status
    this.label = data.label
    this.priority = data.priority
    this.assigned_to = data.assigned_to
    this.due_date = parsedDueDate
    this.parent_task_id = data.parent_task_id
    this.estimated_time = data.estimated_time ?? 0
    this.actual_time = data.actual_time ?? 0
    this.project_id = data.project_id
    this.organization_id = data.organization_id
    this.required_skills = requiredSkills.map((skill) => ({
      id: skill.id,
      level: skill.level.trim().toLowerCase(),
    }))
  }

  /**
   * Kiểm tra xem task có được giao cho ai không
   */
  public isAssigned(): boolean {
    return this.assigned_to !== undefined && !!this.assigned_to
  }

  /**
   * Kiểm tra xem task có deadline không
   */
  public hasDueDate(): boolean {
    return this.due_date !== undefined
  }

  /**
   * Kiểm tra xem task có phải là subtask không
   */
  public isSubtask(): boolean {
    return this.parent_task_id !== undefined && !!this.parent_task_id
  }

  /**
   * Kiểm tra xem task có thuộc dự án không
   */
  public belongsToProject(): boolean {
    return this.project_id !== undefined && !!this.project_id
  }

  /**
   * Kiểm tra xem có thời gian ước tính không
   */
  public hasEstimatedTime(): boolean {
    return this.estimated_time > 0
  }

  /**
   * Lấy số ngày còn lại đến deadline (nếu có)
   * Return null nếu không có due_date
   * Return số âm nếu đã quá hạn
   */
  public getDaysUntilDue(): number | null {
    if (!this.due_date) {
      return null
    }

    const now = DateTime.now()
    const diff = this.due_date.diff(now, 'days')
    return Math.floor(diff.days)
  }

  /**
   * Kiểm tra xem task có quá hạn không (so với due_date)
   */
  public isOverdue(): boolean {
    if (!this.due_date) {
      return false
    }

    return this.due_date < DateTime.now()
  }

  /**
   * Convert DTO thành object để lưu vào database
   */
  public toObject(): Record<string, unknown> {
    return {
      title: this.title,
      description: this.description || null,
      status: this.status,
      label: this.label || null,
      priority: this.priority || null,
      assigned_to: this.assigned_to || null,
      due_date: this.due_date || null,
      parent_task_id: this.parent_task_id || null,
      estimated_time: this.estimated_time,
      actual_time: this.actual_time,
      project_id: this.project_id || null,
      organization_id: this.organization_id,
      required_skills: this.required_skills,
    }
  }

  /**
   * Lấy message audit log cho việc tạo task
   */
  public getAuditMessage(): string {
    let message = `Tạo task: ${this.title}`

    if (this.isAssigned() && this.assigned_to !== undefined) {
      message += ` (giao cho user #${this.assigned_to})`
    }

    if (this.isSubtask() && this.parent_task_id !== undefined) {
      message += ` (subtask của #${this.parent_task_id})`
    }

    if (this.belongsToProject() && this.project_id !== undefined) {
      message += ` (thuộc dự án #${this.project_id})`
    }

    return message
  }

  /**
   * Lấy thông tin tóm tắt về task
   */
  public getSummary(): string {
    const parts: string[] = [this.title]

    if (this.isSubtask()) {
      parts.push('(Subtask)')
    }

    if (this.hasDueDate()) {
      const daysUntil = this.getDaysUntilDue()
      if (daysUntil !== null) {
        if (daysUntil < 0) {
          parts.push(`⚠️ Quá hạn ${Math.abs(daysUntil)} ngày`)
        } else if (daysUntil === 0) {
          parts.push('⏰ Hết hạn hôm nay')
        } else if (daysUntil <= 3) {
          parts.push(`⏰ Còn ${daysUntil} ngày`)
        }
      }
    }

    if (this.hasEstimatedTime()) {
      parts.push(`⏱️ ${this.estimated_time}h`)
    }

    return parts.join(' ')
  }
}
