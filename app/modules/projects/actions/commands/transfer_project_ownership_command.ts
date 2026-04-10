import type {
  ProjectOrganizationReader,
  ProjectUserReader,
} from '../ports/outbound/project_external_dependencies.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectAuditEventPublisher } from '#modules/projects/actions/ports/outbound/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/actions/ports/outbound/project_event_publisher'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectNotificationStager } from '#modules/projects/actions/ports/outbound/project_notification_stager'
import type { ProjectPostCommitFailureObserver } from '#modules/projects/actions/ports/outbound/project_post_commit_failure_observer'
import type {
  ProjectTransaction,
  ProjectTransactionRunner,
} from '#modules/projects/actions/ports/outbound/project_transaction'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { canTransferProjectOwnership } from '#modules/projects/domain/project_permission_policy'
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
export default class TransferProjectOwnershipCommand extends BaseCommand<
  TransferProjectOwnershipDTO,
  ProjectRecord
> {
  constructor(
    execCtx: ProjectActionContext,
    transactionRunner: ProjectTransactionRunner,
    private readonly projects: ProjectLifecycleRepository,
    private readonly memberships: ProjectMembershipRepository,
    private readonly notificationStager: ProjectNotificationStager,
    private readonly organizationReader: ProjectOrganizationReader,
    private readonly userReader: ProjectUserReader,
    private readonly projectEvents: ProjectEventPublisher,
    private readonly auditEvents: ProjectAuditEventPublisher,
    private readonly postCommitFailures?: ProjectPostCommitFailureObserver
  ) {
    super(execCtx, transactionRunner)
  }

  async handle(dto: TransferProjectOwnershipDTO): Promise<ProjectRecord> {
    const actorId = this.getCurrentUserId()
    const transfer = await this.transferOwnershipInTransaction(dto, actorId)
    await this.runPostCommitEffects(transfer, actorId, dto)
    return transfer.project
  }

  execute(dto: TransferProjectOwnershipDTO): Promise<ProjectRecord> {
    return this.handle(dto)
  }

  private async loadOwnershipTransferContext(
    dto: TransferProjectOwnershipDTO,
    actorId: string,
    trx: ProjectTransaction
  ): Promise<{
    project: ProjectRecord
    currentOwnerId: string | null
  }> {
    const project = await this.projects.findForUpdate(dto.project_id, trx)
    const currentOwnerId = project.owner_id ?? null

    const actorOrgRole = await this.organizationReader.getMembershipRole(
      project.organization_id,
      actorId,
      trx
    )
    const isNewOwnerOrgMember = await this.organizationReader.isApprovedMember(
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

    const isNewOwnerActive = await this.userReader.isActiveUser(dto.new_owner_id, trx)
    if (!isNewOwnerActive) {
      throw new BusinessLogicException('Chủ sở hữu mới phải là người dùng active')
    }

    return { project, currentOwnerId }
  }

  private async persistOwnershipTransfer(
    dto: TransferProjectOwnershipDTO,
    actorId: string,
    trx: ProjectTransaction
  ): Promise<PersistedProjectOwnershipTransfer> {
    const { project, currentOwnerId } = await this.loadOwnershipTransferContext(dto, actorId, trx)

    await this.upsertProjectOwnerMembership(dto, trx)
    await this.demotePreviousOwner(dto.project_id, currentOwnerId, dto.new_owner_id, trx)
    const updatedProject = await this.updateProjectOwner(project, dto.new_owner_id, trx)
    await this.recordOwnershipTransferAudit(currentOwnerId, actorId, dto, trx)

    const occurredAt = updatedProject.updated_at
    if (!occurredAt) {
      throw new InvariantViolationException(
        'Persisted project ownership transfer is missing its update timestamp'
      )
    }
    await this.stageNotifications(
      updatedProject,
      currentOwnerId,
      dto.new_owner_id,
      actorId,
      occurredAt,
      trx
    )

    return {
      project: updatedProject,
      oldOwnerId: currentOwnerId,
    }
  }

  private async upsertProjectOwnerMembership(
    dto: TransferProjectOwnershipDTO,
    trx: ProjectTransaction
  ): Promise<void> {
    const existingMember = await this.memberships.findMember(
      dto.project_id,
      dto.new_owner_id,
      trx
    )

    if (!existingMember) {
      await this.memberships.addMember(
        dto.project_id,
        dto.new_owner_id,
        ProjectRole.OWNER,
        null,
        trx
      )
      return
    }

    await this.memberships.updateRole(
      dto.project_id,
      dto.new_owner_id,
      ProjectRole.OWNER,
      existingMember.projectProfessionalRoleId,
      trx
    )
  }

  private async demotePreviousOwner(
    projectId: string,
    currentOwnerId: string | null,
    newOwnerId: string,
    trx: ProjectTransaction
  ): Promise<void> {
    if (!currentOwnerId || currentOwnerId === newOwnerId) {
      return
    }

    const previousOwner = await this.memberships.findMember(projectId, currentOwnerId, trx)
    await this.memberships.updateRole(
      projectId,
      currentOwnerId,
      ProjectRole.MANAGER,
      previousOwner?.projectProfessionalRoleId ?? null,
      trx
    )
  }

  private async updateProjectOwner(
    project: ProjectRecord,
    newOwnerId: string,
    trx: ProjectTransaction
  ): Promise<ProjectRecord> {
    return this.projects.updateOwner(project.id, newOwnerId, trx)
  }

  private async recordOwnershipTransferAudit(
    currentOwnerId: string | null,
    actorId: string,
    dto: TransferProjectOwnershipDTO,
    trx: ProjectTransaction
  ): Promise<void> {
    await this.auditEvents.publishProjectAudit(
      this.execCtx,
      {
        action: 'transfer_ownership',
        entityId: dto.project_id,
        oldValues: { owner_id: currentOwnerId },
        newValues: { owner_id: dto.new_owner_id, transferred_by: actorId },
      },
      trx
    )
  }

  private async transferOwnershipInTransaction(
    dto: TransferProjectOwnershipDTO,
    actorId: string
  ): Promise<PersistedProjectOwnershipTransfer> {
    return this.executeInTransaction((trx) => this.persistOwnershipTransfer(dto, actorId, trx))
  }

  private runPostCommitEffects(
    transfer: PersistedProjectOwnershipTransfer,
    actorId: string,
    dto: TransferProjectOwnershipDTO
  ): Promise<void> {
    return this.settlePostCommitEffect(
      'project.ownership.transferred',
      () =>
        this.projectEvents.publishProjectOwnershipTransferred({
          projectId: dto.project_id,
          fromUserId: transfer.oldOwnerId ?? '',
          toUserId: dto.new_owner_id,
          transferredBy: actorId,
        }),
      {
        projectId: dto.project_id,
        actorId,
      },
      this.postCommitFailures
    )
  }

  private async stageNotifications(
    project: ProjectRecord,
    oldOwnerId: string | null,
    newOwnerId: string,
    actorId: string,
    occurredAt: string,
    trx: ProjectTransaction
  ): Promise<void> {
    const recipients: { recipientId: string; ownershipRole: string }[] = [
      { recipientId: newOwnerId, ownershipRole: 'new_owner' },
    ]
    if (oldOwnerId && oldOwnerId !== newOwnerId) {
      recipients.push({ recipientId: oldOwnerId, ownershipRole: 'previous_owner' })
    }

    for (const recipient of recipients) {
      await this.notificationStager.stage(
        {
          eventId: buildNotificationEventId({
            eventName: 'project.ownership_transferred',
            businessEventId: `${project.id}:${oldOwnerId ?? 'none'}:${newOwnerId}:${occurredAt}`,
            recipientId: recipient.recipientId,
          }),
          schemaVersion: 1,
          type: BACKEND_NOTIFICATION_TYPES.PROJECT_OWNERSHIP_TRANSFERRED,
          recipientId: recipient.recipientId,
          scope: { kind: 'organization', id: project.organization_id },
          actor: { type: 'user', id: actorId },
          subject: {
            type: BACKEND_NOTIFICATION_ENTITY_TYPES.PROJECT,
            id: project.id,
          },
          parameters: {
            projectName: project.name,
            ownershipRole: recipient.ownershipRole,
          },
          occurredAt,
          correlationId: `${project.id}:${occurredAt}`,
        },
        { trx }
      )
    }
  }
}
