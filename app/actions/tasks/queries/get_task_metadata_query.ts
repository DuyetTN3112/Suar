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
    statuses: Array<{ value: string; label: string }>
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
    const cacheKey = `task:metadata:org:${orgId}`
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
  private async loadStatuses(
    organizationId: DatabaseId
  ): Promise<Array<{ value: string; label: string }>> {
    const statuses = await TaskStatusRepository.findByOrganization(organizationId)
    return statuses.map((status) => ({ value: status.id, label: status.name }))
  }

  /**
   * Load all task labels — v3: static enum values
   */
  private loadLabels(): Array<{ value: string; label: string }> {
    return Object.values(TaskLabel).map((v) => ({ value: v, label: v }))
  }

  /**
   * Load all task priorities — v3: static enum values
   */
  private loadPriorities(): Array<{ value: string; label: string }> {
    return Object.values(TaskPriority).map((v) => ({ value: v, label: v }))
  }

  /**
   * Load users in organization
   */
  private async loadUsers(
    organizationId: DatabaseId
  ): Promise<Array<{ id: DatabaseId; username: string; email: string }>> {
    const users = await UserRepository.findByOrganization(organizationId)

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email ?? '',
    }))
  }

  /**
   * Load potential parent tasks (root tasks only, not deleted)
   */
  private async loadParentTasks(
    organizationId: DatabaseId
  ): Promise<Array<{ id: DatabaseId; title: string; task_status_id: string | null }>> {
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
  private async loadAvailableSkills(): Promise<Array<{ id: DatabaseId; name: string }>> {
    const skills = await SkillRepository.activeSkills()
    return skills.map((skill) => ({
      id: skill.id,
      name: skill.skill_name,
    }))
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<{
    statuses: Array<{ value: string; label: string }>
    labels: Array<{ value: string; label: string }>
    priorities: Array<{ value: string; label: string }>
    users: Array<{ id: DatabaseId; username: string; email: string }>
    parentTasks: Array<{ id: DatabaseId; title: string; task_status_id: string | null }>
    availableSkills: Array<{ id: DatabaseId; name: string }>
    projects: Array<{ id: DatabaseId; name: string }>
  } | null> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        const parsed = JSON.parse(cached) as {
          statuses: Array<{ value: string; label: string }>
          labels: Array<{ value: string; label: string }>
          priorities: Array<{ value: string; label: string }>
          users: Array<{ id: DatabaseId; username: string; email: string }>
          parentTasks: Array<{ id: DatabaseId; title: string; task_status_id: string | null }>
          availableSkills: Array<{ id: DatabaseId; name: string }>
          projects: Array<{ id: DatabaseId; name: string }>
        }
        return parsed
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
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      loggerService.error('[GetTaskMetadataQuery] Cache set error:', error)
    }
  }
}
