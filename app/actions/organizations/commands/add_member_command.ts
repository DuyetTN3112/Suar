import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import OrganizationRoleModel from '#models/organization_role'
import { OrganizationRole } from '#constants/organization_constants'
import { EntityType } from '#constants/audit_constants'
import type { AddMemberDTO } from '../dtos/add_member_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import CacheService from '#services/cache_service'

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
      throw new Error('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Validate user exists
      const userToAdd = await User.find(dto.userId)
      if (!userToAdd) {
        throw new Error(`User with ID ${String(dto.userId)} not found`)
      }

      // 2. Check permissions (Owner or Admin)
      await this.checkPermissions(dto.organizationId, userId, trx)

      // 3. Validate role_id exists (FK validation)
      await this.validateRoleId(dto.roleId, trx)

      // 4. Check for duplicate membership
      await this.checkDuplicateMembership(dto.organizationId, dto.userId, trx)

      // 5. Add member to organization
      await trx.insertQuery().table('organization_users').insert({
        organization_id: dto.organizationId,
        user_id: dto.userId,
        role_id: dto.roleId,
        created_at: new Date(),
        updated_at: new Date(),
      })

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
            role_id: dto.roleId,
          },
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      await trx.commit()

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
   * Helper: Check if user has permission to add members
   * Only Owner or Admin can add members
   */
  private async checkPermissions(
    organizationId: number,
    userId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const membership: unknown = await trx
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .whereIn('role_id', [OrganizationRole.OWNER, OrganizationRole.ADMIN])
      .first()

    if (!membership) {
      throw new Error('You do not have permission to add members to this organization')
    }
  }

  /**
   * Helper: Check for duplicate membership
   */
  private async checkDuplicateMembership(
    organizationId: number,
    userId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const existingMembership: unknown = await trx
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .first()

    if (existingMembership) {
      throw new Error('User is already a member of this organization')
    }
  }

  /**
   * Helper: Validate role_id exists in organization_roles
   * (FK validation - organization_users.role_id -> organization_roles.id)
   */
  private async validateRoleId(roleId: number, trx: TransactionClientContract): Promise<void> {
    const role = await OrganizationRoleModel.query({ client: trx }).where('id', roleId).first()

    if (!role) {
      throw new Error(`Organization role with ID ${String(roleId)} does not exist`)
    }
  }

  /**
   * Helper: Send notification to added member
   */
  private async sendMemberAddedNotification(
    dto: AddMemberDTO,
    _addedByUserId: number
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
      console.error('[AddMemberCommand] Failed to send notification:', error)
    }
  }
}
