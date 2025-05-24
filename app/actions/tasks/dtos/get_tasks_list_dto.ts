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
  public readonly status?: number
  public readonly priority?: number
  public readonly label?: number
  public readonly assigned_to?: number
  public readonly parent_task_id?: number | null
  public readonly project_id?: number | null
  public readonly search?: string
  public readonly organization_id: number
  public readonly sort_by?: 'due_date' | 'created_at' | 'updated_at' | 'title' | 'priority'
  public readonly sort_order?: 'asc' | 'desc'

  constructor(data: {
    page?: number
    limit?: number
    status?: number
    priority?: number
    label?: number
    assigned_to?: number
    parent_task_id?: number | null
    project_id?: number | null
    search?: string
    organization_id: number
    sort_by?: 'due_date' | 'created_at' | 'updated_at' | 'title' | 'priority'
    sort_order?: 'asc' | 'desc'
  }) {
    // Validate organization_id
    if (!data.organization_id || data.organization_id <= 0) {
      throw new Error('ID tổ chức là bắt buộc')
    }

    // Validate pagination
    const page = data.page ?? 1
    const limit = data.limit ?? 10

    if (page < 1) {
      throw new Error('Số trang phải lớn hơn 0')
    }

    if (limit < 1) {
      throw new Error('Số lượng item phải lớn hơn 0')
    }

    if (limit > 100) {
      throw new Error('Số lượng item không được vượt quá 100')
    }

    // Validate filter IDs if provided
    if (data.status !== undefined && data.status <= 0) {
      throw new Error('ID trạng thái không hợp lệ')
    }

    if (data.priority !== undefined && data.priority <= 0) {
      throw new Error('ID mức độ ưu tiên không hợp lệ')
    }

    if (data.label !== undefined && data.label <= 0) {
      throw new Error('ID nhãn không hợp lệ')
    }

    if (data.assigned_to !== undefined && data.assigned_to <= 0) {
      throw new Error('ID người được giao không hợp lệ')
    }

    if (
      data.parent_task_id !== undefined &&
      data.parent_task_id !== null &&
      data.parent_task_id <= 0
    ) {
      throw new Error('ID task cha không hợp lệ')
    }

    if (data.project_id !== undefined && data.project_id !== null && data.project_id <= 0) {
      throw new Error('ID dự án không hợp lệ')
    }

    // Validate search
    if (data.search !== undefined) {
      if (data.search.trim().length === 0) {
        throw new Error('Từ khóa tìm kiếm không được để trống')
      }

      if (data.search.length > 255) {
        throw new Error('Từ khóa tìm kiếm không được vượt quá 255 ký tự')
      }
    }

    // Validate sort
    if (data.sort_order && !['asc', 'desc'].includes(data.sort_order)) {
      throw new Error('Thứ tự sắp xếp phải là asc hoặc desc')
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

    if (this.hasStatusFilter()) {
      filterParts.push(`status:${this.status}`)
    }

    if (this.hasPriorityFilter()) {
      filterParts.push(`priority:${this.priority}`)
    }

    if (this.hasLabelFilter()) {
      filterParts.push(`label:${this.label}`)
    }

    if (this.hasAssigneeFilter()) {
      filterParts.push(`assignee:${this.assigned_to}`)
    }

    if (this.hasParentFilter()) {
      filterParts.push(`parent:${this.parent_task_id}`)
    }

    if (this.hasProjectFilter()) {
      filterParts.push(`project:${this.project_id}`)
    }

    if (this.hasSearch()) {
      // Hash search term để tránh cache key quá dài
      filterParts.push(`search:${this.hashString(this.search!)}`)
    }

    filterParts.push(`sort:${this.sort_by}:${this.sort_order}`)

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
  public toObject(): Record<string, any> {
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

    if (this.hasStatusFilter()) {
      filters.push(`Status: ${this.status}`)
    }

    if (this.hasPriorityFilter()) {
      filters.push(`Priority: ${this.priority}`)
    }

    if (this.hasLabelFilter()) {
      filters.push(`Label: ${this.label}`)
    }

    if (this.hasAssigneeFilter()) {
      filters.push(`Assignee: ${this.assigned_to}`)
    }

    if (this.isSubtasksOnly()) {
      filters.push(`Subtasks of: ${this.parent_task_id}`)
    }

    if (this.isRootTasksOnly()) {
      filters.push('Root tasks only')
    }

    if (this.hasProjectFilter() && this.project_id !== null) {
      filters.push(`Project: ${this.project_id}`)
    }

    if (this.isWithoutProject()) {
      filters.push('No project')
    }

    if (this.hasSearch()) {
      filters.push(`Search: "${this.search}"`)
    }

    return filters.join(', ')
  }
}
