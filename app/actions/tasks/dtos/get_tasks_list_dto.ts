import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'
import { PAGINATION } from '#constants/common_constants'

/**
 * DTO cho việc lấy danh sách tasks với filters
 *
 * Validates:
 * - Pagination: page, limit
 * - Filters: status, priority, label, assigned_to, parent_task_id, project_id
 * - Search: title, description
 * - organization_id: bắt buộc
 *
 * Provides:
 * - Default values (page=1, limit=10)
 * - Filter validation
 * - Helper methods
 */
export default class GetTasksListDTO {
  public readonly page: number
  public readonly limit: number
  public readonly status?: DatabaseId
  public readonly priority?: DatabaseId
  public readonly label?: DatabaseId
  public readonly assigned_to?: DatabaseId
  public readonly parent_task_id?: DatabaseId | null
  public readonly project_id?: DatabaseId | null
  public readonly search?: string
  public readonly organization_id: DatabaseId
  public readonly sort_by?: 'due_date' | 'created_at' | 'updated_at' | 'title' | 'priority'
  public readonly sort_order?: 'asc' | 'desc'

  constructor(data: {
    page?: number
    limit?: number
    status?: DatabaseId
    priority?: DatabaseId
    label?: DatabaseId
    assigned_to?: DatabaseId
    parent_task_id?: DatabaseId | null
    project_id?: DatabaseId | null
    search?: string
    organization_id: DatabaseId
    sort_by?: 'due_date' | 'created_at' | 'updated_at' | 'title' | 'priority'
    sort_order?: 'asc' | 'desc'
  }) {
    // Validate organization_id (UUIDv7 string)
    if (!data.organization_id) {
      throw new ValidationException('ID tổ chức là bắt buộc')
    }

    // Validate pagination
    const page = data.page ?? 1
    const limit = data.limit ?? 10

    if (page < 1) {
      throw new ValidationException('Số trang phải lớn hơn 0')
    }

    if (limit < 1) {
      throw new ValidationException('Số lượng item phải lớn hơn 0')
    }

    if (limit > PAGINATION.MAX_PER_PAGE) {
      throw new ValidationException('Số lượng item không được vượt quá 100')
    }

    // v3: status/priority/label are inline VARCHAR strings, not numeric IDs
    // No numeric validation needed — they're validated against enum values elsewhere

    // Validate search
    if (data.search !== undefined) {
      if (data.search.trim().length === 0) {
        throw new ValidationException('Từ khóa tìm kiếm không được để trống')
      }

      if (data.search.length > 255) {
        throw new ValidationException('Từ khóa tìm kiếm không được vượt quá 255 ký tự')
      }
    }

    // Validate sort
    if (data.sort_order && !['asc', 'desc'].includes(data.sort_order)) {
      throw new ValidationException('Thứ tự sắp xếp phải là asc hoặc desc')
    }

    this.page = page
    this.limit = limit
    this.status = data.status
    this.priority = data.priority
    this.label = data.label
    this.assigned_to = data.assigned_to
    this.parent_task_id = data.parent_task_id
    this.project_id = data.project_id
    this.search = data.search?.trim()
    this.organization_id = data.organization_id
    this.sort_by = data.sort_by ?? 'due_date'
    this.sort_order = data.sort_order ?? 'asc'
  }

  /**
   * Kiểm tra xem có filter nào được apply không
   */
  public hasFilters(): boolean {
    return !!(
      this.status ||
      this.priority ||
      this.label ||
      this.assigned_to ||
      this.parent_task_id !== undefined ||
      this.project_id !== undefined ||
      this.search
    )
  }

  /**
   * Kiểm tra xem có filter theo status không
   */
  public hasStatusFilter(): boolean {
    return this.status !== undefined
  }

  /**
   * Kiểm tra xem có filter theo priority không
   */
  public hasPriorityFilter(): boolean {
    return this.priority !== undefined
  }

  /**
   * Kiểm tra xem có filter theo label không
   */
  public hasLabelFilter(): boolean {
    return this.label !== undefined
  }

  /**
   * Kiểm tra xem có filter theo assignee không
   */
  public hasAssigneeFilter(): boolean {
    return this.assigned_to !== undefined
  }

  /**
   * Kiểm tra xem có filter theo parent_task không
   */
  public hasParentFilter(): boolean {
    return this.parent_task_id !== undefined
  }

