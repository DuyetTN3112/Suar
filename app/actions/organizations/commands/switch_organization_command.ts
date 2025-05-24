import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import AuditLog from '#models/audit_log'

/**
 * Command: Switch Organization
 *
 * Pattern: Simple state update (learned from all modules)
 * Business rules:
 * - User must be a member of target organization
 * - Update current_organization_id in users table
 * - This affects which organization's data user sees by default
 *
 * @example
 * const command = new SwitchOrganizationCommand(ctx)
 * await command.execute(organizationId)
 */
export default class SwitchOrganizationCommand {
  constructor(protected ctx: HttpContext) {}

  /**
   * Execute command: Switch user's current organization
   *
   * Steps:
   * 1. Validate user is member of target organization
   * 2. Begin transaction
   * 3. Update user's current_organization_id
   * 4. Create audit log
   * 5. Commit transaction
   */
  async execute(organizationId: number): Promise<void> {
    const user = this.ctx.auth.user!
    const trx = await db.transaction()

    try {
      // 1. Validate user is member of target organization
      const membership = await db
        .from('organization_users')
        .where('organization_id', organizationId)
        .where('user_id', user.id)
        .useTransaction(trx)
        .first()

      if (!membership) {
        throw new Error('You are not a member of this organization')
      }

      // 2. Get current organization for audit log
      const currentOrganizationId = user.current_organization_id

      // 3. Update user's current organization
      const userModel = await User.findOrFail(user.id)
      userModel.current_organization_id = organizationId
      await userModel.useTransaction(trx).save()

      // 4. Create audit log
      await AuditLog.create(
        {
          user_id: user.id,
          action: 'switch_organization',
          entity_type: 'user',
          entity_id: user.id,
          old_values: { current_organization_id: currentOrganizationId },
          new_values: { current_organization_id: organizationId },
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
