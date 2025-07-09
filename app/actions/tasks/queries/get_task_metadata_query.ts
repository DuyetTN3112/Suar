import { TaskLabel, TaskPriority } from '#constants'
import UserRepository from '#infra/users/repositories/user_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import SkillRepository from '#infra/skills/repositories/skill_repository'
import GetTaskProjectsQuery from './get_task_projects_query.js'
import type { ExecutionContext } from '#types/execution_context'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import BusinessLogicException from '#exceptions/business_logic_exception'

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
    statuses: Array<{
      value: string
      label: string
      slug: string
      category: string
      color?: string
    }>
    labels: Array<{ value: string; label: string }>
    priorities: Array<{ value: string; label: string }>
    users: Array<{ id: DatabaseId; username: string; email: string }>
    parentTasks: Array<{ id: DatabaseId; title: string; task_status_id: string | null }>
    availableSkills: Array<{ id: DatabaseId; name: string }>
    projects: Array<{ id: DatabaseId; name: string }>
  }> {
    // Get organization_id
    const orgId = (organizationId || this.execCtx.organizationId) as DatabaseId | undefined

    if (!orgId) {
      throw new BusinessLogicException('Organization ID là bắt buộc')
    }

    // Try cache first
    const cacheKey = `task:metadata:v2:org:${orgId}`
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

      this.loadUsers(orgId),
      this.loadParentTasks(orgId),
    ])

    const result = {
      statuses,
      labels,
      priorities,
      users,
      parentTasks,
    }

    // Cache result
    await this.saveToCache(cacheKey, result, 600) // 10 minutes

    return result
  }

  /**
   * Load all task statuses
   */
  private async loadStatuses(): Promise<TaskStatus[]> {
    return await TaskStatus.query().orderBy('id', 'asc')
  }

  /**
   * Load all task labels
   */
  private async loadLabels(): Promise<TaskLabel[]> {
    return await TaskLabel.query().orderBy('name', 'asc')
  }

  /**
   * Load all task priorities
   */
  private async loadPriorities(): Promise<TaskPriority[]> {
    return await TaskPriority.query().orderBy('id', 'asc')
  }

  /**
   * Load users in organization
   */
  private async loadUsers(
    organizationId: number
  ): Promise<Array<{ id: number; name: string; email: string }>> {
    const users = await User.query()
      .select(['users.id', 'users.username', 'users.email'])
      .join('organization_users', 'users.id', 'organization_users.user_id')
      .where('organization_users.organization_id', organizationId)
      .whereNull('users.deleted_at')
      .orderBy('users.username', 'asc')

    return users.map((user) => ({
      id: user.id,
      name: user.username,
      email: user.email,
    }))
  }

  /**
   * Load potential parent tasks (root tasks only, not deleted)
   */
  private async loadParentTasks(
    organizationId: number
  ): Promise<Array<{ id: number; title: string; status_id: number }>> {
    const tasks = await Task.query()
      .select(['id', 'title', 'status_id'])
      .where('organization_id', organizationId)
      .whereNull('parent_task_id') // Only root tasks
      .whereNull('deleted_at')
      .orderBy('title', 'asc')
      .limit(100) // Limit to avoid huge lists

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status_id: task.status_id,
    }))
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<{
    statuses: TaskStatus[]
    labels: TaskLabel[]
    priorities: TaskPriority[]
    users: Array<{ id: number; name: string; email: string }>
    parentTasks: Array<{ id: number; title: string; status_id: number }>
  } | null> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        const parsed = JSON.parse(cached) as {
          statuses: TaskStatus[]
          labels: TaskLabel[]
          priorities: TaskPriority[]
          users: Array<{ id: number; name: string; email: string }>
          parentTasks: Array<{ id: number; title: string; status_id: number }>
        }
        return parsed
      }
    } catch (error) {
      console.error('[GetTaskMetadataQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      console.error('[GetTaskMetadataQuery] Cache set error:', error)
    }
  }
}
