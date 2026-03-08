import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'
import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import OrganizationUser from '#models/organization_user'
import Project from '#models/project'
import Task from '#models/task'
import Conversation from '#models/conversation'
import ConversationParticipant from '#models/conversation_participant'
import type { RemoveMemberDTO } from '../dtos/remove_member_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import { enforcePolicy } from '#actions/shared/rules/enforce_policy'
import { canRemoveMember } from '#actions/organizations/rules/org_permission_policy'

/**
 * Command: Remove Member from Organization
 *
 * Cascading actions with task reassignment.
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class RemoveMemberCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  async execute(dto: RemoveMemberDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const trx = await db.transaction()

    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const [actorOrgRole, targetMembership] = await Promise.all([
        OrganizationUser.getOrgRole(userId, dto.organizationId, trx),
        OrganizationUser.findMembership(dto.organizationId, dto.userId, trx),
      ])

      if (!targetMembership) {
        throw new NotFoundException('Người dùng không phải thành viên của tổ chức này')
      }

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      enforcePolicy(
        canRemoveMember({
          actorId: userId,
          actorOrgRole: actorOrgRole,
          targetUserId: dto.userId,
          targetOrgRole: targetMembership.org_role,
        })
      )

      // ── PERSIST ────────────────────────────────────────────────────────
      // Handle task reassignment (unassign all tasks)
      await this.unassignMemberTasks(dto.organizationId, dto.userId, trx)

      // Remove from conversation_participants
      await this.removeFromConversations(dto.organizationId, dto.userId, trx)

      // Remove member from organization
      await OrganizationUser.deleteMember(dto.organizationId, dto.userId, trx)

      await AuditLog.create(
        {
          user_id: userId,
          action: 'remove_member',
          entity_type: EntityType.ORGANIZATION,
          entity_id: dto.organizationId,
          old_values: targetMembership.toJSON(),
          new_values: {
            removed_user_id: dto.userId,
            removed_user_role: targetMembership.org_role,
            reason: dto.getNormalizedReason(),
          },
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      await trx.commit()

      // Emit domain event
      void emitter.emit('organization:member:removed', {
        organizationId: dto.organizationId,
        userId: dto.userId,
        removedBy: userId,
      })

      // Invalidate organization member caches
      await CacheService.deleteByPattern(`organization:members:*`)
      await CacheService.deleteByPattern(`organization:metadata:*`)

      // Send notification
      await this.sendMemberRemovedNotification(dto)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Unassign all tasks assigned to member
   */
  private async unassignMemberTasks(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    // Find all projects in this organization via Model
    const projectIds = await Project.findIdsByOrganization(organizationId, trx)
    if (projectIds.length === 0) return

    // Unassign tasks in these projects via Model
    await Task.unassignByUserInProjects(projectIds, userId, trx)
  }

  /**
   * Helper: Remove user from all organization conversations
   * Logic từ after_organization_user_update trigger
   */
  private async removeFromConversations(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    // Get all conversation IDs in this organization via Model
    const conversationIds = await Conversation.findIdsByOrganization(organizationId, trx)
    if (conversationIds.length === 0) return

    // Delete user from these conversations via Model
    await ConversationParticipant.removeByUserInConversations(userId, conversationIds, trx)
  }

  /**
   * Helper: Send notification to removed member
   */
  private async sendMemberRemovedNotification(dto: RemoveMemberDTO): Promise<void> {
    try {
      await this.createNotification.handle({
        user_id: dto.userId,
        title: 'Đã rời khỏi tổ chức',
        message: `Bạn đã bị xóa khỏi tổ chức${dto.hasReason() ? `: ${dto.getNormalizedReason() ?? ''}` : ''}`,
        type: 'member_removed',
        related_entity_type: 'organization',
        related_entity_id: dto.organizationId,
      })
    } catch (error) {
      loggerService.error('[RemoveMemberCommand] Failed to send notification:', error)
    }
  }
}
