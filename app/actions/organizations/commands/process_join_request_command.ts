import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import type { ProcessJoinRequestDTO } from '../dtos/process_join_request_dto.js'
import type CreateNotification from '#actions/common/create_notification'

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
    protected ctx: HttpContext,
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
    const currentUser = this.ctx.auth.user!
    const trx = await db.transaction()

    try {
      // 1. Get join request
      const joinRequest = await db
        .from('organization_join_requests')
        .where('id', dto.requestId)
        .useTransaction(trx)
        .first()

      if (!joinRequest) {
        throw new Error(`Join request with ID ${dto.requestId} not found`)
      }

      // 2. Check permissions (Owner or Admin)
      await this.checkPermissions(joinRequest.organization_id, currentUser.id, trx)

      // 3. Validate request is pending
      if (joinRequest.status !== 'pending') {
        throw new Error(`Join request is already ${joinRequest.status}`)
      }

      // 4. If approved, add user as member (role_id = 4: Member)
      if (dto.isApproval()) {
        // Check if user is already a member
        const existingMembership = await db
          .from('organization_users')
          .where('organization_id', joinRequest.organization_id)
          .where('user_id', joinRequest.user_id)
          .useTransaction(trx)
          .first()

        if (existingMembership) {
          throw new Error('User is already a member of this organization')
        }

        // Add user as member
        await db.table('organization_users').useTransaction(trx).insert({
          organization_id: joinRequest.organization_id,
          user_id: joinRequest.user_id,
          role_id: 4, // Member
          created_at: new Date(),
          updated_at: new Date(),
        })
      }

      // 5. Update request status
      await db
        .from('organization_join_requests')
        .where('id', dto.requestId)
        .useTransaction(trx)
        .update({
          ...dto.toObject(),
          processed_by: currentUser.id,
        })

      // 6. Create audit log
      await AuditLog.create(
        {
          user_id: currentUser.id,
          action: `${dto.getStatus()}_join_request`,
          entity_type: 'organization',
          entity_id: joinRequest.organization_id,
          old_values: joinRequest,
          new_values: { ...joinRequest, status: dto.getStatus() },
          metadata: JSON.stringify({
            request_id: dto.requestId,
            requester_id: joinRequest.user_id,
            action: dto.getActionVerb(),
            reason: dto.getNormalizedReason(),
          }),
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent') || '',
        },
        { client: trx }
      )

      await trx.commit()

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
    organizationId: number,
    userId: number,
    trx: unknown
  ): Promise<void> {
    const membership = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .whereIn('role_id', [1, 2]) // Owner or Admin
      .useTransaction(trx)
      .first()

    if (!membership) {
      throw new Error('You do not have permission to process join requests for this organization')
    }
  }

  /**
   * Helper: Send notification to requester
   */
  private async sendProcessedNotification(
    dto: ProcessJoinRequestDTO,
    joinRequest: unknown
  ): Promise<void> {
    try {
      const title = dto.isApproval() ? 'Yêu cầu được chấp nhận' : 'Yêu cầu bị từ chối'
      const message = dto.isApproval()
        ? 'Yêu cầu tham gia tổ chức của bạn đã được chấp nhận'
        : `Yêu cầu tham gia tổ chức của bạn đã bị từ chối${dto.hasReason() ? `: ${dto.getNormalizedReason()}` : ''}`

      await this.createNotification.handle({
        user_id: joinRequest.user_id,
        title,
        message,
        type: dto.isApproval() ? 'join_request_approved' : 'join_request_rejected',
        related_entity_type: 'organization',
        related_entity_id: joinRequest.organization_id,
      })
    } catch (error) {
      console.error('[ProcessJoinRequestCommand] Failed to send notification:', error)
    }
  }
}
