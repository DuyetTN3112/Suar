import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import { OrganizationRole } from '#constants'
import OrganizationUser from '#models/organization_user'
import { EntityType } from '#constants/audit_constants'
import type { AddMemberDTO } from '../dtos/add_member_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import ConflictException from '#exceptions/conflict_exception'

/**
 * Command: Add Member to Organization
 *
 * Pattern: Permission check with notification (learned from Projects module)
 * Business rules:
 * - Only Owner (role_id = 1) or Admin (role_id = 2) can add members
 * - Cannot add member as Owner (role_id = 1)
 * - Check for duplicate membership
 * - Send notification to added member
 *
 * @example
 * const command = new AddMemberCommand(ctx, createNotification)
 * await command.execute(dto)
 */
export default class AddMemberCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command: Add member to organization
   *
   * Steps:
   * 1. Validate user exists
   * 2. Check permissions (Owner or Admin)
   * 3. Check for duplicate membership
   * 4. Begin transaction
   * 5. Add member to organization_users
   * 6. Create audit log
   * 7. Commit transaction
   * 8. Send notification (outside transaction)
   */
  async execute(dto: AddMemberDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Validate user exists
      const userToAdd = await User.find(dto.userId)
      if (!userToAdd) {
        throw new BusinessLogicException(`User with ID ${String(dto.userId)} not found`)
      }

      // 2. Check permissions (Owner or Admin)
      const isAdminOrOwner = await OrganizationUser.isOrgAdminOrOwner(
        userId,
        dto.organizationId,
        trx
      )
      if (!isAdminOrOwner) {
        throw new ForbiddenException(
          'You do not have permission to add members to this organization'
        )
      }

      // 3. v3: Validate org_role is a valid OrganizationRole constant
      const validRoles = Object.values(OrganizationRole) as string[]
      if (!validRoles.includes(String(dto.roleId))) {
        throw new BusinessLogicException(`Vai trò không hợp lệ: ${String(dto.roleId)}`)
      }

      // 4. Check for duplicate membership
      const alreadyMember = await OrganizationUser.hasMembership(
        dto.organizationId,
        dto.userId,
        trx
      )
      if (alreadyMember) {
        throw new ConflictException('User is already a member of this organization')
      }

      // 5. Add member to organization → delegate to Model
      await OrganizationUser.addMember(
        {
          organization_id: dto.organizationId,
          user_id: dto.userId,
          org_role: String(dto.roleId),
        },
        trx
      )

      // 6. Create audit log
      await AuditLog.create(
        {
          user_id: userId,
          action: 'add_member',
          entity_type: EntityType.ORGANIZATION,
          entity_id: dto.organizationId,
          new_values: {
            ...dto.toObject(),
            added_user_id: dto.userId,
            role: dto.getRoleName(),
            org_role: dto.roleId,
          },
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      await trx.commit()

      // Emit domain event
      void emitter.emit('organization:member:added', {
        organizationId: dto.organizationId,
        userId: dto.userId,
        org_role: dto.roleId,
        invitedBy: userId,
      })

      // Invalidate organization member caches
      await CacheService.deleteByPattern(`organization:members:*`)
      await CacheService.deleteByPattern(`organization:metadata:*`)

      // 7. Send notification (outside transaction)
      await this.sendMemberAddedNotification(dto, userId)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Send notification to added member
   */
  private async sendMemberAddedNotification(
    dto: AddMemberDTO,
    _addedByUserId: DatabaseId
  ): Promise<void> {
    try {
      await this.createNotification.handle({
        user_id: dto.userId,
        title: 'Được thêm vào tổ chức',
        message: `Bạn đã được thêm vào tổ chức với vai trò ${dto.getRoleNameVi()}`,
        type: 'member_added',
        related_entity_type: 'organization',
        related_entity_id: dto.organizationId,
      })
    } catch (error) {
      loggerService.error('[AddMemberCommand] Failed to send notification:', error)
    }
  }
}
