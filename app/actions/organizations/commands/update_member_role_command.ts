import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'
import ConflictException from '#exceptions/conflict_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/mongo/audit_log'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import type { UpdateMemberRoleDTO } from '../dtos/update_member_role_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import { enforcePolicy } from '#actions/shared/rules/enforce_policy'
import { canChangeRole } from '#actions/organizations/rules/org_permission_policy'

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
      // 1. Get current user's role → delegate to Model

      const currentUserRoleId = await OrganizationUserRepository.getMemberRoleName(dto.organizationId, userId, trx, false)
      if (!currentUserRoleId) {
        throw new ForbiddenException('Bạn không phải thành viên của tổ chức này')
      }

      // 2. Get target user's current role → delegate to Model

      const targetRoleId = await OrganizationUserRepository.getMemberRoleName(dto.organizationId, dto.userId, trx, false)
      if (!targetRoleId) {
        throw new NotFoundException('Người dùng đích không phải thành viên của tổ chức này')
      }

      // 3. Validate role change is allowed
      enforcePolicy(
        canChangeRole({
          actorOrgRole: currentUserRoleId,
          targetCurrentRole: targetRoleId,
          targetNewRole: dto.newRoleId,
          isSelfUpdate: dto.userId === userId,
        })
      )

      // 4. Check if role is actually changing
      if (targetRoleId === dto.newRoleId) {
        throw ConflictException.alreadyExists('Người dùng đã có vai trò này')
      }

      // 5. Store old role for audit
      const oldRole: string = targetRoleId

      // 6. Update role → delegate to Model
      await OrganizationUserRepository.updateRole(dto.organizationId, dto.userId, dto.newRoleId, trx)

      // 7. Create audit log
      await AuditLog.create({
        user_id: userId,
        action: AuditAction.UPDATE_MEMBER_ROLE,
        entity_type: EntityType.ORGANIZATION,
        entity_id: dto.organizationId,
        old_values: { user_id: dto.userId, org_role: oldRole },
        new_values: { user_id: dto.userId, org_role: dto.newRoleId },
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
      })

      await trx.commit()

      // Emit domain event
      void emitter.emit('organization:member:role_changed', {
        organizationId: dto.organizationId,
        userId: dto.userId,
        oldRole: oldRole,
        newRole: dto.newRoleId,
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
   * Helper: Send notification about role change
   */
  private async sendRoleChangedNotification(
    dto: UpdateMemberRoleDTO,
    oldRole: string
  ): Promise<void> {
    try {
      const actionType = dto.getActionType(oldRole)
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
