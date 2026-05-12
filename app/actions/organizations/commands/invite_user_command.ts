import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  buildInviteUserDTO,
  type BuildMemberRequestOptions,
  type InviteMemberRequestInput,
} from '../builders/member_request_dto_builders.js'
import type { InviteUserDTO } from '../dtos/request/invite_user_dto.js'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { OrganizationUserStatus } from '#constants/organization_constants'
import { canInviteOrganizationMembers } from '#domain/organizations/org_permission_policy'
import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import OrgAccessRepository from '#infra/organizations/repositories/read/org_access_repository'
import OrganizationRepository from '#infra/organizations/repositories/read/organization_repository'
import type { DatabaseId } from '#types/database'
import { type ExecutionContext } from '#types/execution_context'

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

  async executeFromRequest(
    input: InviteMemberRequestInput,
    options: BuildMemberRequestOptions = {}
  ): Promise<void> {
    const dto = await buildInviteUserDTO(this.execCtx, input, options)
    await this.execute(dto)
  }

  /**
   * Execute command: Invite user to organization
   *
   * Steps:
   * 1. Resolve actor
   * 2. Load and validate invitation context inside a transaction
   * 3. Persist the invitation and commit
   * 4. Run post-commit side effects outside the transaction
   */
  async execute(dto: InviteUserDTO): Promise<void> {
    const userId = this.requireActorId()
    const invitationContext = await this.persistInvitationInTransaction(dto, userId)
    await this.runPostCommitSideEffects(dto, userId, invitationContext)
  }

  /**
   * Helper: Require an authenticated actor.
   */
  private requireActorId(): DatabaseId {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  /**
   * Helper: Validate invitation prerequisites inside the transaction.
   */
  private async validateInvitationContext(
    dto: InviteUserDTO,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<{ normalizedEmail: string; inviteeId: DatabaseId }> {
    await this.checkPermissions(dto.organizationId, userId, trx)

    const normalizedEmail = dto.getNormalizedEmail()
    const invitee = await DefaultOrganizationDependencies.user.findUserByEmail(normalizedEmail, trx)
    if (!invitee) {
      throw new NotFoundException('Không tìm thấy người dùng với email này')
    }

    await this.checkDuplicateInvitation(dto.organizationId, invitee.id, normalizedEmail, trx)

    const organization = await OrganizationRepository.findById(dto.organizationId, trx)
    if (!organization) {
      throw NotFoundException.resource('Tổ chức', dto.organizationId)
    }

    return { normalizedEmail, inviteeId: invitee.id }
  }

  /**
   * Helper: Persist the invitation inside a transaction and commit before side effects.
   */
  private async persistInvitationInTransaction(
    dto: InviteUserDTO,
    userId: DatabaseId
  ): Promise<{
    normalizedEmail: string
    inviteeId: DatabaseId
    invitation: Awaited<ReturnType<typeof OrgAccessRepository.createInvitation>>
  }> {
    const trx = await db.transaction()

    try {
      const { normalizedEmail, inviteeId } = await this.validateInvitationContext(dto, userId, trx)
      const invitation = await OrgAccessRepository.createInvitation(
        {
          organization_id: dto.organizationId,
          email: normalizedEmail,
          invited_by: userId,
          org_role: dto.roleId,
        },
        trx
      )

      await trx.commit()

      return { normalizedEmail, inviteeId, invitation }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Run post-commit side effects after the transaction is safely committed.
   */
  private async runPostCommitSideEffects(
    dto: InviteUserDTO,
    userId: DatabaseId,
    invitationContext: {
      normalizedEmail: string
      inviteeId: DatabaseId
      invitation: Awaited<ReturnType<typeof OrgAccessRepository.createInvitation>>
    }
  ): Promise<void> {
    await auditPublicApi.log(
      {
        user_id: userId,
        action: AuditAction.INVITE,
        entity_type: EntityType.ORGANIZATION,
        entity_id: dto.organizationId,
        new_values: {
          email: invitationContext.normalizedEmail,
          role: dto.getRoleName(),
          invited_user_id: invitationContext.inviteeId,
          invited_membership_user_id: invitationContext.invitation.user_id,
          status: invitationContext.invitation.status,
        },
      },
      this.execCtx
    )

    void emitter.emit('audit:log', {
      userId,
      action: 'invite_user',
      entityType: 'organization',
      entityId: dto.organizationId,
      newValues: {
        email: invitationContext.normalizedEmail,
        role: dto.getRoleName(),
      },
    })
  }

  /**
   * Helper: Check if user has permission to send invitations.
   */
  private async checkPermissions(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    const actorMembership = await OrganizationUserRepository.getMembershipContext(
      organizationId,
      userId,
      trx
    )
    const actorOrgRole = actorMembership?.role ?? null
    enforcePolicy(canInviteOrganizationMembers(actorOrgRole))
  }

  /**
   * Helper: Check for duplicate active invitations.
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
