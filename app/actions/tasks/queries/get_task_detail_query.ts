import Task from '#models/task'
import type User from '#models/user'
import AuditLog from '#models/audit_log'
import type GetTaskDetailDTO from '../dtos/get_task_detail_dto.js'
import type { HttpContext } from '@adonisjs/core/http'
import redis from '@adonisjs/redis/services/main'
import db from '@adonisjs/lucid/services/db'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'

/**
 * Query để lấy chi tiết một task
 *
 * Features:
 * - Load full task với all relations
 * - Optional: versions, childTasks, auditLogs
 * - Permission check (Admin hoặc Assignee)
 * - Redis caching (5 minutes)
 * - Permissions object (isCreator, canEdit, canDelete, etc.)
 *
 * Permissions:
 * - Admin/Superadmin: Xem tất cả
 * - Assignee: Xem task được assign
 * - Creator: Xem task đã tạo
 * - Org Owner/Manager: Xem tasks trong org
 */
export default class GetTaskDetailQuery {
  constructor(protected ctx: HttpContext) {}

  /**
   * Execute query
   */
  async execute(dto: GetTaskDetailDTO): Promise<{
    task: Task
    permissions: {
      isCreator: boolean
      isAssignee: boolean
      canEdit: boolean
      canDelete: boolean
      canAssign: boolean
    }
    auditLogs?: unknown[]
  }> {
    const user = this.ctx.auth.user
    if (!user) {
      throw new UnauthorizedException()
    }

    // Try cache first (if not minimal load)
    if (!dto.isMinimalLoad()) {
      const cacheKey = dto.getCacheKey()
      const cached = await this.getFromCache(cacheKey)
      if (cached) {
        return cached
      }
    }

    // Load task với basic relations (preload batch để tránh N+1)
    const task = await Task.query()
      .where('id', dto.task_id)
      .whereNull('deleted_at')
      .preload('status')
      .preload('label')
      .preload('priority')
      .preload('assignee')
      .preload('creator')
      .preload('updater')
      .preload('organization')
      .preload('project')
      .preload('parentTask')
      .firstOrFail()

    // Fetch user role data ONCE (avoid duplicate queries for permission check + permissions calc)
    const userRoleData = await this.fetchUserRoleData(user.id, task.organization_id)

    // Check permission
    this.validateViewPermission(user, task, userRoleData)

    // Load optional relations (batch load)
    const optionalLoads: string[] = []
    if (dto.shouldLoadChildTasks()) optionalLoads.push('childTasks')
    if (dto.shouldLoadVersions()) optionalLoads.push('versions')

    if (optionalLoads.length > 0) {
      await task.load((loader) => {
        for (const rel of optionalLoads) {
          loader.load(rel as any)
        }
      })
    }

    // Calculate permissions (reuse fetched role data)
    const permissions = this.calculatePermissionsSync(user, task, userRoleData)

    // Load audit logs if requested
    let auditLogs: unknown[] | undefined
    if (dto.shouldLoadAuditLogs()) {
      auditLogs = await this.loadAuditLogs(task.id, dto.audit_logs_limit)
    }

    const result = {
      task,
      permissions,
      auditLogs,
    }

    // Cache result (if not minimal)
    if (!dto.isMinimalLoad()) {
      const cacheKey = dto.getCacheKey()
      await this.saveToCache(cacheKey, result, 300) // 5 minutes
    }

    return result
  }

  /**
   * Fetch user role data once (system role + org membership)
   * Avoids duplicate queries in validateViewPermission + calculatePermissions
   */
  private async fetchUserRoleData(
    userId: DatabaseId,
    organizationId: DatabaseId | null
  ): Promise<{
    roleName: string | null
    isSuperAdmin: boolean
    orgUser: { role_id: number } | null
  }> {
    // Query system role
    const userData = (await db
      .from('users')
      .join('system_roles', 'users.system_role_id', 'system_roles.id')
      .where('users.id', userId)
      .select('system_roles.name as role_name')
      .first()) as { role_name?: string } | null

    const roleName = userData?.role_name?.toLowerCase() || null
    const isSuperAdmin = ['superadmin', 'admin'].includes(roleName || '')

    // Query org membership
    let orgUser: { role_id: number } | null = null
    if (organizationId) {
      orgUser = (await db
        .from('organization_users')
        .where('organization_id', organizationId)
        .where('user_id', userId)
        .first()) as { role_id: number } | null
    }

    return { roleName, isSuperAdmin, orgUser }
  }

