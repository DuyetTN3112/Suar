import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { RemoveMemberDTO } from '../dtos/request/remove_member_dto.js'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import NotFoundException from '#exceptions/not_found_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { auditPublicApi } from '#modules/audit/actions/public_api'
import { EntityType } from '#modules/audit/constants/audit_constants'
import { enforcePolicy } from '#modules/authorization/actions/public_api'
import CacheService from '#modules/cache/infra/cache_service'
import loggerService from '#modules/logger/infra/logger_service'
import type { NotificationCreator } from '#modules/notifications/actions/public_api'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/constants/notification_constants'
import { canRemoveMember } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import type { DatabaseId } from '#types/database'
import { type ExecutionContext } from '#types/execution_context'

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
    private createNotification: NotificationCreator
  ) {}

  async execute(dto: RemoveMemberDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const trx = await db.transaction()

    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const actorMembership = await membershipQueries.getMembershipContext(
        dto.organizationId,
        userId,
        trx
      )
      const actorOrgRole = actorMembership?.role ?? null
      const targetMembership = await membershipQueries.findMembership(
        dto.organizationId,
        dto.userId,
        trx
      )

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

      // Remove member from organization
      await membershipMutations.deleteMember(dto.organizationId, dto.userId, trx)

      await auditPublicApi.log(
        {
          user_id: userId,
          action: 'remove_member',
          entity_type: EntityType.ORGANIZATION,
          entity_id: dto.organizationId,
          old_values: {
            organization_id: targetMembership.organization_id,
            user_id: targetMembership.user_id,
            org_role: targetMembership.org_role,
            status: targetMembership.status,
            invited_by: targetMembership.invited_by,
            created_at: targetMembership.created_at.toISO(),
            updated_at: targetMembership.updated_at.toISO(),
          },
          new_values: {
            removed_user_id: dto.userId,
            removed_user_role: targetMembership.org_role,
            reason: dto.getNormalizedReason(),
          },
        },
        this.execCtx
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
    await DefaultOrganizationDependencies.projectTask.unassignMemberTasks(
      organizationId,
      userId,
      trx
    )
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
        type: BACKEND_NOTIFICATION_TYPES.MEMBER_REMOVED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
        related_entity_id: dto.organizationId,
      })
    } catch (error) {
      loggerService.error('[RemoveMemberCommand] Failed to send notification:', error)
    }
  }
}
