import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import OrganizationUser from '#models/organization_user'
import OrganizationJoinRequest from '#models/organization_join_request'
import { AuditAction, EntityType } from '#constants/audit_constants'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ConflictException from '#exceptions/conflict_exception'
import emitter from '@adonisjs/core/services/emitter'

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
      // 1. Check if user is already a member
      const isMember = await OrganizationUser.hasMembership(organizationId, userId, trx)
      if (isMember) {
        throw new ConflictException('You are already a member of this organization')
      }

      // 2. Check for duplicate pending requests
      const hasPending = await OrganizationJoinRequest.hasPendingRequest(
        organizationId,
        userId,
        trx
      )
      if (hasPending) {
        throw new ConflictException('You already have a pending join request for this organization')
      }

      // 3. Create join request via Model
      const joinRequest = await OrganizationJoinRequest.createRequest(
        {
          organization_id: organizationId,
          user_id: userId,
        },
        trx
      )

      // 4. Create audit log
      await AuditLog.create(
        {
          user_id: userId,
          action: AuditAction.JOIN,
          entity_type: EntityType.ORGANIZATION,
          entity_id: organizationId,
          new_values: {
            request_id: joinRequest.id,
            user_id: userId,
            organization_id: organizationId,
          },
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      await trx.commit()

      // Emit audit event
      void emitter.emit('audit:log', {
        userId,
        action: 'join_request',
        entityType: 'organization',
        entityId: organizationId,
        newValues: { request_id: joinRequest.id },
      })
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
