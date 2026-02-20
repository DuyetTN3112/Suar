import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import type { ProcessJoinRequestDTO } from '../dtos/request/process_join_request_dto.js'

import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canProcessJoinRequest } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'

/**
 * Command: Process Join Request (Approve or Reject)
 *
 * v3.0: Uses organization_users with status='pending' instead of organization_join_requests.
 * Approving updates status to 'approved', rejecting updates to 'rejected'.
 *
 * Business rules:
 * - Only Owner or Admin can process requests
 * - If approved, update membership status to 'approved'
 * - If rejected, update membership status to 'rejected'
 * - Send notification to requester
 */
export default class ProcessJoinRequestCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private createNotification: NotificationCreator
  ) {}

  async execute(dto: ProcessJoinRequestDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const trx = await db.transaction()

    try {
      // 1. Find pending membership in organization_users
      const pendingMembership = await membershipQueries.findPendingMembership(
        dto.organizationId,
        dto.targetUserId,
        trx
      )

      if (!pendingMembership) {
        throw new Error('Không tìm thấy yêu cầu tham gia đang chờ xử lý')
      }

      // 2. Check permissions
      const actorMembership = await membershipQueries.getMembershipContext(
        dto.organizationId,
        userId,
        trx
      )
      const actorOrgRole = actorMembership?.role ?? null
      enforcePolicy(
        canProcessJoinRequest({
          actorOrgRole,
          requestStatus: pendingMembership.status,
          isTargetAlreadyMember: false,
        })
      )

      // 3. Update membership status
      const newStatus = dto.isApproval() ? 'approved' : 'rejected'
      await membershipMutations.updateStatus(
        dto.organizationId,
        dto.targetUserId,
        newStatus,
        trx
      )

      // 4. Create audit log
      await auditPublicApi.log(
        {
          user_id: userId,
          action: `${dto.getStatus()}_join_request`,
          entity_type: EntityType.ORGANIZATION,
          entity_id: dto.organizationId,
          old_values: {
            organization_id: pendingMembership.organization_id,
            user_id: pendingMembership.user_id,
            status: pendingMembership.status,
          },
          new_values: {
            status: newStatus,
            requester_id: dto.targetUserId,
            action: dto.getActionVerb(),
            reason: dto.getNormalizedReason(),
          },
        },
        this.execCtx
      )

      await trx.commit()

      // Emit domain event
      if (dto.isApproval()) {
        void emitter.emit('organization:member:added', {
          organizationId: dto.organizationId,
          userId: dto.targetUserId,
          org_role: OrganizationRole.MEMBER,
          invitedBy: null,
        })
      }

      // Invalidate pending request and member caches
      await cacheStore.deleteByPattern(`organization:members:*`)
      await cacheStore.deleteByPattern(`organization:metadata:*`)

      // 5. Send notification
      await this.sendProcessedNotification(dto)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async sendProcessedNotification(dto: ProcessJoinRequestDTO): Promise<void> {
    try {
      const title = dto.isApproval() ? 'Yêu cầu được chấp nhận' : 'Yêu cầu bị từ chối'
      const message = dto.isApproval()
        ? 'Yêu cầu tham gia tổ chức của bạn đã được chấp nhận'
        : `Yêu cầu tham gia tổ chức của bạn đã bị từ chối${dto.hasReason() ? `: ${dto.getNormalizedReason() ?? ''}` : ''}`

      await this.createNotification.handle({
        user_id: dto.targetUserId,
        title,
        message,
        type: dto.isApproval()
          ? BACKEND_NOTIFICATION_TYPES.JOIN_REQUEST_APPROVED
          : BACKEND_NOTIFICATION_TYPES.JOIN_REQUEST_REJECTED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
        related_entity_id: dto.organizationId,
      })
    } catch (error) {
      loggerService.error('[ProcessJoinRequestCommand] Failed to send notification:', error)
    }
  }
}
