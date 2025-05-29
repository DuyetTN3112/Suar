import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import OrganizationRole from '#models/organization_role'
import type { AddMemberDTO } from '../dtos/add_member_dto.js'
import type CreateNotification from '#actions/common/create_notification'

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
    protected ctx: HttpContext,
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
    const currentUser = this.ctx.auth.user!
    const trx = await db.transaction()

    try {
      // 1. Validate user exists
      const userToAdd = await User.find(dto.userId)
      if (!userToAdd) {
        throw new Error(`User with ID ${dto.userId} not found`)
      }

      // 2. Check permissions (Owner or Admin)
      await this.checkPermissions(dto.organizationId, currentUser.id, trx)

      // 3. Validate role_id exists (FK validation)
      await this.validateRoleId(dto.roleId, trx)

      // 4. Check for duplicate membership
      await this.checkDuplicateMembership(dto.organizationId, dto.userId, trx)

      // 5. Add member to organization
      await db.table('organization_users').useTransaction(trx).insert({
        organization_id: dto.organizationId,
        user_id: dto.userId,
        role_id: dto.roleId,
        created_at: new Date(),
        updated_at: new Date(),
      })

      // 6. Create audit log
      await AuditLog.create(
        {
          user_id: currentUser.id,
          action: 'add_member',
          entity_type: 'organization',
          entity_id: dto.organizationId,
          new_values: {
            ...dto.toObject(),
            added_user_id: dto.userId,
            role: dto.getRoleName(),
            role_id: dto.roleId,
          },
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent') || '',
        },
        { client: trx }
      )

      await trx.commit()

      // 7. Send notification (outside transaction)
      await this.sendMemberAddedNotification(dto, currentUser.id)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Check if user has permission to add members
   * Only Owner (role_id = 1) or Admin (role_id = 2) can add members
   */
  private async checkPermissions(
    organizationId: number,
    userId: number,
    trx: unknown
  ): Promise<void> {
    const membership = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .whereIn('role_id', [1, 2]) // Owner or Admin
      .useTransaction(trx as any)
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
    trx: unknown
  ): Promise<void> {
    const existingMembership = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .useTransaction(trx as any)
      .first()

    if (existingMembership) {
      throw new Error('User is already a member of this organization')
    }
  }

  /**
   * Helper: Validate role_id exists in organization_roles
   * (FK validation - organization_users.role_id -> organization_roles.id)
   */
  private async validateRoleId(roleId: number, trx: unknown): Promise<void> {
    const role = await OrganizationRole.query({ client: trx as any })
      .where('id', roleId)
      .first()

    if (!role) {
      throw new Error(`Organization role with ID ${roleId} does not exist`)
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
