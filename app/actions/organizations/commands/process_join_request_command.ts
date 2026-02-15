import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import type { ProcessJoinRequestDTO } from '../dtos/process_join_request_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import { EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import ConflictException from '#exceptions/conflict_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

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
      // 1. Get join request
      const joinRequest = (await trx
        .from('organization_join_requests')
        .where('id', dto.requestId)
        .first()) as JoinRequest | null

      if (!joinRequest) {
        throw NotFoundException.resource('Yêu cầu tham gia', dto.requestId)
      }

      // 2. Check permissions (Owner or Admin)
      await this.checkPermissions(joinRequest.organization_id, userId, trx)

      // 3. Validate request is pending
      if (joinRequest.status !== OrganizationUserStatus.PENDING) {
        throw new BusinessLogicException(`Yêu cầu tham gia đã được xử lý (${joinRequest.status})`)
      }

      // 4. If approved, add user as member (role_id = 4: Member)
      if (dto.isApproval()) {
        // Check if user is already a member
        const existingMembership: unknown = await trx
          .from('organization_users')
          .where('organization_id', joinRequest.organization_id)
          .where('user_id', joinRequest.user_id)
          .first()

        if (existingMembership) {
          throw ConflictException.alreadyExists('Người dùng đã là thành viên của tổ chức này')
        }

        // Add user as member
        await trx.insertQuery().table('organization_users').insert({
          organization_id: joinRequest.organization_id,
          user_id: joinRequest.user_id,
          role_id: OrganizationRole.MEMBER,
          created_at: new Date(),
          updated_at: new Date(),
        })
      }

      // 5. Update request status
      await trx
        .from('organization_join_requests')
        .where('id', dto.requestId)
        .update({
          ...dto.toObject(),
          processed_by: userId,
        })

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
          roleId: OrganizationRole.MEMBER,
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
   * Helper: Check if user has permission to process requests
   */
  private async checkPermissions(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    const membership: unknown = await trx
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .whereIn('role_id', [OrganizationRole.OWNER, OrganizationRole.ADMIN])
      .first()

    if (!membership) {
      throw new ForbiddenException('Bạn không có quyền xử lý yêu cầu tham gia tổ chức này')
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
