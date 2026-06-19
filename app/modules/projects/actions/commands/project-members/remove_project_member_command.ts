import type { RemoveProjectMemberDTO } from '../../dtos/request/remove_project_member_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActorLookup } from '#modules/projects/actions/ports/outbound/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/actions/ports/outbound/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/actions/ports/outbound/project_event_publisher'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectMembershipObservability } from '#modules/projects/actions/ports/outbound/project_membership_observability'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectOrganizationAccessReader } from '#modules/projects/actions/ports/outbound/project_organization_access'
import type { ProjectPostCommitFailureObserver } from '#modules/projects/actions/ports/outbound/project_post_commit_failure_observer'
import type { ProjectTaskAssignmentInvariant } from '#modules/projects/actions/ports/outbound/project_task_assignment_invariant'
import type {
  ProjectTransaction,
  ProjectTransactionRunner,
} from '#modules/projects/actions/ports/outbound/project_transaction'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { canRemoveProjectMember } from '#modules/projects/domain/project-members/project_permission_policy'
import { buildProjectMembershipEvent } from '#modules/projects/observability/project_event_factory'

/**
 * Command to remove a member from a project
 *
 * Business Rules:
 * - Only the project owner/creator or Organization owner/admin can remove members
 * - Cannot remove the project owner or creator
 * - Tasks assigned to removed member are reassigned to manager or specified user
 *
 * @extends {BaseCommand<RemoveProjectMemberDTO, void>}
 */
export default class RemoveProjectMemberCommand extends BaseCommand<RemoveProjectMemberDTO> {
  constructor(
    execCtx: ProjectActionContext,
    transactionRunner: ProjectTransactionRunner,
    private readonly projects: ProjectLifecycleRepository,
    private readonly memberships: ProjectMembershipRepository,
    private readonly taskAssignmentInvariant: ProjectTaskAssignmentInvariant,
    private readonly actorLookup: ProjectActorLookup,
    private readonly organizationAccessReader: ProjectOrganizationAccessReader,
    private readonly projectEventPublisher: ProjectEventPublisher,
    private readonly projectAuditEventPublisher: ProjectAuditEventPublisher,
    private readonly membershipObservability: ProjectMembershipObservability,
    private readonly postCommitFailures?: ProjectPostCommitFailureObserver
  ) {
    super(execCtx, transactionRunner)
  }

  /**
   * Execute the command
   *
   * @param dto - Validated RemoveProjectMemberDTO
   */
  async handle(dto: RemoveProjectMemberDTO): Promise<void> {
    const userId = this.getCurrentUserId()
    const startedAt = Date.now()
    this.membershipObservability.log(
      'info',
      buildProjectMembershipEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.PROJECT_MEMBER_REMOVAL_STARTED,
        eventFamily: 'membership',
        subsystem: 'project_membership',
        workflow: 'project_remove_member',
        stage: 'started',
        outcome: 'success',
        projectId: dto.project_id,
        targetType: 'project_member',
        targetId: dto.user_id,
        change: {
          reason: dto.reason,
          reassign_to: dto.reassign_to,
        },
        retentionClass: 'transient_runtime',
      })
    )

    try {
      const completed = await this.executeInTransaction(async (trx) => {
        // 1. Load project
        const project = await this.projects.findDetail(dto.project_id, trx)

        // 2. Check permissions via pure rule
        await this.actorLookup.findProjectActor(userId, trx)
        const organizationAccess = await this.organizationAccessReader.findOrganizationAccess(
          {
            organizationId: project.organization_id,
            actorUserId: userId,
          },
          trx
        )

        enforcePolicy(
          canRemoveProjectMember({
            actorId: userId,
            actorOrgRole: organizationAccess?.actorOrganizationRole ?? null,
            projectOwnerId: project.owner_id ?? '',
            projectCreatorId: project.creator_id,
            targetUserId: dto.user_id,
          })
        )

        // 3. Load user to be removed (for audit log)
        const userToRemove = await this.actorLookup.findProjectActor(dto.user_id, trx)

        // 5. Get member role before removal
        const memberRole = await this.memberships.getRoleName(dto.project_id, dto.user_id, trx)

        // 6. Reassign tasks if needed
        const reassignToUserId = dto.reassign_to ?? project.manager_id ?? project.owner_id
        if (reassignToUserId === null) {
          throw new BusinessLogicException(
            'Không thể phân công lại công việc - không có người dùng hợp lệ'
          )
        }
        await this.reassignTasks(dto.project_id, dto.user_id, reassignToUserId, userId, trx)

        // 7. Remove member
        await this.memberships.deleteMember(dto.project_id, dto.user_id, trx)

        await this.projectAuditEventPublisher.publishProjectAudit(
          this.execCtx,
          {
            action: 'remove_member',
            entityId: project.id,
            oldValues: {
              user_id: dto.user_id,
              username: userToRemove?.username ?? null,
              role: memberRole,
            },
            newValues: {
              reason: dto.reason,
              reassigned_to: reassignToUserId,
            },
          },
          trx
        )
        return {
          projectId: project.id,
          organizationId: project.organization_id,
          memberRole,
          reassignToUserId,
        }
      })

      await this.membershipObservability.checkpointSafely(
        this.execCtx,
        buildProjectMembershipEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.PROJECT_MEMBER_REMOVAL_COMPLETED,
          eventFamily: 'membership',
          subsystem: 'project_membership',
          workflow: 'project_remove_member',
          stage: 'completed',
          outcome: 'success',
          projectId: completed.projectId,
          targetType: 'project_member',
          targetId: dto.user_id,
          organizationId: completed.organizationId,
          change: {
            role: completed.memberRole,
            reason: dto.reason,
            reassigned_to: completed.reassignToUserId,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
        })
      )
      await this.settlePostCommitEffect(
        'project.member.removed',
        () =>
          this.projectEventPublisher.publishProjectMemberRemoved({
            projectId: dto.project_id,
            userId: dto.user_id,
            removedBy: userId,
          }),
        {
          projectId: dto.project_id,
          actorId: userId,
        },
        this.postCommitFailures
      )
    } catch (error) {
      await this.membershipObservability.checkpointSafely(
        this.execCtx,
        buildProjectMembershipEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.PROJECT_MEMBER_REMOVAL_FAILED,
          eventFamily: 'membership',
          subsystem: 'project_membership',
          workflow: 'project_remove_member',
          stage: 'failed',
          outcome: 'failure',
          projectId: dto.project_id,
          targetType: 'project_member',
          targetId: dto.user_id,
          change: {
            reason: dto.reason,
            reassign_to: dto.reassign_to,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
          error,
        })
      )
      throw error
    }
  }

  /**
   * Reassign all tasks from removed member → delegate to Model
   */
  private async reassignTasks(
    projectId: string,
    fromUserId: string,
    toUserId: string,
    requestedByUserId: string,
    trx: ProjectTransaction
  ): Promise<void> {
    await this.taskAssignmentInvariant.reassignOrUnassignTasksForRemovedMember({
      projectId,
      removedUserId: fromUserId,
      fallbackAssigneeUserId: toUserId,
      requestedByUserId,
      trx,
    })
  }
}
