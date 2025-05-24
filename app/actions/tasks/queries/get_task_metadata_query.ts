import TaskStatus from '#models/task_status'
import TaskLabel from '#models/task_label'
import TaskPriority from '#models/task_priority'
import User from '#models/user'
import Task from '#models/task'
import type { HttpContext } from '@adonisjs/core/http'
import redis from '@adonisjs/redis/services/main'

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
  constructor(protected ctx: HttpContext) {}

  /**
   * Execute query
   */
  async execute(organizationId?: number): Promise<{
    statuses: TaskStatus[]
    labels: TaskLabel[]
    priorities: TaskPriority[]
    users: Array<{ id: number; name: string; email: string }>
    parentTasks: Array<{ id: number; title: string; status_id: number }>
  }> {
    // Get organization_id
    const orgId = organizationId || this.ctx.session.get('current_organization_id')

    if (!orgId) {
      throw new Error('Organization ID là bắt buộc')
    }

    // Try cache first
    const cacheKey = `task:metadata:org:${orgId}`
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Load all metadata in parallel
    const [statuses, labels, priorities, users, parentTasks] = await Promise.all([
      this.loadStatuses(),
      this.loadLabels(),
      this.loadPriorities(),
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
  private async getFromCache(key: string): Promise<any> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      console.error('[GetTaskMetadataQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: any, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      console.error('[GetTaskMetadataQuery] Cache set error:', error)
    }
  }
}
