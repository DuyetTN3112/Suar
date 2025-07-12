import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import CreateAuditLog from '#actions/audit/create_audit_log'
import { enforcePolicy } from '#actions/authorization/enforce_policy'
import type CreateNotification from '#actions/common/create_notification'
import { EntityType } from '#constants/audit_constants'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#constants/notification_constants'
import { ProjectRole } from '#constants/project_constants'
import { canTransferProjectOwnership } from '#domain/projects/project_permission_policy'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import ProjectMemberRepository from '#infra/projects/repositories/project_member_repository'
import ProjectRepository from '#infra/projects/repositories/project_repository'
import type Project from '#models/project'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

/**
 * DTO for transferring project ownership
 */
export interface TransferProjectOwnershipDTO {
  project_id: DatabaseId
  new_owner_id: DatabaseId
}

interface PersistedProjectOwnershipTransfer {
  project: Project
  oldOwnerId: DatabaseId | null
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
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  async execute(dto: TransferProjectOwnershipDTO): Promise<Project> {
    const actorId = this.requireActorId()
    const transfer = await this.transferOwnershipInTransaction(dto, actorId)
    await this.runPostCommitEffects(transfer, actorId, dto)
    return transfer.project
  }

  private requireActorId(): DatabaseId {
    const currentUserId = this.execCtx.userId
    if (!currentUserId) {
      throw new UnauthorizedException()
    }

    return currentUserId
  }

  private async loadOwnershipTransferContext(
    dto: TransferProjectOwnershipDTO,
    actorId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<{
    project: Project
    currentOwnerId: DatabaseId | null
  }> {
    const project = await ProjectRepository.findActiveForUpdate(dto.project_id, trx)
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
    actorId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<PersistedProjectOwnershipTransfer> {
    const { project, currentOwnerId } = await this.loadOwnershipTransferContext(dto, actorId, trx)

    await this.upsertProjectOwnerMembership(dto, trx)
    await this.demotePreviousOwner(dto.project_id, currentOwnerId, dto.new_owner_id, trx)
    await this.updateProjectOwner(project, dto.new_owner_id, trx)
    await this.recordOwnershipTransferAudit(currentOwnerId, actorId, dto)

    return {
      project,
      oldOwnerId: currentOwnerId,
    }
  }

  private async upsertProjectOwnerMembership(
    dto: TransferProjectOwnershipDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    const existingMember = await ProjectMemberRepository.findMember(
      dto.project_id,
      dto.new_owner_id,
      trx
    )

    if (!existingMember) {
      await ProjectMemberRepository.addMember(
        dto.project_id,
        dto.new_owner_id,
        ProjectRole.OWNER,
        trx
      )
      return
    }

    await ProjectMemberRepository.updateRole(
      dto.project_id,
      dto.new_owner_id,
      ProjectRole.OWNER,
      trx
    )
  }

  private async demotePreviousOwner(
    projectId: DatabaseId,
    currentOwnerId: DatabaseId | null,
    newOwnerId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    if (!currentOwnerId || currentOwnerId === newOwnerId) {
      return
    }

    await ProjectMemberRepository.updateRole(projectId, currentOwnerId, ProjectRole.MANAGER, trx)
  }

  private async updateProjectOwner(
    project: Project,
    newOwnerId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    project.owner_id = newOwnerId
    await ProjectRepository.save(project, trx)
  }

  private async recordOwnershipTransferAudit(
    currentOwnerId: DatabaseId | null,
    actorId: DatabaseId,
    dto: TransferProjectOwnershipDTO
  ): Promise<void> {
    await new CreateAuditLog(this.execCtx).handle({
      user_id: actorId,
      action: 'transfer_ownership',
      entity_type: EntityType.PROJECT,
      entity_id: dto.project_id,
      old_values: { owner_id: currentOwnerId },
      new_values: { owner_id: dto.new_owner_id },
    })
  }

  private async transferOwnershipInTransaction(
    dto: TransferProjectOwnershipDTO,
    actorId: DatabaseId
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
    actorId: DatabaseId,
    dto: TransferProjectOwnershipDTO
  ): Promise<void> {
    void emitter.emit('project:ownership:transferred', {
      projectId: dto.project_id,
      fromUserId: transfer.oldOwnerId ?? '',
      toUserId: dto.new_owner_id,
      transferredBy: actorId,
    })

    await CacheService.deleteByPattern(`organization:tasks:*`)

    if (transfer.oldOwnerId) {
      await this.sendNotifications(transfer.project, transfer.oldOwnerId, dto.new_owner_id)
    }
  }

  private async sendNotifications(
    project: Project,
    oldOwnerId: DatabaseId,
    newOwnerId: DatabaseId
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
