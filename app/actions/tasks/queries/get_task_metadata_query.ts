

import { DefaultTaskDependencies } from '../ports/task_external_dependencies_impl.js'

import GetTaskProjectsQuery from './get_task_projects_query.js'

import { TaskLabel, TaskPriority } from '#constants/task_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'


/**
 * Query để lấy metadata cho task forms
 *
 * Returns:
 * - Statuses: Tất cả trạng thái có thể
 * - Labels: Tất cả nhãn có thể
 * - Priorities: Tất cả mức độ ưu tiên
 * - Users: Users trong organization (cho assignment)
 * - Parent Tasks: Tasks có thể làm parent (không có parent, không bị xóa)
 *
 * Features:
 * - Redis caching (10 minutes)
 * - Filter users theo organization
 * - Only root tasks for parent selection
 */
export default class GetTaskMetadataQuery {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute query
   */
  async execute(organizationId?: DatabaseId): Promise<{
    statuses: {
      id: string
      value: string
      label: string
      slug: string
      category: string
      color?: string
      is_system: boolean
    }[]
    labels: { value: string; label: string }[]
    priorities: { value: string; label: string }[]
    users: { id: DatabaseId; username: string; email: string }[]
    parentTasks: { id: DatabaseId; title: string; task_status_id: string | null }[]
    availableSkills: { id: DatabaseId; name: string }[]
    projects: { id: DatabaseId; name: string }[]
  }> {
    // Get organization_id
    const orgId = (organizationId ?? this.execCtx.organizationId) as DatabaseId | undefined

    if (!orgId) {
      throw new BusinessLogicException('Organization ID là bắt buộc')
    }

    // Try cache first
    const cacheKey = `task:metadata:v2:org:${orgId}`
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    const statuses = await this.loadStatuses(orgId)
    const labels = this.loadLabels()
    const priorities = this.loadPriorities()

    // Load async metadata in parallel
    const [users, parentTasks, availableSkills, projects] = await Promise.all([
      this.loadUsers(orgId),
      this.loadParentTasks(orgId),
      this.loadAvailableSkills(),
      new GetTaskProjectsQuery().execute(orgId),
    ])

    const result = {
      statuses,
      labels,
      priorities,
      users,
      parentTasks,
      availableSkills,
      projects,
    }

    // Cache result
    await this.saveToCache(cacheKey, result, 600) // 10 minutes

    return result
  }

  /**
   * Load all task statuses — v3: static enum values
   */
  private async loadStatuses(organizationId: DatabaseId): Promise<
    {
      id: string
      value: string
      label: string
      slug: string
      category: string
      color?: string
      is_system: boolean
    }[]
  > {
    const statuses = await TaskStatusRepository.findByOrganization(organizationId)
    return statuses.map((status) => ({
      id: status.id,
      value: status.id,
      label: status.name,
      slug: status.slug,
      category: status.category,
      color: status.color,
      is_system: status.is_system,
    }))
  }

  /**
   * Load all task labels — v3: static enum values
   */
  private loadLabels(): { value: string; label: string }[] {
    return Object.values(TaskLabel).map((v) => ({ value: v, label: v }))
  }

  /**
   * Load all task priorities — v3: static enum values
   */
  private loadPriorities(): { value: string; label: string }[] {
    return Object.values(TaskPriority).map((v) => ({ value: v, label: v }))
  }

  /**
   * Load users in organization
   */
  private async loadUsers(
    organizationId: DatabaseId
  ): Promise<{ id: DatabaseId; username: string; email: string }[]> {
    return DefaultTaskDependencies.user.listUsersByOrganization(organizationId)
  }

  /**
   * Load potential parent tasks (root tasks only, not deleted)
   */
  private async loadParentTasks(
    organizationId: DatabaseId
  ): Promise<{ id: DatabaseId; title: string; task_status_id: string | null }[]> {
    const tasks = await TaskRepository.findRootTasksByOrganization(organizationId)

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      task_status_id: task.task_status_id,
    }))
  }

  /**
   * Load active skills used for task required-skills selection.
   */
  private async loadAvailableSkills(): Promise<{ id: DatabaseId; name: string }[]> {
    return DefaultTaskDependencies.skill.listActiveSkills()
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<{
    statuses: {
      id: string
      value: string
      label: string
      slug: string
      category: string
      color?: string
      is_system: boolean
    }[]
    labels: { value: string; label: string }[]
    priorities: { value: string; label: string }[]
    users: { id: DatabaseId; username: string; email: string }[]
    parentTasks: { id: DatabaseId; title: string; task_status_id: string | null }[]
    availableSkills: { id: DatabaseId; name: string }[]
    projects: { id: DatabaseId; name: string }[]
  } | null> {
    try {
      const cached = await CacheService.get<{
        statuses: {
          id: string
          value: string
          label: string
          slug: string
          category: string
          color?: string
          is_system: boolean
        }[]
        labels: { value: string; label: string }[]
        priorities: { value: string; label: string }[]
        users: { id: DatabaseId; username: string; email: string }[]
        parentTasks: { id: DatabaseId; title: string; task_status_id: string | null }[]
        availableSkills: { id: DatabaseId; name: string }[]
        projects: { id: DatabaseId; name: string }[]
      }>(key)
      if (cached) {
        return cached
      }
    } catch (error) {
      loggerService.error('[GetTaskMetadataQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      await CacheService.set(key, data, ttl)
    } catch (error) {
      loggerService.error('[GetTaskMetadataQuery] Cache set error:', error)
    }
  }
}
