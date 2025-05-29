import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import OrgAccessRepository from '#infra/organizations/repositories/org_access_repository'
import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import CreateAuditLog from '#actions/common/create_audit_log'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { OrganizationUserStatus } from '#constants/organization_constants'
import type { InviteUserDTO } from '../dtos/request/invite_user_dto.js'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'
import ConflictException from '#exceptions/conflict_exception'
import emitter from '@adonisjs/core/services/emitter'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canInviteOrganizationMembers } from '#domain/organizations/org_permission_policy'

/**
 * Command: Invite User to Organization
 *
 * Pattern: Invitation record creation (without email)
 * Business rules:
 * - Only Owner (role_id = 1) or Admin (role_id = 2) can send invites
 * - Invitation source-of-truth is organization_users with invited_by + pending status
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
   * 2. Resolve invitee and check for duplicate invitations
   * 3. Begin transaction
   * 4. Create pending membership invitation
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

      // 2. Resolve invitee and check duplicate membership/invitation state
      const invitee = await UserRepository.findByEmail(dto.getNormalizedEmail(), trx)
      if (!invitee) {
        throw new NotFoundException('Không tìm thấy người dùng với email này')
      }
      await this.checkDuplicateInvitation(
        dto.organizationId,
        invitee.id,
        dto.getNormalizedEmail(),
        trx
      )

      // 3. Get organization details
      const organization = await OrganizationRepository.findById(dto.organizationId, trx)
      if (!organization) {
        throw NotFoundException.resource('Tổ chức', dto.organizationId)
      }

      // 4. Create invitation record via organization_users
      const invitation = await OrgAccessRepository.createInvitation(
        {
          organization_id: dto.organizationId,
          email: dto.getNormalizedEmail(),
          invited_by: userId,
          org_role: dto.roleId,
        },
        trx
      )

      // 5. Create audit log
      await new CreateAuditLog(this.execCtx).handle({
        user_id: userId,
        action: AuditAction.INVITE,
        entity_type: EntityType.ORGANIZATION,
        entity_id: dto.organizationId,
        new_values: {
          email: dto.getNormalizedEmail(),
          role: dto.getRoleName(),
          invited_user_id: invitee.id,
          invited_membership_user_id: invitation.user_id,
          status: invitation.status,
        },
      })

      await trx.commit()

      // Emit audit event
      void emitter.emit('audit:log', {
        userId,
        action: 'invite_user',
        entityType: 'organization',
        entityId: dto.organizationId,
        newValues: {
          email: dto.getNormalizedEmail(),
          role: dto.getRoleName(),
        },
      })
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
    const actorOrgRole = await OrganizationUserRepository.getMemberRoleName(
      organizationId,
      userId,
      trx
    )
    enforcePolicy(canInviteOrganizationMembers(actorOrgRole))
  }

  /**
   * Helper: Check for duplicate active invitations
   */
  private async checkDuplicateInvitation(
    organizationId: DatabaseId,
    inviteeUserId: DatabaseId,
    email: string,
    trx: TransactionClientContract
  ): Promise<void> {
    const membership = await OrganizationUserRepository.findMembership(
      organizationId,
      inviteeUserId,
      trx
    )

    if (!membership) {
      return
    }

    if (membership.status === OrganizationUserStatus.APPROVED) {
      throw ConflictException.alreadyExists('Người dùng này đã là thành viên của tổ chức')
    }

    if (membership.status === OrganizationUserStatus.PENDING && membership.invited_by) {
      throw ConflictException.alreadyExists(
        `Lời mời cho email ${email} đã tồn tại và đang chờ xử lý`
      )
    }

    if (membership.status === OrganizationUserStatus.PENDING) {
      throw ConflictException.alreadyExists(
        'Người dùng này đã có yêu cầu tham gia tổ chức đang chờ xử lý'
      )
    }

    throw ConflictException.alreadyExists(
      'Người dùng này đã từng bị từ chối hoặc đã tồn tại trong tổ chức'
    )
  }
}
