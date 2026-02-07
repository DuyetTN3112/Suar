import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import { OrganizationUserStatus } from '#constants/organization_constants'
import { AuditAction, EntityType } from '#constants/audit_constants'

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
  async execute(organizationId: number): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new Error('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Check if user is already a member
      const existingMembership: unknown = await trx
        .from('organization_users')
        .where('organization_id', organizationId)
        .where('user_id', userId)
        .first()

      if (existingMembership) {
        throw new Error('You are already a member of this organization')
      }

      // 2. Check for duplicate pending requests
      const existingRequest: unknown = await trx
        .from('organization_join_requests')
        .where('organization_id', organizationId)
        .where('user_id', userId)
        .where('status', OrganizationUserStatus.PENDING)
        .first()

      if (existingRequest) {
        throw new Error('You already have a pending join request for this organization')
      }

      // 3. Create join request
      const result = await trx.insertQuery().table('organization_join_requests').insert({
        organization_id: organizationId,
        user_id: userId,
        status: OrganizationUserStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      })
      const requestId = (result as number[])[0]

      // 4. Create audit log
      await AuditLog.create(
        {
          user_id: userId,
          action: AuditAction.JOIN,
          entity_type: EntityType.ORGANIZATION,
          entity_id: organizationId,
          new_values: {
            request_id: requestId,
            user_id: userId,
            organization_id: organizationId,
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
}
