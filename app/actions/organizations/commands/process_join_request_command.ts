import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import OrganizationUser from '#models/organization_user'
import OrganizationJoinRequest from '#models/organization_join_request'
import type { ProcessJoinRequestDTO } from '../dtos/process_join_request_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import { OrganizationRole, type OrganizationUserStatus } from '#constants/organization_constants'
import { EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { enforcePolicy } from '#actions/shared/rules/enforce_policy'
import { canProcessJoinRequest } from '#actions/organizations/rules/org_permission_policy'

interface JoinRequest {
  id: DatabaseId
  organization_id: DatabaseId
  user_id: DatabaseId
  status: OrganizationUserStatus
}

/**
 * Command: Process Join Request (Approve or Reject)
 *
 * Pattern: Approval workflow (learned from Projects module)
 * Business rules:
 * - Only Owner (role_id = 1) or Admin (role_id = 2) can process requests
 * - If approved, add user as Member (role_id = 4)
 * - Send notification to requester
 * - Mark request as processed
 *
 * @example
 * const command = new ProcessJoinRequestCommand(ctx, createNotification)
 * await command.execute(dto)
 */
export default class ProcessJoinRequestCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command: Process join request
   *
   * Steps:
   * 1. Get join request
   * 2. Check permissions
   * 3. Validate request is pending
   * 4. Begin transaction
   * 5. If approved: Add user as member
   * 6. Update request status
   * 7. Create audit log
   * 8. Commit transaction
   * 9. Send notification
   */
  async execute(dto: ProcessJoinRequestDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const trx = await db.transaction()

    try {
      // 1. Get join request via Model
      const joinRequest = await OrganizationJoinRequest.findByIdOrFail(dto.requestId, trx)

      // 2. Check permissions, request status, and membership
      const actorOrgRole = await OrganizationUser.getOrgRole(
        userId,
        joinRequest.organization_id,
        trx
      )
      const alreadyMember = dto.isApproval()
        ? await OrganizationUser.hasMembership(
            joinRequest.organization_id,
            joinRequest.user_id,
            trx
          )
        : false
      enforcePolicy(
        canProcessJoinRequest({
          actorOrgRole,
          requestStatus: joinRequest.status,
          isTargetAlreadyMember: alreadyMember,
        })
      )

      // 4. If approved, add user as member (org_role = org_member)
      if (dto.isApproval()) {
        // Add user as member via Model
        await OrganizationUser.addMember(
          {
            organization_id: String(joinRequest.organization_id),
            user_id: String(joinRequest.user_id),
            org_role: OrganizationRole.MEMBER,
          },
          trx
        )
      }

      // 5. Update request status via Model
      await OrganizationJoinRequest.updateStatus(
        dto.requestId,
        {
          ...dto.toObject(),
          processed_by: userId,
        },
        trx
      )

      // 6. Create audit log
      await AuditLog.create(
        {
          user_id: userId,
          action: `${dto.getStatus()}_join_request`,
          entity_type: EntityType.ORGANIZATION,
          entity_id: joinRequest.organization_id,
          old_values: joinRequest,
          new_values: {
            status: dto.getStatus(),
            request_id: dto.requestId,
            requester_id: joinRequest.user_id,
            action: dto.getActionVerb(),
            reason: dto.getNormalizedReason(),
          },
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      await trx.commit()

      // Emit domain event
      if (dto.isApproval()) {
        void emitter.emit('organization:member:added', {
          organizationId: joinRequest.organization_id,
          userId: joinRequest.user_id,
          org_role: OrganizationRole.MEMBER,
          invitedBy: null,
        })
      }

      // Invalidate pending request and member caches
      await CacheService.deleteByPattern(`organization:members:*`)
      await CacheService.deleteByPattern(`organization:metadata:*`)

      // 7. Send notification
      await this.sendProcessedNotification(dto, joinRequest)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Send notification to requester
   */
  private async sendProcessedNotification(
    dto: ProcessJoinRequestDTO,
    joinRequest: JoinRequest
  ): Promise<void> {
    try {
      const title = dto.isApproval() ? 'Yêu cầu được chấp nhận' : 'Yêu cầu bị từ chối'
      const message = dto.isApproval()
        ? 'Yêu cầu tham gia tổ chức của bạn đã được chấp nhận'
        : `Yêu cầu tham gia tổ chức của bạn đã bị từ chối${dto.hasReason() ? `: ${dto.getNormalizedReason() ?? ''}` : ''}`

      await this.createNotification.handle({
        user_id: joinRequest.user_id,
        title,
        message,
        type: dto.isApproval() ? 'join_request_approved' : 'join_request_rejected',
        related_entity_type: 'organization',
        related_entity_id: joinRequest.organization_id,
      })
    } catch (error) {
      loggerService.error('[ProcessJoinRequestCommand] Failed to send notification:', error)
    }
  }
}
