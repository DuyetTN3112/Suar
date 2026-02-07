import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import type { UpdateMemberRoleDTO } from '../dtos/update_member_role_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'

interface MembershipRecord {
  user_id: number
  organization_id: number
  role_id: number
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
      throw new Error('Unauthorized')
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
        throw new Error('You are not a member of this organization')
      }

      // 2. Get target user's current membership
      const targetMembership = (await trx
        .from('organization_users')
        .where('organization_id', dto.organizationId)
        .where('user_id', dto.userId)
        .first()) as MembershipRecord | null

      if (!targetMembership) {
        throw new Error('Target user is not a member of this organization')
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
        throw new Error('User already has this role')
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
    currentUserRole: number,
    targetCurrentRole: number,
    targetNewRole: number,
    isSelfUpdate: boolean
  ): void {
    // Cannot change Owner's role (role_id = 1)
    if (targetCurrentRole === 1) {
      throw new Error('Cannot change the role of organization owner')
    }

    // Cannot promote to Owner
    if (targetNewRole === 1) {
      throw new Error('Cannot promote member to Owner. Use transfer ownership instead.')
    }

    // Users cannot change their own role
    if (isSelfUpdate) {
      throw new Error('You cannot change your own role')
    }

    // Only Owner (1) can update any role
    if (currentUserRole === 1) {
      return // Owner can do anything
    }

    // Admin (2) can only update roles >= 2
    if (currentUserRole === 2) {
      if (targetNewRole < 2) {
        throw new Error('Admins cannot promote members to Owner')
      }
      return // Valid admin action
    }

    // Other roles cannot update roles
    throw new Error('You do not have permission to update member roles')
  }

  /**
   * Helper: Get role name from role ID
   */
  // @ts-expect-error - Helper function for future use
  private _getRoleName(roleId: number): string {
    const roleNames: Record<number, string> = {
      1: 'Owner',
      2: 'Admin',
      3: 'Manager',
      4: 'Member',
      5: 'Viewer',
    }
    return roleNames[roleId] ?? 'Unknown'
  }

  /**
   * Helper: Send notification about role change
   */
  private async sendRoleChangedNotification(
    dto: UpdateMemberRoleDTO,
    oldRoleId: number
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
      console.error('[UpdateMemberRoleCommand] Failed to send notification:', error)
    }
  }
}