  /**
   * Validate view permission (synchronous - uses pre-fetched role data)
   */
  private validateViewPermission(
    user: User,
    task: Task,
    roleData: { isSuperAdmin: boolean; orgUser: { role_id: number } | null }
  ): void {
    // Admin/Superadmin can view all
    if (roleData.isSuperAdmin) {
      return
    }

    // Creator can view
    if (task.creator_id === user.id) {
      return
    }

    // Assignee can view
    if (task.assigned_to && task.assigned_to === user.id) {
      return
    }

    // Check organization role (Owner/Manager)
    if (roleData.orgUser && [1, 2].includes(roleData.orgUser.role_id)) {
      return
    }

    throw new ForbiddenException('Bạn không có quyền xem task này')
  }

  /**
   * Calculate permissions (synchronous - uses pre-fetched role data)
   */
  private calculatePermissionsSync(
    user: User,
    task: Task,
    roleData: { isSuperAdmin: boolean; orgUser: { role_id: number } | null }
  ): {
    isCreator: boolean
    isAssignee: boolean
    canEdit: boolean
    canDelete: boolean
    canAssign: boolean
  } {
    const isCreator = task.creator_id === user.id
    const isAssignee = task.assigned_to && task.assigned_to === user.id
    const isOrgOwnerOrManager = roleData.orgUser && [1, 2].includes(roleData.orgUser.role_id)

    const canEdit = Boolean(roleData.isSuperAdmin || isCreator || isAssignee || isOrgOwnerOrManager)
    const canDelete = Boolean(roleData.isSuperAdmin || isCreator || isOrgOwnerOrManager)
    const canAssign = Boolean(
      roleData.isSuperAdmin || isCreator || isAssignee || isOrgOwnerOrManager
    )

    return {
      isCreator,
      isAssignee: !!isAssignee,
      canEdit,
      canDelete,
      canAssign,
    }
  }

  /**
   * Load audit logs
   */
  private async loadAuditLogs(taskId: DatabaseId, limit: number): Promise<unknown[]> {
    const logs = await AuditLog.query()
      .where('entity_type', 'task')
      .where('entity_id', taskId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .preload('user')

    return logs.map((log) => {
      return {
        id: log.id,
        action: log.action,
        user: {
          id: log.user.id,
          name: log.user.username,
          email: log.user.email,
        },
        timestamp: log.created_at,
        changes: this.formatChanges(
          (log.old_values ?? {}) as Record<string, unknown>,
          (log.new_values ?? {}) as Record<string, unknown>
        ),
      }
    })
  }

  /**
   * Format changes for audit log
   */
  private formatChanges(
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>
  ): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = []

    for (const key in newValues) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changes.push({
          field: key,
          oldValue: oldValues[key],
          newValue: newValues[key],
        })
      }
    }

    return changes
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<{
    task: Task
    permissions: {
      isCreator: boolean
      isAssignee: boolean
      canEdit: boolean
      canDelete: boolean
      canAssign: boolean
    }
    auditLogs?: unknown[]
  } | null> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        const parsed = JSON.parse(cached) as {
          task: Task
          permissions: {
            isCreator: boolean
            isAssignee: boolean
            canEdit: boolean
            canDelete: boolean
            canAssign: boolean
          }
          auditLogs?: unknown[]
        }
        return parsed
      }
    } catch (error) {
      loggerService.error('[GetTaskDetailQuery] Cache get error:', error)
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
      loggerService.error('[GetTaskDetailQuery] Cache set error:', error)
    }
  }
}
