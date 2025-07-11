import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { RemoveMemberDTO } from '../dtos/request/remove_member_dto.js'

import CreateAuditLog from '#actions/audit/create_audit_log'
import { enforcePolicy } from '#actions/authorization/enforce_policy'
import type CreateNotification from '#actions/common/create_notification'
import { EntityType } from '#constants/audit_constants'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#constants/notification_constants'
import { canRemoveMember } from '#domain/organizations/org_permission_policy'
import NotFoundException from '#exceptions/not_found_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type { DatabaseId } from '#types/database'
import { type ExecutionContext } from '#types/execution_context'

import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

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
      const actorMembership = await OrganizationUserRepository.getMembershipContext(
        dto.organizationId,
        userId,
        trx
      )
      const actorOrgRole = actorMembership?.role ?? null
      const targetMembership = await OrganizationUserRepository.findMembership(
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
      await OrganizationUserRepository.deleteMember(dto.organizationId, dto.userId, trx)

      await new CreateAuditLog(this.execCtx).handle({
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
      })

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
