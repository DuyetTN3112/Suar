import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { canTransferProjectOwnership } from '#modules/projects/domain/project_permission_policy'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectMemberMutations from '#modules/projects/infra/repositories/write/project_member_mutations'
import * as projectMutations from '#modules/projects/infra/repositories/write/project_mutations'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import type { ProjectRecord } from '#modules/projects/types/project_records'

/**
 * DTO for transferring project ownership
 */
export interface TransferProjectOwnershipDTO {
  project_id: string
  new_owner_id: string
}

interface PersistedProjectOwnershipTransfer {
  project: ProjectRecord
  oldOwnerId: string | null
}

/**
 * Command: Transfer Project Ownership
 *
 * Migrate từ stored procedure: transfer_project_ownership
 *
 * Business rules:
 * - Chỉ owner hoặc org_admin mới có thể transfer
 * - Không thể transfer cho chính mình
 * - New owner phải là member của organization
 * - Thêm new owner vào project_members nếu chưa có
 * - Cập nhật role: old owner → project_manager, new owner → project_owner
 */
export default class TransferProjectOwnershipCommand {
  constructor(
    protected execCtx: ProjectActionContext,
    private createNotification: NotificationCreator
  ) {}

  async execute(dto: TransferProjectOwnershipDTO): Promise<ProjectRecord> {
    const actorId = this.requireActorId()
    const transfer = await this.transferOwnershipInTransaction(dto, actorId)
    await this.runPostCommitEffects(transfer, actorId, dto)
    return transfer.project
  }

  private requireActorId(): string {
    const currentUserId = this.execCtx.userId
    if (!currentUserId) {
      throw new UnauthorizedException()
    }

    return currentUserId
  }

  private async loadOwnershipTransferContext(
    dto: TransferProjectOwnershipDTO,
    actorId: string,
    trx: TransactionClientContract
  ): Promise<{
    project: ProjectRecord
    currentOwnerId: string | null
  }> {
    const project = await projectMutations.findActiveForUpdateRecord(dto.project_id, trx)
    const currentOwnerId = project.owner_id ?? null

    const actorOrgRole = await DefaultProjectDependencies.organization.getMembershipRole(
      project.organization_id,
      actorId,
      trx
    )
    const isNewOwnerOrgMember = await DefaultProjectDependencies.organization.isApprovedMember(
      project.organization_id,
      dto.new_owner_id,
      trx
    )

    enforcePolicy(
      canTransferProjectOwnership({
        actorId,
        actorOrgRole,
        projectOwnerId: currentOwnerId ?? '',
        newOwnerId: dto.new_owner_id,
        isNewOwnerOrgMember,
      })
    )

    return { project, currentOwnerId }
  }

  private async persistOwnershipTransfer(
    dto: TransferProjectOwnershipDTO,
    actorId: string,
    trx: TransactionClientContract
  ): Promise<PersistedProjectOwnershipTransfer> {
    const { project, currentOwnerId } = await this.loadOwnershipTransferContext(dto, actorId, trx)

    await this.upsertProjectOwnerMembership(dto, trx)
    await this.demotePreviousOwner(dto.project_id, currentOwnerId, dto.new_owner_id, trx)
    const updatedProject = await this.updateProjectOwner(project, dto.new_owner_id, trx)
    await this.recordOwnershipTransferAudit(currentOwnerId, actorId, dto)

    return {
      project: updatedProject,
      oldOwnerId: currentOwnerId,
    }
  }

  private async upsertProjectOwnerMembership(
    dto: TransferProjectOwnershipDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    const existingMember = await projectMemberQueries.findMember(
      dto.project_id,
      dto.new_owner_id,
      trx
    )

    if (!existingMember) {
      await projectMemberMutations.addMember(
        dto.project_id,
        dto.new_owner_id,
        ProjectRole.OWNER,
        trx
      )
      return
    }

    await projectMemberMutations.updateRole(
      dto.project_id,
      dto.new_owner_id,
      ProjectRole.OWNER,
      trx
    )
  }

  private async demotePreviousOwner(
    projectId: string,
    currentOwnerId: string | null,
    newOwnerId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    if (!currentOwnerId || currentOwnerId === newOwnerId) {
      return
    }

    await projectMemberMutations.updateRole(projectId, currentOwnerId, ProjectRole.MANAGER, trx)
  }

  private async updateProjectOwner(
    project: ProjectRecord,
    newOwnerId: string,
    trx: TransactionClientContract
  ): Promise<ProjectRecord> {
    return projectMutations.updateOwnerRecord(project.id, newOwnerId, trx)
  }

  private async recordOwnershipTransferAudit(
    currentOwnerId: string | null,
    actorId: string,
    dto: TransferProjectOwnershipDTO
  ): Promise<void> {
    await auditPublicApi.log(
      {
        user_id: actorId,
        action: 'transfer_ownership',
        entity_type: EntityType.PROJECT,
        entity_id: dto.project_id,
        old_values: { owner_id: currentOwnerId },
        new_values: { owner_id: dto.new_owner_id },
      },
      this.execCtx
    )
  }

  private async transferOwnershipInTransaction(
    dto: TransferProjectOwnershipDTO,
    actorId: string
  ): Promise<PersistedProjectOwnershipTransfer> {
    const trx: TransactionClientContract = await db.transaction()

    try {
      const transfer = await this.persistOwnershipTransfer(dto, actorId, trx)
      await trx.commit()
      return transfer
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async runPostCommitEffects(
    transfer: PersistedProjectOwnershipTransfer,
    actorId: string,
    dto: TransferProjectOwnershipDTO
  ): Promise<void> {
    void emitter.emit('project:ownership:transferred', {
      projectId: dto.project_id,
      fromUserId: transfer.oldOwnerId ?? '',
      toUserId: dto.new_owner_id,
      transferredBy: actorId,
    })

    if (transfer.oldOwnerId) {
      await this.sendNotifications(transfer.project, transfer.oldOwnerId, dto.new_owner_id)
    }
  }

  private async sendNotifications(
    project: ProjectRecord,
    oldOwnerId: string,
    newOwnerId: string
  ): Promise<void> {
    try {
      await this.createNotification.handle({
        user_id: newOwnerId,
        title: 'Bạn đã trở thành project owner',
        message: `Bạn đã được chuyển giao quyền sở hữu project "${project.name}".`,
        type: BACKEND_NOTIFICATION_TYPES.PROJECT_OWNERSHIP_TRANSFERRED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.PROJECT,
        related_entity_id: project.id,
      })

      await this.createNotification.handle({
        user_id: oldOwnerId,
        title: 'Đã chuyển giao quyền sở hữu project',
        message: `Quyền sở hữu project "${project.name}" đã được chuyển giao.`,
        type: BACKEND_NOTIFICATION_TYPES.PROJECT_OWNERSHIP_TRANSFERRED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.PROJECT,
        related_entity_id: project.id,
      })
    } catch (error) {
      loggerService.error('[TransferProjectOwnershipCommand] Failed to send notifications:', error)
    }
  }
}
