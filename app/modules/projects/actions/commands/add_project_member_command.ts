import type { AddProjectMemberDTO } from '../dtos/request/add_project_member_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActorLookup } from '#modules/projects/actions/ports/outbound/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/actions/ports/outbound/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/actions/ports/outbound/project_event_publisher'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectOrganizationAccessReader } from '#modules/projects/actions/ports/outbound/project_organization_access'
import type { ProjectPostCommitFailureObserver } from '#modules/projects/actions/ports/outbound/project_post_commit_failure_observer'
import type { ProjectRoleStaffingReader } from '#modules/projects/actions/ports/outbound/project_role_staffing_reader'
import type { ProjectTransactionRunner } from '#modules/projects/actions/ports/outbound/project_transaction'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { canAddProjectMember } from '#modules/projects/domain/project_permission_policy'
import { buildProjectMembershipEvent } from '#modules/projects/observability/project_event_factory'

/**
 * Command to add a member to a project
 *
 * Business Rules:
 * - Only the project owner/creator or Organization owner/admin can add members
 * - User must be in the same organization
 * - User cannot already be a member
 * - Validates project_role_id exists (FK validation)
 * - Sends notification to the added user
 *
 * @extends {BaseCommand<AddProjectMemberDTO, void>}
 */
export default class AddProjectMemberCommand extends BaseCommand<AddProjectMemberDTO> {
  constructor(
    execCtx: ProjectActionContext,
    transactionRunner: ProjectTransactionRunner,
    private readonly projects: ProjectLifecycleRepository,
    private readonly memberships: ProjectMembershipRepository,
    private readonly actorLookup: ProjectActorLookup,
    private readonly organizationAccessReader: ProjectOrganizationAccessReader,
    private readonly roleStaffingReader: ProjectRoleStaffingReader,
    private readonly projectEventPublisher: ProjectEventPublisher,
    private readonly projectAuditEventPublisher: ProjectAuditEventPublisher,
    private readonly postCommitFailures?: ProjectPostCommitFailureObserver
  ) {
    super(execCtx, transactionRunner)
  }

  /**
   * Execute the command
   *
   * @param dto - Validated AddProjectMemberDTO
   */
  async handle(dto: AddProjectMemberDTO): Promise<void> {
    const userId = this.getCurrentUserId()
    const startedAt = Date.now()
    platformOperationalLogger.log(
      'info',
      buildProjectMembershipEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.PROJECT_MEMBER_ADDITION_STARTED,
        eventFamily: 'membership',
        subsystem: 'project_membership',
        workflow: 'project_add_member',
        stage: 'started',
        outcome: 'success',
        projectId: dto.project_id,
        targetType: 'project_member',
        targetId: dto.user_id,
        change: {
          project_role: dto.project_role,
          project_professional_role_id: dto.project_professional_role_id,
        },
        retentionClass: 'transient_runtime',
      })
    )

    try {
      const completed = await this.executeInTransaction(async (trx) => {
        // 1. Load project
        const project = await this.projects.findDetail(dto.project_id, trx)

        // 2-6. Validate via pure rule
        await this.actorLookup.findProjectActor(userId, trx)
        const organizationAccess = await this.organizationAccessReader.findOrganizationAccess(
          {
            organizationId: project.organization_id,
            actorUserId: userId,
          },
          trx
        )
        await this.organizationAccessReader.ensureApprovedMember(
          project.organization_id,
          dto.user_id,
          trx
        )
        const existingMember = await this.memberships.findMember(
          dto.project_id,
          dto.user_id,
          trx
        )

        enforcePolicy(
          canAddProjectMember({
            actorId: userId,
            actorOrgRole: organizationAccess?.actorOrganizationRole ?? null,
            projectOwnerId: project.owner_id ?? '',
            projectCreatorId: project.creator_id,
            targetRole: dto.project_role,
            isTargetOrgMember: true,
            isAlreadyMember: !!existingMember,
          })
        )

        // Load user to be added (for audit log)
        const userToAdd = await this.actorLookup.findProjectActor(dto.user_id, trx)
        const professionalRole = dto.project_professional_role_id
          ? await this.roleStaffingReader.findRole(dto.project_professional_role_id)
          : null

        if (
          dto.project_professional_role_id &&
          (!professionalRole || professionalRole.projectId !== dto.project_id)
        ) {
          throw new ValidationException('Professional role không thuộc dự án này')
        }

        // 7. Add user as member
        await this.memberships.addMember(
          dto.project_id,
          dto.user_id,
          dto.project_role,
          dto.project_professional_role_id,
          trx
        )

        await this.projectAuditEventPublisher.publishProjectAudit(
          this.execCtx,
          {
            action: 'add_member',
            entityId: project.id,
            oldValues: null,
            newValues: {
              user_id: dto.user_id,
              username: userToAdd?.username ?? null,
              project_role: dto.project_role,
              project_professional_role_id: dto.project_professional_role_id,
              project_professional_role_name: professionalRole?.name ?? null,
            },
          },
          trx
        )
        return {
          projectId: project.id,
          organizationId: project.organization_id,
          professionalRoleName: professionalRole?.name ?? null,
        }
      })

      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildProjectMembershipEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.PROJECT_MEMBER_ADDITION_COMPLETED,
          eventFamily: 'membership',
          subsystem: 'project_membership',
          workflow: 'project_add_member',
          stage: 'completed',
          outcome: 'success',
          projectId: completed.projectId,
          targetType: 'project_member',
          targetId: dto.user_id,
          organizationId: completed.organizationId,
          change: {
            project_role: dto.project_role,
            project_professional_role_id: dto.project_professional_role_id,
            project_professional_role_name: completed.professionalRoleName,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
        })
      )
      await this.settlePostCommitEffect(
        'project.member.added',
        () =>
          this.projectEventPublisher.publishProjectMemberAdded({
            projectId: dto.project_id,
            userId: dto.user_id,
            project_role: dto.project_role,
            addedBy: userId,
          }),
        {
          projectId: dto.project_id,
          actorId: userId,
        },
        this.postCommitFailures
      )
    } catch (error) {
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildProjectMembershipEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.PROJECT_MEMBER_ADDITION_FAILED,
          eventFamily: 'membership',
          subsystem: 'project_membership',
          workflow: 'project_add_member',
          stage: 'failed',
          outcome: 'failure',
          projectId: dto.project_id,
          targetType: 'project_member',
          targetId: dto.user_id,
          change: {
            project_role: dto.project_role,
            project_professional_role_id: dto.project_professional_role_id,
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
}
