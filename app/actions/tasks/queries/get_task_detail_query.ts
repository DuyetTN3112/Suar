import Task from '#models/task'
import UserRepository from '#repositories/user_repository'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import TaskRepository from '#repositories/task_repository'
import RepositoryFactory from '#repositories/repository_factory'
import type GetTaskDetailDTO from '../dtos/get_task_detail_dto.js'
import type { ExecutionContext } from '#types/execution_context'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import { OrganizationRole } from '#constants/organization_constants'

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
  constructor(protected execCtx: ExecutionContext) {}

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
    const userId = this.execCtx.userId
    if (!userId) {
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

    // Load task với basic relations (v3: status/label/priority are inline columns)
    const task = await TaskRepository.findByIdWithDetailRelations(dto.task_id)

    // Fetch user role data ONCE (avoid duplicate queries for permission check + permissions calc)
    const userRoleData = await this.fetchUserRoleData(userId, task.organization_id)

    // Check permission
    this.validateViewPermission(userId, task, userRoleData)

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
    const permissions = this.calculatePermissionsSync(userId, task, userRoleData)

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
   * Fetch user role data once (system role + org membership) → delegate to Model
   * Avoids duplicate queries in validateViewPermission + calculatePermissions
   */
  private async fetchUserRoleData(
    userId: DatabaseId,
    organizationId: DatabaseId | null
  ): Promise<{
    roleName: string | null
    isSuperAdmin: boolean
    orgUser: { org_role: string } | null
  }> {
    // Check system admin → delegate to Model
    const isSuperAdmin = await UserRepository.isSystemAdmin(userId)
    const roleName = isSuperAdmin ? 'admin' : null

    // Query org membership → delegate to Model
    let orgUser: { org_role: string } | null = null
    if (organizationId) {
      const orgRole = await OrganizationUserRepository.getMemberRoleName(organizationId, userId, undefined, false)
      if (orgRole) {
        orgUser = { org_role: String(orgRole) }
      }
    }

    return { roleName, isSuperAdmin, orgUser }
  }

  /**
   * Validate view permission (synchronous - uses pre-fetched role data)
   */
  private validateViewPermission(
    userId: DatabaseId,
    task: Task,
    roleData: { isSuperAdmin: boolean; orgUser: { org_role: string } | null }
  ): void {
    // Admin/Superadmin can view all
    if (roleData.isSuperAdmin) {
      return
    }

    // Creator can view
    if (task.creator_id === userId) {
      return
    }

    // Assignee can view
    if (task.assigned_to && task.assigned_to === userId) {
      return
    }

    // Check organization role (Owner/Admin)
    if (
      roleData.orgUser &&
      [OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(
        roleData.orgUser.org_role as OrganizationRole
      )
    ) {
      return
    }

    throw new ForbiddenException('Bạn không có quyền xem task này')
  }

  /**
   * Calculate permissions (synchronous - uses pre-fetched role data)
   */
  private calculatePermissionsSync(
    userId: DatabaseId,
    task: Task,
    roleData: { isSuperAdmin: boolean; orgUser: { org_role: string } | null }
  ): {
    isCreator: boolean
    isAssignee: boolean
    canEdit: boolean
    canDelete: boolean
    canAssign: boolean
  } {
    const isCreator = task.creator_id === userId
    const isAssignee = task.assigned_to && task.assigned_to === userId
    const isOrgOwnerOrAdmin =
      roleData.orgUser &&
      [OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(
        roleData.orgUser.org_role as OrganizationRole
      )

    const canEdit = Boolean(roleData.isSuperAdmin || isCreator || isAssignee || isOrgOwnerOrAdmin)
    const canDelete = Boolean(roleData.isSuperAdmin || isCreator || isOrgOwnerOrAdmin)
    const canAssign = Boolean(roleData.isSuperAdmin || isCreator || isAssignee || isOrgOwnerOrAdmin)

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
    const auditRepo = await RepositoryFactory.getAuditLogRepository()
    const { data: logs } = await auditRepo.findMany({
      entity_type: 'task',
      entity_id: taskId,
      limit,
    })

    // Load users from PostgreSQL
    const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))] as string[]
    const users = await UserRepository.findByIds(userIds, ['id', 'username', 'email'])
    const userMap = new Map(users.map((u) => [String(u.id), u]))

    return logs.map((log) => {
      const user = userMap.get(String(log.user_id))
      return {
        id: log.id,
        action: log.action,
        user: user
          ? {
              id: user.id,
              name: user.username || 'Unknown',
              email: user.email ?? '',
            }
          : null,
        timestamp: log.created_at,
        changes: this.formatChanges(
          log.old_values ?? {},
          log.new_values ?? {}
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
