/**
 * Types và interfaces cho chức năng list tasks
 */

import Task from '#models/task'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

export interface FilterOptions {
  page?: number
  limit?: number
  status?: string | string[]
  priority?: string | string[]
  label?: string | string[]
  search?: string
  assigned_to?: number
  parent_task_id?: number
  organization_id?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    first_page: number
    next_page_url: string | null
    previous_page_url: string | null
  }
  message?: string
}

// Tự định nghĩa kiểu cho phù hợp
export interface SimplePaginatorContract<T> {
  all(): T[]
  first(): T | null
  last(): T | null
  getMeta(): {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export type TaskPaginator = SimplePaginatorContract<Task>

export interface AuthUser {
  id: number
  full_name?: string
  role?: {
    name: string
  }
  load(relation: string): Promise<void>
}
