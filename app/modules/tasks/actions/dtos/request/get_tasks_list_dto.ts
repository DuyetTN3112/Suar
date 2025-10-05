import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import ValidationException from '#modules/http/exceptions/validation_exception'
import {
  normalizeStrictPagination,
  toOffset,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { TASK_PAGINATION as PAGINATION } from '#modules/tasks/application/dtos/common/task_pagination'

type TaskListSortBy = 'due_date' | 'created_at' | 'updated_at' | 'title' | 'priority'
type TaskListSortOrder = 'asc' | 'desc'

interface GetTasksListDTOInput {
  page?: number
  limit?: number
  task_status_id?: string[]
  status?: string[]
  priority?: string[]
  label?: string[]
  assigned_to?: string[]
  parent_task_id?: string | null
  project_id?: string
  project_sprint_id?: string | null
  search?: string
  organization_id: string
  sort_by?: TaskListSortBy
  sort_order?: TaskListSortOrder
  created_at_start?: string
  created_at_end?: string
  due_date_start?: string
  due_date_end?: string
}

interface GetTasksListDTOState {
  page: number
  limit: number
  task_status_id?: string[]
  priority?: string[]
  label?: string[]
  assigned_to?: string[]
  parent_task_id?: string | null
  project_id?: string
  project_sprint_id?: string | null
  search?: string
  organization_id: string
  sort_by: TaskListSortBy
  sort_order: TaskListSortOrder
  created_at_start?: string
  created_at_end?: string
  due_date_start?: string
  due_date_end?: string
}

function normalizeOrganizationId(value: string): string {
  if (!value) {
    throw new ValidationException('ID tổ chức là bắt buộc')
  }

  return value
}

function normalizePagination(
  page?: unknown,
  limit?: unknown
): Pick<GetTasksListDTOState, 'page' | 'limit'> {
  const pagination = normalizeStrictPagination(
    { page, limit },
    PAGINATION,
    { perPage: 10 },
    {
      createError: (message) => new ValidationException(message),
      pageLessThanOne: 'Số trang phải lớn hơn 0',
      perPageLessThanOne: 'Số lượng item phải lớn hơn 0',
      perPageTooLarge: 'Số lượng item không được vượt quá 100',
    }
  )

  return {
    page: pagination.page,
    limit: pagination.perPage,
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
    filterParts.push(`task_status_id:${dto.task_status_id.sort().join(',')}`)
  }

  if (dto.hasPriorityFilter() && dto.priority !== undefined) {
    filterParts.push(`priority:${dto.priority.sort().join(',')}`)
  }

  if (dto.hasLabelFilter() && dto.label !== undefined) {
    filterParts.push(`label:${dto.label.sort().join(',')}`)
  }

  if (dto.hasAssigneeFilter() && dto.assigned_to !== undefined) {
    filterParts.push(`assignee:${dto.assigned_to.sort().join(',')}`)
  }

  if (dto.hasParentFilter() && dto.parent_task_id !== undefined) {
    filterParts.push(`parent:${dto.parent_task_id ?? 'none'}`)
  }

  if (dto.hasProjectFilter() && dto.project_id !== undefined) {
    filterParts.push(`project:${dto.project_id}`)
  }

  if (dto.hasProjectSprintFilter()) {
    filterParts.push(`project_sprint:${dto.project_sprint_id ?? 'backlog'}`)
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
    filters.push(`Task status: ${dto.task_status_id.join(', ')}`)
  }

  if (dto.hasPriorityFilter() && dto.priority !== undefined) {
    filters.push(`Priority: ${dto.priority.join(', ')}`)
  }

  if (dto.hasLabelFilter() && dto.label !== undefined) {
    filters.push(`Label: ${dto.label.join(', ')}`)
  }

  if (dto.hasAssigneeFilter() && dto.assigned_to !== undefined) {
    filters.push(`Assignee: ${dto.assigned_to.join(', ')}`)
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

  if (dto.hasProjectSprintFilter()) {
    filters.push(
      dto.project_sprint_id === null ? 'Sprint backlog' : `Sprint: ${dto.project_sprint_id ?? ''}`
    )
  }

  if (dto.hasSearch() && dto.search) {
    filters.push(`Search: "${dto.search}"`)
  }

  return filters.join(', ')
}

function buildGetTasksListDTOState(data: GetTasksListDTOInput): GetTasksListDTOState {
  const pagination = normalizePagination(data.page, data.limit)

  return omitUndefined({
    ...pagination,
    task_status_id: data.task_status_id ?? data.status,
    priority: data.priority,
    label: data.label,
    assigned_to: data.assigned_to,
    parent_task_id: data.parent_task_id,
    project_id: data.project_id,
    project_sprint_id: data.project_sprint_id,
    search: normalizeSearch(data.search),
    organization_id: normalizeOrganizationId(data.organization_id),
    sort_by: data.sort_by ?? 'due_date',
    sort_order: normalizeSortOrder(data.sort_order),
    created_at_start: data.created_at_start,
    created_at_end: data.created_at_end,
    due_date_start: data.due_date_start,
    due_date_end: data.due_date_end,
  })
}

export default class GetTasksListDTO {
  public readonly page: number
  public readonly limit: number
  public readonly task_status_id: string[] | undefined
  public readonly priority: string[] | undefined
  public readonly label: string[] | undefined
  public readonly assigned_to: string[] | undefined
  public readonly parent_task_id: string | null | undefined
  public readonly project_id: string | undefined
  public readonly project_sprint_id: string | null | undefined
  public readonly search: string | undefined
  public readonly organization_id: string
  public readonly sort_by: TaskListSortBy
  public readonly sort_order: TaskListSortOrder
  public readonly created_at_start: string | undefined
  public readonly created_at_end: string | undefined
  public readonly due_date_start: string | undefined
  public readonly due_date_end: string | undefined

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
    this.project_sprint_id = state.project_sprint_id
    this.search = state.search
    this.organization_id = state.organization_id
    this.sort_by = state.sort_by
    this.sort_order = state.sort_order
    this.created_at_start = state.created_at_start
    this.created_at_end = state.created_at_end
    this.due_date_start = state.due_date_start
    this.due_date_end = state.due_date_end
  }

  public hasFilters(): boolean {
    return (
      this.task_status_id !== undefined ||
      this.priority !== undefined ||
      this.label !== undefined ||
      this.assigned_to !== undefined ||
      this.parent_task_id !== undefined ||
      this.project_id !== undefined ||
      this.project_sprint_id !== undefined ||
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

  public hasProjectSprintFilter(): boolean {
    return this.project_sprint_id !== undefined
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

  public isProjectBacklogOnly(): boolean {
    return this.project_sprint_id === null
  }

  public getOffset(): number {
    return toOffset(this.page, this.limit)
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
      project_sprint_id: this.project_sprint_id,
      search: this.search,
      organization_id: this.organization_id,
      sort_by: this.sort_by,
      sort_order: this.sort_order,
      created_at_start: this.created_at_start,
      created_at_end: this.created_at_end,
      due_date_start: this.due_date_start,
      due_date_end: this.due_date_end,
      has_filters: this.hasFilters(),
    }
  }

  public getFiltersSummary(): string {
    return buildTaskFilterSummary(this)
  }
}
