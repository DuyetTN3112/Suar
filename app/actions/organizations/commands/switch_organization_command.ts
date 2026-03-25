import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import AuditLog from '#models/mongo/audit_log'
import { AuditAction, EntityType } from '#constants/audit_constants'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import emitter from '@adonisjs/core/services/emitter'

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
  constructor(protected execCtx: ExecutionContext) {}

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
  async execute(organizationId: DatabaseId): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Validate user is member of target organization → delegate to Model
      const isMember = await OrganizationUserRepository.isMember(userId, organizationId, trx)
      if (!isMember) {
        throw new BusinessLogicException('You are not a member of this organization')
      }

      // 2. Get current organization for audit log
      const userModel = await User.findOrFail(userId)
      const currentOrganizationId = userModel.current_organization_id

      // 3. Update user's current organization
      userModel.current_organization_id = organizationId
      await userModel.useTransaction(trx).save()

      // 4. Create audit log
      await AuditLog.create({
        user_id: userId,
        action: AuditAction.SWITCH_ORGANIZATION,
        entity_type: EntityType.USER,
        entity_id: userId,
        old_values: { current_organization_id: currentOrganizationId },
        new_values: { current_organization_id: organizationId },
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
      })

      await trx.commit()

      // Emit cache invalidation for user permissions
      void emitter.emit('cache:invalidate', {
        entityType: 'user',
        entityId: userId,
        patterns: [`user:${userId}:*`],
      })
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
