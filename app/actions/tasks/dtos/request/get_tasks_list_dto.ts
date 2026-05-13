import ValidationException from '#exceptions/validation_exception'
import { PAGINATION } from '#modules/common/constants/common_constants'
import type { DatabaseId } from '#types/database'

type TaskListSortBy = 'due_date' | 'created_at' | 'updated_at' | 'title' | 'priority'
type TaskListSortOrder = 'asc' | 'desc'

interface GetTasksListDTOInput {
  page?: number
  limit?: number
  task_status_id?: DatabaseId
  status?: DatabaseId
  priority?: DatabaseId
  label?: DatabaseId
  assigned_to?: DatabaseId
  parent_task_id?: DatabaseId | null
  project_id?: DatabaseId
  search?: string
  organization_id: DatabaseId
  sort_by?: TaskListSortBy
  sort_order?: TaskListSortOrder
}

interface GetTasksListDTOState {
  page: number
  limit: number
  task_status_id?: DatabaseId
  priority?: DatabaseId
  label?: DatabaseId
  assigned_to?: DatabaseId
  parent_task_id?: DatabaseId | null
  project_id?: DatabaseId
  search?: string
  organization_id: DatabaseId
  sort_by: TaskListSortBy
  sort_order: TaskListSortOrder
}

function normalizeOrganizationId(value: DatabaseId): DatabaseId {
  if (!value) {
    throw new ValidationException('ID tổ chức là bắt buộc')
  }

  return value
}

function normalizePagination(
  page?: number,
  limit?: number
): Pick<GetTasksListDTOState, 'page' | 'limit'> {
  const normalizedPage = page ?? 1
  const normalizedLimit = limit ?? 10

  if (normalizedPage < 1) {
    throw new ValidationException('Số trang phải lớn hơn 0')
  }

  if (normalizedLimit < 1) {
    throw new ValidationException('Số lượng item phải lớn hơn 0')
  }

  if (normalizedLimit > PAGINATION.MAX_PER_PAGE) {
    throw new ValidationException('Số lượng item không được vượt quá 100')
  }

  return {
    page: normalizedPage,
    limit: normalizedLimit,
  }
}

function normalizeSearch(value?: string): string | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value.trim().length === 0) {
    throw new ValidationException('Từ khóa tìm kiếm không được để trống')
  }

  if (value.length > 255) {
    throw new ValidationException('Từ khóa tìm kiếm không được vượt quá 255 ký tự')
  }

  return value.trim()
}

function normalizeSortOrder(value?: TaskListSortOrder): TaskListSortOrder {
  if (value && !['asc', 'desc'].includes(value)) {
    throw new ValidationException('Thứ tự sắp xếp phải là asc hoặc desc')
  }

  return value ?? 'asc'
}

function hashTaskSearch(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash &= hash
  }

  return Math.abs(hash).toString(36)
}

function buildTasksListCacheKey(dto: GetTasksListDTO): string {
  const filterParts: string[] = [
    `org:${dto.organization_id}`,
    `page:${dto.page}`,
    `limit:${dto.limit}`,
  ]

  if (dto.hasStatusFilter() && dto.task_status_id !== undefined) {
    filterParts.push(`task_status_id:${dto.task_status_id}`)
  }

  if (dto.hasPriorityFilter() && dto.priority !== undefined) {
    filterParts.push(`priority:${dto.priority}`)
  }

  if (dto.hasLabelFilter() && dto.label !== undefined) {
    filterParts.push(`label:${dto.label}`)
  }

  if (dto.hasAssigneeFilter() && dto.assigned_to !== undefined) {
    filterParts.push(`assignee:${dto.assigned_to}`)
  }

  if (dto.hasParentFilter() && dto.parent_task_id !== undefined) {
    filterParts.push(`parent:${dto.parent_task_id ?? 'none'}`)
  }

  if (dto.hasProjectFilter() && dto.project_id !== undefined) {
    filterParts.push(`project:${dto.project_id}`)
  }

  if (dto.hasSearch() && dto.search) {
    filterParts.push(`search:${hashTaskSearch(dto.search)}`)
  }

  filterParts.push(`sort:${dto.sort_by}:${dto.sort_order}`)

  return `tasks:list:${filterParts.join(':')}`
}

