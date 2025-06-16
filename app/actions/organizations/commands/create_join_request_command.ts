import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import CreateAuditLog from '#actions/common/create_audit_log'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import emitter from '@adonisjs/core/services/emitter'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canCreateJoinRequest } from '#domain/organizations/org_permission_policy'

/**
 * Command: Create Join Request
 *
 * Pattern: User-initiated request (learned from all modules)
 * Business rules:
 * - Any authenticated user can request to join
 * - Cannot create duplicate pending requests
 * - Cannot create request if already a member
 *
 * @example
 * const command = new CreateJoinRequestCommand(ctx)
 * await command.execute(organizationId)
 */
export default class CreateJoinRequestCommand {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute command: Create join request
   *
   * Steps:
   * 1. Check if user is already a member
   * 2. Check for duplicate pending requests
   * 3. Begin transaction
   * 4. Create join request
   * 5. Create audit log
   * 6. Commit transaction
   */
  async execute(organizationId: DatabaseId): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Check existing membership in organization_users
      const existingMembership = await OrganizationUserRepository.findMembership(
        organizationId,
        userId,
        trx
      )
      const isApprovedMember = existingMembership?.status === OrganizationUserStatus.APPROVED
      const hasPending = existingMembership?.status === OrganizationUserStatus.PENDING

      enforcePolicy(
        canCreateJoinRequest({
          isAlreadyMember: isApprovedMember,
          hasPendingRequest: hasPending,
        })
      )

      // 2. Create or re-activate membership with status='pending'
      if (existingMembership && existingMembership.status === OrganizationUserStatus.REJECTED) {
        // Re-apply after rejection: update existing row back to pending
        await OrganizationUserRepository.updateStatus(organizationId, userId, 'pending', trx)
      } else {
        // New join request: insert row with status='pending'
        await OrganizationUserRepository.addMember(
          {
            organization_id: organizationId,
            user_id: userId,
            org_role: OrganizationRole.MEMBER,
            status: OrganizationUserStatus.PENDING,
          },
          trx
        )
      }

      // 3. Create audit log
      await new CreateAuditLog(this.execCtx).handle({
        user_id: userId,
        action: AuditAction.JOIN,
        entity_type: EntityType.ORGANIZATION,
        entity_id: organizationId,
        new_values: {
          user_id: userId,
          organization_id: organizationId,
          status: OrganizationUserStatus.PENDING,
        },
      })

      await trx.commit()

      // Emit audit event
      void emitter.emit('audit:log', {
        userId,
        action: 'join_request',
        entityType: 'organization',
        entityId: organizationId,
        newValues: { status: OrganizationUserStatus.PENDING },
      })
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