  /**
   * Kiểm tra xem có filter theo project không
   */
  public hasProjectFilter(): boolean {
    return this.project_id !== undefined
  }

  /**
   * Kiểm tra xem có search không
   */
  public hasSearch(): boolean {
    return this.search !== undefined && this.search.length > 0
  }

  /**
   * Kiểm tra xem có lọc chỉ subtasks không
   */
  public isSubtasksOnly(): boolean {
    return this.parent_task_id !== undefined && this.parent_task_id !== null
  }

  /**
   * Kiểm tra xem có lọc chỉ root tasks (không có parent) không
   */
  public isRootTasksOnly(): boolean {
    return this.parent_task_id === null
  }

  /**
   * Kiểm tra xem có lọc theo project không có không
   */
  public isWithoutProject(): boolean {
    return this.project_id === null
  }

  /**
   * Calculate offset cho pagination
   */
  public getOffset(): number {
    return (this.page - 1) * this.limit
  }

  /**
   * Lấy cache key cho query này
   */
  public getCacheKey(): string {
    const filterParts: string[] = [
      `org:${this.organization_id}`,
      `page:${this.page}`,
      `limit:${this.limit}`,
    ]

    if (this.hasStatusFilter() && this.status !== undefined) {
      filterParts.push(`status:${String(this.status)}`)
    }

    if (this.hasPriorityFilter() && this.priority !== undefined) {
      filterParts.push(`priority:${String(this.priority)}`)
    }

    if (this.hasLabelFilter() && this.label !== undefined) {
      filterParts.push(`label:${String(this.label)}`)
    }

    if (this.hasAssigneeFilter() && this.assigned_to !== undefined) {
      filterParts.push(`assignee:${String(this.assigned_to)}`)
    }

    if (this.hasParentFilter() && this.parent_task_id !== undefined) {
      filterParts.push(`parent:${String(this.parent_task_id)}`)
    }

    if (this.hasProjectFilter() && this.project_id !== undefined) {
      filterParts.push(`project:${String(this.project_id)}`)
    }

    if (this.hasSearch() && this.search) {
      // Hash search term để tránh cache key quá dài
      filterParts.push(`search:${this.hashString(this.search)}`)
    }

    filterParts.push(`sort:${String(this.sort_by)}:${String(this.sort_order)}`)

    return `tasks:list:${filterParts.join(':')}`
  }

  /**
   * Simple hash function cho string
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Convert DTO thành object để log hoặc debug
   */
  public toObject(): Record<string, unknown> {
    return {
      page: this.page,
      limit: this.limit,
      status: this.status,
      priority: this.priority,
      label: this.label,
      assigned_to: this.assigned_to,
      parent_task_id: this.parent_task_id,
      project_id: this.project_id,
      search: this.search,
      organization_id: this.organization_id,
      sort_by: this.sort_by,
      sort_order: this.sort_order,
      has_filters: this.hasFilters(),
    }
  }

  /**
   * Lấy tóm tắt filters đang apply
   */
  public getFiltersSummary(): string {
    if (!this.hasFilters()) {
      return 'Không có filter'
    }

    const filters: string[] = []

    if (this.hasStatusFilter() && this.status !== undefined) {
      filters.push(`Status: ${String(this.status)}`)
    }

    if (this.hasPriorityFilter() && this.priority !== undefined) {
      filters.push(`Priority: ${String(this.priority)}`)
    }

    if (this.hasLabelFilter() && this.label !== undefined) {
      filters.push(`Label: ${String(this.label)}`)
    }

    if (this.hasAssigneeFilter() && this.assigned_to !== undefined) {
      filters.push(`Assignee: ${String(this.assigned_to)}`)
    }

    if (
      this.isSubtasksOnly() &&
      this.parent_task_id !== undefined &&
      this.parent_task_id !== null
    ) {
      filters.push(`Subtasks of: ${String(this.parent_task_id)}`)
    }

    if (this.isRootTasksOnly()) {
      filters.push('Root tasks only')
    }

    if (this.hasProjectFilter() && this.project_id !== null && this.project_id !== undefined) {
      filters.push(`Project: ${String(this.project_id)}`)
    }

    if (this.isWithoutProject()) {
      filters.push('No project')
    }

    if (this.hasSearch() && this.search) {
      filters.push(`Search: "${this.search}"`)
    }

    return filters.join(', ')
  }
}