function buildTaskFilterSummary(dto: GetTasksListDTO): string {
  if (!dto.hasFilters()) {
    return 'Không có filter'
  }

  const filters: string[] = []

  if (dto.hasStatusFilter() && dto.task_status_id !== undefined) {
    filters.push(`Task status: ${dto.task_status_id}`)
  }

  if (dto.hasPriorityFilter() && dto.priority !== undefined) {
    filters.push(`Priority: ${dto.priority}`)
  }

  if (dto.hasLabelFilter() && dto.label !== undefined) {
    filters.push(`Label: ${dto.label}`)
  }

  if (dto.hasAssigneeFilter() && dto.assigned_to !== undefined) {
    filters.push(`Assignee: ${dto.assigned_to}`)
  }

  if (dto.isSubtasksOnly() && dto.parent_task_id !== undefined && dto.parent_task_id !== null) {
    filters.push(`Subtasks of: ${dto.parent_task_id}`)
  }

  if (dto.isRootTasksOnly()) {
    filters.push('Root tasks only')
  }

  if (dto.hasProjectFilter() && dto.project_id !== undefined) {
    filters.push(`Project: ${dto.project_id}`)
  }

  if (dto.hasSearch() && dto.search) {
    filters.push(`Search: "${dto.search}"`)
  }

  return filters.join(', ')
}

function buildGetTasksListDTOState(data: GetTasksListDTOInput): GetTasksListDTOState {
  const pagination = normalizePagination(data.page, data.limit)

  return {
    ...pagination,
    task_status_id: data.task_status_id ?? data.status,
    priority: data.priority,
    label: data.label,
    assigned_to: data.assigned_to,
    parent_task_id: data.parent_task_id,
    project_id: data.project_id,
    search: normalizeSearch(data.search),
    organization_id: normalizeOrganizationId(data.organization_id),
    sort_by: data.sort_by ?? 'due_date',
    sort_order: normalizeSortOrder(data.sort_order),
  }
}

export default class GetTasksListDTO {
  public readonly page: number
  public readonly limit: number
  public readonly task_status_id?: DatabaseId
  public readonly priority?: DatabaseId
  public readonly label?: DatabaseId
  public readonly assigned_to?: DatabaseId
  public readonly parent_task_id?: DatabaseId | null
  public readonly project_id?: DatabaseId
  public readonly search?: string
  public readonly organization_id: DatabaseId
  public readonly sort_by: TaskListSortBy
  public readonly sort_order: TaskListSortOrder

  constructor(data: GetTasksListDTOInput) {
    const state = buildGetTasksListDTOState(data)

    this.page = state.page
    this.limit = state.limit
    this.task_status_id = state.task_status_id
    this.priority = state.priority
    this.label = state.label
    this.assigned_to = state.assigned_to
    this.parent_task_id = state.parent_task_id
    this.project_id = state.project_id
    this.search = state.search
    this.organization_id = state.organization_id
    this.sort_by = state.sort_by
    this.sort_order = state.sort_order
  }

  public hasFilters(): boolean {
    return (
      this.task_status_id !== undefined ||
      this.priority !== undefined ||
      this.label !== undefined ||
      this.assigned_to !== undefined ||
      this.parent_task_id !== undefined ||
      this.project_id !== undefined ||
      this.search !== undefined
    )
  }

  public hasStatusFilter(): boolean {
    return this.task_status_id !== undefined
  }

  public hasPriorityFilter(): boolean {
    return this.priority !== undefined
  }

  public hasLabelFilter(): boolean {
    return this.label !== undefined
  }

  public hasAssigneeFilter(): boolean {
    return this.assigned_to !== undefined
  }

  public hasParentFilter(): boolean {
    return this.parent_task_id !== undefined
  }

  public hasProjectFilter(): boolean {
    return this.project_id !== undefined
  }

  public hasSearch(): boolean {
    return this.search !== undefined && this.search.length > 0
  }

  public isSubtasksOnly(): boolean {
    return this.parent_task_id !== undefined && this.parent_task_id !== null
  }

  public isRootTasksOnly(): boolean {
    return this.parent_task_id === null
  }

  public getOffset(): number {
    return (this.page - 1) * this.limit
  }

  public getCacheKey(): string {
    return buildTasksListCacheKey(this)
  }

  public toObject(): Record<string, unknown> {
    return {
      page: this.page,
      limit: this.limit,
      task_status_id: this.task_status_id,
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

  public getFiltersSummary(): string {
    return buildTaskFilterSummary(this)
  }
}
