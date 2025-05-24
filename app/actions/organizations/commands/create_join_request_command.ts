import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'

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
  constructor(protected ctx: HttpContext) {}

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
    const user = this.ctx.auth.user!
    const trx = await db.transaction()

    try {
      // 1. Check if user is already a member
      const existingMembership = await db
        .from('organization_users')
        .where('organization_id', organizationId)
        .where('user_id', user.id)
        .useTransaction(trx)
        .first()

      if (existingMembership) {
        throw new Error('You are already a member of this organization')
      }

      // 2. Check for duplicate pending requests
      const existingRequest = await db
        .from('organization_join_requests')
        .where('organization_id', organizationId)
        .where('user_id', user.id)
        .where('status', 'pending')
        .useTransaction(trx)
        .first()

      if (existingRequest) {
        throw new Error('You already have a pending join request for this organization')
      }

      // 3. Create join request
      const [requestId] = await db.table('organization_join_requests').useTransaction(trx).insert({
        organization_id: organizationId,
        user_id: user.id,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      })

      // 4. Create audit log
      await AuditLog.create(
        {
          user_id: user.id,
          action: 'create_join_request',
          entity_type: 'organization',
          entity_id: organizationId,
          new_values: {
            request_id: requestId,
            user_id: user.id,
            organization_id: organizationId,
          },
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent') || '',
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
