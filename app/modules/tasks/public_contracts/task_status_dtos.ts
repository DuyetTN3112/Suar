import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'
import {
  isValidTaskStatusCategory,
  isValidTaskStatusSlug,
} from '#modules/tasks/public_contracts/task_status_contract'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


export class CreateTaskStatusDTO {
  public readonly organization_id: string
  public readonly project_id: string | null
  public readonly name: string
  public readonly slug: string
  public readonly category: string
  public readonly color: string
  public readonly icon: string | undefined
  public readonly description: string | undefined
  public readonly sort_order: number

  constructor(data: {
    organization_id: string
    project_id?: string | null
    name: string
    slug: string
    category: string
    color?: string
    icon?: string
    description?: string
    sort_order?: number
  }) {
    if (!data.organization_id) {
      throw ValidationException.field('organization_id', 'organization_id là bắt buộc')
    }
    if (!data.name || data.name.trim().length === 0) {
      throw ValidationException.field('name', 'Tên trạng thái là bắt buộc')
    }
    if (data.name.length > 50) {
      throw ValidationException.field('name', 'Tên trạng thái không được vượt quá 50 ký tự')
    }
    if (!data.slug) {
      throw ValidationException.field('slug', 'Slug là bắt buộc')
    }
    if (!isValidTaskStatusSlug(data.slug)) {
      throw ValidationException.field(
        'slug',
        'Slug chỉ được chứa chữ thường, số và dấu gạch dưới (2-50 ký tự)'
      )
    }
    if (!data.category) {
      throw ValidationException.field('category', 'Category là bắt buộc')
    }
    if (!isValidTaskStatusCategory(data.category)) {
      throw ValidationException.field(
        'category',
        `Category không hợp lệ. Cho phép: ${(Object.values(TaskStatusCategory) as string[]).join(', ')}`
      )
    }

    this.organization_id = data.organization_id
    this.project_id = data.project_id ?? null
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
    organizationId: string,
    projectId?: string | null
  ): CreateTaskStatusDTO {
    return new CreateTaskStatusDTO(
      omitUndefined({
        organization_id: organizationId,
        project_id: projectId ?? null,
        name: payload.name,
        slug: payload.slug,
        category: payload.category ?? TaskStatusCategory.IN_PROGRESS,
        color: payload.color,
        icon: payload.icon,
        description: payload.description,
        sort_order: payload.sort_order,
      })
    )
  }
}

export class UpdateTaskStatusDTO {
  public readonly status_id: string
  public readonly organization_id: string
  public readonly project_id: string | null
  public readonly name: string | undefined
  public readonly slug: string | undefined
  public readonly category: string | undefined
  public readonly color: string | undefined
  public readonly icon: string | null | undefined
  public readonly description: string | null | undefined
  public readonly sort_order: number | undefined
  public readonly is_default: boolean | undefined

  constructor(data: {
    status_id: string
    organization_id: string
    project_id?: string | null
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
      throw ValidationException.field('status_id', 'status_id là bắt buộc')
    }
    if (!data.organization_id) {
      throw ValidationException.field('organization_id', 'organization_id là bắt buộc')
    }
    if (data.name?.trim().length === 0) {
      throw ValidationException.field('name', 'Tên trạng thái không được để trống')
    }
    if (data.name !== undefined && data.name.length > 50) {
      throw ValidationException.field('name', 'Tên trạng thái không được vượt quá 50 ký tự')
    }
    if (data.slug !== undefined && !isValidTaskStatusSlug(data.slug)) {
      throw ValidationException.field(
        'slug',
        'Slug chỉ được chứa chữ thường, số và dấu gạch dưới (2-50 ký tự)'
      )
    }
    if (data.category !== undefined && !isValidTaskStatusCategory(data.category)) {
      throw ValidationException.field(
        'category',
        `Category không hợp lệ. Cho phép: ${(Object.values(TaskStatusCategory) as string[]).join(', ')}`
      )
    }

    this.status_id = data.status_id
    this.organization_id = data.organization_id
    this.project_id = data.project_id ?? null
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
      organization_id: string
      status_id: string
      project_id?: string | null
    }
  ): UpdateTaskStatusDTO {
    return new UpdateTaskStatusDTO(
      omitUndefined({
        status_id: identifiers.status_id,
        organization_id: identifiers.organization_id,
        project_id: identifiers.project_id ?? null,
        name: payload.name,
        slug: payload.slug,
        category: payload.category,
        color: payload.color,
        icon: payload.icon,
        description: payload.description,
        sort_order: payload.sort_order,
        is_default: payload.is_default,
      })
    )
  }

  get isChangingCategory(): boolean {
    return this.category !== undefined
  }
}

export class DeleteTaskStatusDTO {
  public readonly status_id: string
  public readonly organization_id: string
  public readonly project_id: string | null

  constructor(data: { status_id: string; organization_id: string; project_id?: string | null }) {
    if (!data.status_id) {
      throw ValidationException.field('status_id', 'status_id là bắt buộc')
    }
    if (!data.organization_id) {
      throw ValidationException.field('organization_id', 'organization_id là bắt buộc')
    }

    this.status_id = data.status_id
    this.organization_id = data.organization_id
    this.project_id = data.project_id ?? null
  }

  static fromIdentifiers(identifiers: {
    status_id: string
    organization_id: string
    project_id?: string | null
  }): DeleteTaskStatusDTO {
    return new DeleteTaskStatusDTO(identifiers)
  }
}

export class UpdateWorkflowDTO {
  public readonly organization_id: string
  public readonly project_id: string | null
  public readonly transitions: {
    from_status_id: string
    to_status_id: string
    conditions: Record<string, unknown>
  }[]

  constructor(data: {
    organization_id: string
    project_id?: string | null
    transitions: {
      from_status_id: string
      to_status_id: string
      conditions?: Record<string, unknown>
    }[]
  }) {
    if (!data.organization_id) {
      throw ValidationException.field('organization_id', 'organization_id là bắt buộc')
    }
    if (!Array.isArray(data.transitions)) {
      throw ValidationException.field('transitions', 'transitions phải là một mảng')
    }
    for (const [index, transition] of data.transitions.entries()) {
      if (!transition.from_status_id) {
        throw ValidationException.field(
          `transitions.${index}.from_status_id`,
          'Mỗi transition phải có from_status_id và to_status_id'
        )
      }
      if (!transition.to_status_id) {
        throw ValidationException.field(
          `transitions.${index}.to_status_id`,
          'Mỗi transition phải có from_status_id và to_status_id'
        )
      }
      if (transition.from_status_id === transition.to_status_id) {
        throw ValidationException.fields({
          [`transitions.${index}.from_status_id`]:
            'from_status_id và to_status_id không được trùng nhau',
          [`transitions.${index}.to_status_id`]:
            'from_status_id và to_status_id không được trùng nhau',
        })
      }
    }

    this.organization_id = data.organization_id
    this.project_id = data.project_id ?? null
    this.transitions = data.transitions.map((transition) => ({
      from_status_id: transition.from_status_id,
      to_status_id: transition.to_status_id,
      conditions: transition.conditions ?? {},
    }))
  }

  static fromTransitions(
    transitions: {
      from_status_id: string
      to_status_id: string
      conditions?: Record<string, unknown>
    }[],
    organizationId: string,
    projectId?: string | null
  ): UpdateWorkflowDTO {
    return new UpdateWorkflowDTO({
      organization_id: organizationId,
      project_id: projectId ?? null,
      transitions,
    })
  }
}
