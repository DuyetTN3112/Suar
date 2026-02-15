import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ConflictException from '#exceptions/conflict_exception'
import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import type { UpdateMemberRoleDTO } from '../dtos/update_member_role_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'

interface MembershipRecord {
  user_id: DatabaseId
  organization_id: DatabaseId
  role_id: DatabaseId
}

/**
 * Command: Update Member Role
 *
 * Pattern: Complex permission validation (learned from Projects module)
 * Business rules:
 * - Owner can update any role (except Owner)
 * - Admin can only update roles >= 2 (Admin, Manager, Member, Viewer)
 * - Cannot change Owner's role
 * - Cannot promote to Owner (use transfer ownership instead)
 * - Send notification on role change
 *
 * @example
 * const command = new UpdateMemberRoleCommand(ctx, createNotification)
 * await command.execute(dto)
 */
export default class UpdateMemberRoleCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command: Update member's role
   *
   * Steps:
   * 1. Check permissions
   * 2. Get current membership
   * 3. Validate role change is allowed
   * 4. Begin transaction
   * 5. Update role
   * 6. Create audit log
   * 7. Commit transaction
   * 8. Send notification
   */
  async execute(dto: UpdateMemberRoleDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const trx = await db.transaction()

    try {
      // 1. Get current user's membership and role
      const currentUserMembership = (await trx
        .from('organization_users')
        .where('organization_id', dto.organizationId)
        .where('user_id', userId)
        .first()) as MembershipRecord | null

      if (!currentUserMembership) {
        throw new ForbiddenException('Bạn không phải thành viên của tổ chức này')
      }

      // 2. Get target user's current membership
      const targetMembership = (await trx
        .from('organization_users')
        .where('organization_id', dto.organizationId)
        .where('user_id', dto.userId)
        .first()) as MembershipRecord | null

      if (!targetMembership) {
        throw new NotFoundException('Người dùng đích không phải thành viên của tổ chức này')
      }

      // 3. Validate role change is allowed
      this.validateRoleChange(
        currentUserMembership.role_id,
        targetMembership.role_id,
        dto.newRoleId,
        dto.userId === userId
      )

      // 4. Check if role is actually changing
      if (targetMembership.role_id === dto.newRoleId) {
        throw ConflictException.alreadyExists('Người dùng đã có vai trò này')
      }

      // 5. Store old role for audit
      const oldRole = targetMembership.role_id

      // 6. Update role
      await trx
        .from('organization_users')
        .where('organization_id', dto.organizationId)
        .where('user_id', dto.userId)
        .update({
          role_id: dto.newRoleId,
          updated_at: new Date(),
        })

      // 7. Create audit log
      await AuditLog.create(
        {
          user_id: userId,
          action: AuditAction.UPDATE_MEMBER_ROLE,
          entity_type: EntityType.ORGANIZATION,
          entity_id: dto.organizationId,
          old_values: { user_id: dto.userId, role_id: oldRole },
          new_values: { user_id: dto.userId, role_id: dto.newRoleId },
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      await trx.commit()

      // Emit domain event
      void emitter.emit('organization:member:role_changed', {
        organizationId: dto.organizationId,
        userId: dto.userId,
        oldRoleId: oldRole,
        newRoleId: dto.newRoleId,
        changedBy: userId,
      })

      // Invalidate organization member caches
      await CacheService.deleteByPattern(`organization:members:*`)

      // 8. Send notification
      await this.sendRoleChangedNotification(dto, oldRole)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Validate if role change is allowed
   */
  private validateRoleChange(
    currentUserRole: DatabaseId,
    targetCurrentRole: DatabaseId,
    targetNewRole: DatabaseId,
    isSelfUpdate: boolean
  ): void {
    // Cannot change Owner's role (role_id = 1)
    if (Number(targetCurrentRole) === 1) {
      throw new BusinessLogicException('Không thể thay đổi vai trò của owner tổ chức')
    }

    // Cannot promote to Owner
    if (Number(targetNewRole) === 1) {
      throw new BusinessLogicException('Không thể thăng cấp thành viên lên Owner. Hãy sử dụng chức năng chuyển giao quyền sở hữu.')
    }

    // Users cannot change their own role
    if (isSelfUpdate) {
      throw new BusinessLogicException('Bạn không thể thay đổi vai trò của chính mình')
    }

    // Only Owner (1) can update any role
    if (Number(currentUserRole) === 1) {
      return // Owner can do anything
    }

    // Admin (2) can only update roles >= 2
    if (Number(currentUserRole) === 2) {
      if (Number(targetNewRole) < 2) {
        throw new ForbiddenException('Admin không thể thăng cấp thành viên lên Owner')
      }
      return // Valid admin action
    }

    // Other roles cannot update roles
    throw new ForbiddenException('Bạn không có quyền thay đổi vai trò thành viên')
  }

  /**
   * Helper: Get role name from role ID
   */
  // @ts-expect-error - Helper function for future use
  private _getRoleName(roleId: DatabaseId): string {
    const roleNames: Record<string, string> = {
      '1': 'Owner',
      '2': 'Admin',
      '3': 'Manager',
      '4': 'Member',
      '5': 'Viewer',
    }
    return roleNames[String(roleId)] ?? 'Unknown'
  }

  /**
   * Helper: Send notification about role change
   */
  private async sendRoleChangedNotification(
    dto: UpdateMemberRoleDTO,
    oldRoleId: DatabaseId
  ): Promise<void> {
    try {
      const actionType = dto.getActionType(oldRoleId)
      const actionVerb = actionType === 'promotion' ? 'được thăng chức' : 'được chuyển vai trò'

      await this.createNotification.handle({
        user_id: dto.userId,
        title: 'Vai trò đã thay đổi',
        message: `Bạn ${actionVerb} thành ${dto.getRoleNameVi()} trong tổ chức`,
        type: 'role_changed',
        related_entity_type: 'organization',
        related_entity_id: dto.organizationId,
      })
    } catch (error) {
      loggerService.error('[UpdateMemberRoleCommand] Failed to send notification:', error)
    }
  }
}
