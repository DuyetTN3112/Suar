import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import { buildOrganizationMembershipEvent } from '#modules/organizations/observability/organization_event_factory'

export default class AcceptOrganizationInvitationCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private createNotification: NotificationCreator = notificationPublicApi
  ) {}

  async execute(organizationId: string): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const startedAt = Date.now()
    
    platformOperationalLogger.log(
      'info',
      buildOrganizationMembershipEvent(this.execCtx, {
        eventName: 'organization_invitation_accepted',
        eventFamily: 'membership',
        subsystem: 'organization_users',
        workflow: 'organization_accept_invitation',
        stage: 'started',
        outcome: 'success',
        organizationId: organizationId,
        targetType: 'organization_invitation',
        targetId: userId,
        change: {
          target_user_id: userId,
          decision: 'approved',
        },
        retentionClass: 'transient_runtime',
      })
    )
    
    const trx = await db.transaction()

    try {
      // 1. Find pending invitation in organization_users
      const pendingInvitation = await membershipQueries.findPendingMembership(
        organizationId,
        userId,
        trx
      )

      if (!pendingInvitation || !pendingInvitation.invited_by) {
        throw new NotFoundException('Không tìm thấy lời mời đang chờ xử lý')
      }

      // 2. Update membership status to approved
      await membershipMutations.updateStatus(
        organizationId,
        userId,
        'approved',
        trx
      )

      // 3. Create audit log
      await auditPublicApi.log(
        {
          user_id: userId,
          action: 'accept_invitation',
          entity_type: EntityType.ORGANIZATION,
          entity_id: organizationId,
          old_values: {
            organization_id: pendingInvitation.organization_id,
            user_id: pendingInvitation.user_id,
            status: pendingInvitation.status,
          },
          new_values: {
            status: 'approved',
            action: 'accept',
          },
        },
        this.execCtx
      )

      await trx.commit()

      // Emit domain event
      void emitter.emit('organization:member:added', {
        organizationId: organizationId,
        userId: userId,
        org_role: pendingInvitation.org_role,
        invitedBy: pendingInvitation.invited_by,
      })

      // Invalidate caches
      await cacheStore.deleteByPattern(`organization:members:*`)
      await cacheStore.deleteByPattern(`organization:metadata:*`)

      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildOrganizationMembershipEvent(this.execCtx, {
          eventName: 'organization_invitation_accepted',
          eventFamily: 'membership',
          subsystem: 'organization_users',
          workflow: 'organization_accept_invitation',
          stage: 'completed',
          outcome: 'success',
          organizationId: organizationId,
          targetType: 'organization_invitation',
          targetId: userId,
          change: {
            target_user_id: userId,
            decision: 'approved',
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
        })
      )

      const organization = await OrganizationRepository.findById(organizationId)
      const orgName = organization?.name ?? 'Tổ chức'

      try {
        await this.createNotification.handle({
          user_id: pendingInvitation.invited_by,
          title: 'Lời mời được chấp nhận',
          message: `Một người dùng đã chấp nhận lời mời tham gia tổ chức ${orgName}`,
          type: BACKEND_NOTIFICATION_TYPES.ORGANIZATION_JOIN_APPROVED,
          related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
          related_entity_id: organizationId,
        })
      } catch (error) {
        platformOperationalLogger.log(
          'warn',
          buildOrganizationMembershipEvent(this.execCtx, {
            eventName: 'organization.accept_invitation.notification_failed',
            eventFamily: 'membership',
            subsystem: 'organization_users',
            workflow: 'organization_accept_invitation',
            stage: 'notification_failed',
            outcome: 'warning',
            organizationId: organizationId,
            targetType: 'organization_invitation',
            targetId: userId,
            change: {
              target_user_id: userId,
              decision: 'approved',
            },
            error,
            retentionClass: 'transient_runtime',
          })
        )
      }
    } catch (error) {
      await trx.rollback()
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildOrganizationMembershipEvent(this.execCtx, {
          eventName: 'organization_invitation_accept_failed',
          eventFamily: 'membership',
          subsystem: 'organization_users',
          workflow: 'organization_accept_invitation',
          stage: 'failed',
          outcome: 'failure',
          organizationId: organizationId,
          targetType: 'organization_invitation',
          targetId: userId,
          change: {
            target_user_id: userId,
            decision: 'approved',
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
          error,
        })
      )
      throw error
    }
  }
}
