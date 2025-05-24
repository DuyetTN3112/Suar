import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import GetTaskDetailDTO from '../dtos/get_task_detail_dto.js'
import type { HttpContext } from '@adonisjs/core/http'
import redis from '@adonisjs/redis/services/main'
import db from '@adonisjs/lucid/services/db'

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
    auditLogs?: any[]
  }> {
    const user = this.ctx.auth.user
    if (!user) {
      throw new Error('User chưa đăng nhập')
    }

    // Try cache first (if not minimal load)
    if (!dto.isMinimalLoad()) {
      const cacheKey = dto.getCacheKey()
      const cached = await this.getFromCache(cacheKey)
      if (cached) {
        return cached
      }
    }

    // Load task
    const task = await Task.query().where('id', dto.task_id).whereNull('deleted_at').firstOrFail()

    // Check permission
    await this.validateViewPermission(user, task)

    // Load basic relations (always)
    await task.load((loader: any) => {
      loader
        .load('status')
        .load('label')
        .load('priority')
        .load('assignee', (q: any) => {
          q.select(['id', 'first_name', 'last_name', 'full_name', 'email'])
        })
        .load('creator', (q: any) => {
          q.select(['id', 'first_name', 'last_name', 'full_name'])
        })
        .load('updater', (q: any) => {
          q.select(['id', 'first_name', 'last_name', 'full_name'])
        })
        .load('organization')
        .load('project')
        .load('parentTask', (q: any) => {
          q.select(['id', 'title', 'status_id']).preload('status')
        })
    })

    // Load optional relations
    if (dto.shouldLoadChildTasks()) {
      await task.load('childTasks', (childQuery: any) => {
        childQuery
          .whereNull('deleted_at')
          .preload('status')
          .preload('assignee', (q: any) => {
            q.select(['id', 'first_name', 'last_name', 'full_name'])
          })
      })
    }

    if (dto.shouldLoadVersions()) {
      await task.load('versions', (versionQuery: any) => {
        versionQuery.orderBy('changed_at', 'desc').limit(20)
      })
    }

    // Calculate permissions
    const permissions = await this.calculatePermissions(user, task)

    // Load audit logs if requested
    let auditLogs: any[] | undefined
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
   * Validate view permission
   */
  private async validateViewPermission(user: User, task: Task): Promise<void> {
    // Load user role
    await user.load('role')

    // Admin/Superadmin can view all
    const isSuperAdmin = ['superadmin', 'admin'].includes(user.role?.name?.toLowerCase() || '')
    if (isSuperAdmin) {
      return
    }

    // Creator can view
    if (Number(task.creator_id) === Number(user.id)) {
      return
    }

    // Assignee can view
    if (task.assigned_to && Number(task.assigned_to) === Number(user.id)) {
      return
    }

    // Check organization role
    const orgUser = await db
      .from('organization_users')
      .where('organization_id', task.organization_id)
      .where('user_id', user.id)
      .first()

    if (orgUser && [1, 2].includes(orgUser.role_id)) {
      return
    }

    throw new Error('Bạn không có quyền xem task này')
  }

  /**
   * Calculate permissions for current user
   */
  private async calculatePermissions(
    user: User,
    task: Task
  ): Promise<{
    isCreator: boolean
    isAssignee: boolean
    canEdit: boolean
    canDelete: boolean
    canAssign: boolean
  }> {
    await user.load('role')

    const isCreator = Number(task.creator_id) === Number(user.id)
    const isAssignee = task.assigned_to && Number(task.assigned_to) === Number(user.id)
    const isSuperAdmin = ['superadmin', 'admin'].includes(user.role?.name?.toLowerCase() || '')

    // Check org role
    const orgUser = await db
      .from('organization_users')
      .where('organization_id', task.organization_id)
      .where('user_id', user.id)
      .first()

    const isOrgOwnerOrManager = orgUser && [1, 2].includes(orgUser.role_id)

    // Permissions
    const canEdit = Boolean(isSuperAdmin || isCreator || isAssignee || isOrgOwnerOrManager)
    const canDelete = Boolean(isSuperAdmin || isCreator || isOrgOwnerOrManager)
    const canAssign = Boolean(isSuperAdmin || isCreator || isAssignee || isOrgOwnerOrManager)

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
  private async loadAuditLogs(taskId: number, limit: number): Promise<any[]> {
    const logs = await AuditLog.query()
      .where('entity_type', 'task')
      .where('entity_id', taskId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .preload('user', (userQuery: any) => {
        userQuery.select(['id', 'first_name', 'last_name', 'full_name', 'email'])
      })

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.full_name || `${log.user.first_name} ${log.user.last_name}`.trim(),
            email: log.user.email,
          }
        : null,
      timestamp: log.created_at,
      changes: this.formatChanges(log.old_values || {}, log.new_values || {}),
    }))
  }

  /**
   * Format changes for audit log
   */
  private formatChanges(
    oldValues: Record<string, any>,
    newValues: Record<string, any>
  ): Array<{ field: string; oldValue: any; newValue: any }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = []

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
  private async getFromCache(key: string): Promise<any> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      console.error('[GetTaskDetailQuery] Cache get error:', error)
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
      console.error('[GetTaskDetailQuery] Cache set error:', error)
    }
  }
}
