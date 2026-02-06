import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import UnauthorizedException from '#exceptions/unauthorized_exception'
import { auditPublicApi } from '#modules/audit/actions/public_api'
import { AuditAction, EntityType } from '#modules/audit/constants/audit_constants'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/constants/organization_constants'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
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
      const existingMembership = await membershipQueries.findMembership(
        organizationId,
        userId,
        trx
      )

      if (existingMembership?.status === OrganizationUserStatus.REJECTED) {
        await membershipMutations.updateStatus(organizationId, userId, 'pending', trx)
      } else {
        await membershipMutations.addMember(
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
