import ValidationException from '#exceptions/validation_exception'
import { TaskStatusCategory } from '#modules/tasks/constants/task_constants'
import { isValidSlug, isValidCategory } from '#modules/tasks/domain/task_status_rules'
import type { DatabaseId } from '#types/database'

/**
 * DTO for creating a new task status within an organization.
 */
export class CreateTaskStatusDTO {
  public readonly organization_id: DatabaseId
  public readonly name: string
  public readonly slug: string
  public readonly category: string
  public readonly color: string
  public readonly icon?: string
  public readonly description?: string
  public readonly sort_order: number

  constructor(data: {
    organization_id: DatabaseId
    name: string
    slug: string
    category: string
    color?: string
    icon?: string
    description?: string
    sort_order?: number
  }) {
    if (!data.organization_id) {
      throw new ValidationException('organization_id là bắt buộc')
    }
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationException('Tên trạng thái là bắt buộc')
    }
    if (data.name.length > 50) {
      throw new ValidationException('Tên trạng thái không được vượt quá 50 ký tự')
    }
    if (!data.slug) {
      throw new ValidationException('Slug là bắt buộc')
    }
    if (!isValidSlug(data.slug)) {
      throw new ValidationException(
        'Slug chỉ được chứa chữ thường, số và dấu gạch dưới (2-50 ký tự)'
      )
    }
    if (!data.category) {
      throw new ValidationException('Category là bắt buộc')
    }
    if (!isValidCategory(data.category)) {
      throw new ValidationException(
        `Category không hợp lệ. Cho phép: ${(Object.values(TaskStatusCategory) as string[]).join(', ')}`
      )
    }

    this.organization_id = data.organization_id
    this.name = data.name.trim()
    this.slug = data.slug
    this.category = data.category
    this.color = data.color ?? '#6B7280'
    this.icon = data.icon?.trim()
    this.description = data.description?.trim()
    this.sort_order = data.sort_order ?? 0
  }

  static fromValidatedPayload(
    payload: {
      name: string
      slug: string
      category?: string
      color?: string
      icon?: string
      description?: string
      sort_order?: number
    },
    organizationId: DatabaseId
  ): CreateTaskStatusDTO {
    return new CreateTaskStatusDTO({
      organization_id: organizationId,
      name: payload.name,
      slug: payload.slug,
      category: payload.category ?? TaskStatusCategory.IN_PROGRESS,
      color: payload.color,
      icon: payload.icon,
      description: payload.description,
      sort_order: payload.sort_order,
    })
  }
}

/**
 * DTO for updating an existing task status.
 */
export class UpdateTaskStatusDTO {
  public readonly status_id: DatabaseId
  public readonly organization_id: DatabaseId
  public readonly name?: string
  public readonly slug?: string
  public readonly category?: string
  public readonly color?: string
  public readonly icon?: string | null
  public readonly description?: string | null
  public readonly sort_order?: number
  public readonly is_default?: boolean

  constructor(data: {
    status_id: DatabaseId
    organization_id: DatabaseId
    name?: string
    slug?: string
    category?: string
    color?: string
    icon?: string | null
    description?: string | null
    sort_order?: number
    is_default?: boolean
  }) {
    if (!data.status_id) {
      throw new ValidationException('status_id là bắt buộc')
    }
    if (!data.organization_id) {
      throw new ValidationException('organization_id là bắt buộc')
    }
    if (data.name?.trim().length === 0) {
      throw new ValidationException('Tên trạng thái không được để trống')
    }
    if (data.name !== undefined && data.name.length > 50) {
      throw new ValidationException('Tên trạng thái không được vượt quá 50 ký tự')
    }
    if (data.slug !== undefined && !isValidSlug(data.slug)) {
      throw new ValidationException(
        'Slug chỉ được chứa chữ thường, số và dấu gạch dưới (2-50 ký tự)'
      )
    }
    if (data.category !== undefined && !isValidCategory(data.category)) {
      throw new ValidationException(
        `Category không hợp lệ. Cho phép: ${(Object.values(TaskStatusCategory) as string[]).join(', ')}`
      )
    }

    this.status_id = data.status_id
    this.organization_id = data.organization_id
    this.name = data.name?.trim()
    this.slug = data.slug
    this.category = data.category
    this.color = data.color
    this.icon = data.icon
    this.description = data.description
    this.sort_order = data.sort_order
    this.is_default = data.is_default
  }

  static fromValidatedPayload(
    payload: {
      name?: string
      slug?: string
      category?: string
      color?: string
      icon?: string | null
      description?: string | null
      sort_order?: number
      is_default?: boolean
    },
    identifiers: {
      organization_id: DatabaseId
      status_id: DatabaseId
    }
  ): UpdateTaskStatusDTO {
    return new UpdateTaskStatusDTO({
      status_id: identifiers.status_id,
      organization_id: identifiers.organization_id,
      name: payload.name,
      slug: payload.slug,
      category: payload.category,
      color: payload.color,
      icon: payload.icon,
      description: payload.description,
      sort_order: payload.sort_order,
      is_default: payload.is_default,
    })
  }

  /** Whether the category field is being changed */
  get isChangingCategory(): boolean {
    return this.category !== undefined
  }
}

/**
 * DTO for deleting a task status.
 */
export class DeleteTaskStatusDTO {
  public readonly status_id: DatabaseId
  public readonly organization_id: DatabaseId

  constructor(data: { status_id: DatabaseId; organization_id: DatabaseId }) {
    if (!data.status_id) {
      throw new ValidationException('status_id là bắt buộc')
    }
    if (!data.organization_id) {
      throw new ValidationException('organization_id là bắt buộc')
    }

    this.status_id = data.status_id
    this.organization_id = data.organization_id
  }

  static fromIdentifiers(identifiers: {
    status_id: DatabaseId
    organization_id: DatabaseId
  }): DeleteTaskStatusDTO {
    return new DeleteTaskStatusDTO(identifiers)
  }
}

/**
 * DTO for updating the entire workflow (transitions) for an organization.
 */
export class UpdateWorkflowDTO {
  public readonly organization_id: DatabaseId
  public readonly transitions: {
    from_status_id: DatabaseId
    to_status_id: DatabaseId
    conditions: Record<string, unknown>
  }[]

  constructor(data: {
    organization_id: DatabaseId
    transitions: {
      from_status_id: DatabaseId
      to_status_id: DatabaseId
      conditions?: Record<string, unknown>
    }[]
  }) {
    if (!data.organization_id) {
      throw new ValidationException('organization_id là bắt buộc')
    }
    if (!Array.isArray(data.transitions)) {
      throw new ValidationException('transitions phải là một mảng')
    }
    for (const t of data.transitions) {
      if (!t.from_status_id || !t.to_status_id) {
        throw new ValidationException('Mỗi transition phải có from_status_id và to_status_id')
      }
      if (t.from_status_id === t.to_status_id) {
        throw new ValidationException('from_status_id và to_status_id không được trùng nhau')
      }
    }

    this.organization_id = data.organization_id
    this.transitions = data.transitions.map((t) => ({
      from_status_id: t.from_status_id,
      to_status_id: t.to_status_id,
      conditions: t.conditions ?? {},
    }))
  }

  static fromTransitions(
    transitions: {
      from_status_id: DatabaseId
      to_status_id: DatabaseId
      conditions?: Record<string, unknown>
    }[],
    organizationId: DatabaseId
  ): UpdateWorkflowDTO {
    return new UpdateWorkflowDTO({
      organization_id: organizationId,
      transitions,
    })
  }
}
