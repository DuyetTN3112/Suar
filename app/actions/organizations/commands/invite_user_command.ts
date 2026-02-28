import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import Organization from '#models/organization'
import OrganizationUser from '#models/organization_user'
import OrganizationInvitation from '#models/organization_invitation'
import { AuditAction, EntityType } from '#constants/audit_constants'
import type { InviteUserDTO } from '../dtos/invite_user_dto.js'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import ConflictException from '#exceptions/conflict_exception'

/**
 * Command: Invite User to Organization
 *
 * Pattern: Invitation record creation (without email)
 * Business rules:
 * - Only Owner (role_id = 1) or Admin (role_id = 2) can send invites
 * - Generate unique token for invitation
 * - Token expires in 7 days
 *
 * @example
 * const command = new InviteUserCommand(ctx)
 * await command.execute(dto)
 */
export default class InviteUserCommand {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute command: Invite user to organization
   *
   * Steps:
   * 1. Check permissions
   * 2. Check for duplicate invitations
   * 3. Begin transaction
   * 4. Create invitation record
   * 5. Create audit log
   * 6. Commit transaction
   */
  async execute(dto: InviteUserDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const trx = await db.transaction()

    try {
      // 1. Check permissions (Owner or Admin)
      await this.checkPermissions(dto.organizationId, userId, trx)

      // 2. Check for duplicate active invitations
      await this.checkDuplicateInvitation(dto, trx)

      // 3. Get organization details
      const organization = await Organization.find(dto.organizationId)
      if (!organization) {
        throw NotFoundException.resource('Tổ chức', dto.organizationId)
      }

      // 4. Create invitation record via Model
      const invitationData = dto.toObject()
      const invitation = await OrganizationInvitation.createInvitation(
        {
          ...invitationData,
          organization_id: dto.organizationId,
          email: dto.getNormalizedEmail(),
          invited_by: userId,
        },
        trx
      )

      // 5. Create audit log
      await AuditLog.create(
        {
          user_id: userId,
          action: AuditAction.INVITE,
          entity_type: EntityType.ORGANIZATION,
          entity_id: dto.organizationId,
          new_values: {
            email: dto.getNormalizedEmail(),
            role: dto.getRoleName(),
            invitation_id: invitation.id,
          },
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Check if user has permission to send invitations
   */
  private async checkPermissions(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    const hasPermission = await OrganizationUser.isAdminOrOwnerByRoleId(userId, organizationId, trx)
    if (!hasPermission) {
      throw new ForbiddenException('Bạn không có quyền gửi lời mời cho tổ chức này')
    }
  }

  /**
   * Helper: Check for duplicate active invitations
   */
  private async checkDuplicateInvitation(
    dto: InviteUserDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    const hasPending = await OrganizationInvitation.hasPendingInvitation(
      dto.organizationId,
      dto.getNormalizedEmail(),
      trx
    )
    if (hasPending) {
      throw ConflictException.alreadyExists('Lời mời cho email này đã tồn tại và đang chờ xử lý')
    }
  }
}
