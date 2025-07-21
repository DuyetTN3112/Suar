import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#actions/audit/public_api'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type { DatabaseId } from '#types/database'
import { type ExecutionContext } from '#types/execution_context'

/**
 * Command: Create Join Request
 *
 * Persist pending membership, audit log, and post-commit event for a join request.
 * Eligibility and orchestration stay in RequestOrganizationJoinCommand.
 */
export default class CreateJoinRequestCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(organizationId: DatabaseId): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      const existingMembership = await OrganizationUserRepository.findMembership(
        organizationId,
        userId,
        trx
      )

      if (existingMembership?.status === OrganizationUserStatus.REJECTED) {
        await OrganizationUserRepository.updateStatus(organizationId, userId, 'pending', trx)
      } else {
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

      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.JOIN,
          entity_type: EntityType.ORGANIZATION,
          entity_id: organizationId,
          new_values: {
            user_id: userId,
            organization_id: organizationId,
            status: OrganizationUserStatus.PENDING,
          },
        },
        this.execCtx
      )

      await trx.commit()

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
