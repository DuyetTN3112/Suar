import type { UpdateProjectMemberDTO } from '../dtos/request/update_project_member_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
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
import { canUpdateProject } from '#modules/projects/domain/project_permission_policy'
import { buildProjectMembershipEvent } from '#modules/projects/observability/project_event_factory'

export default class UpdateProjectMemberCommand extends BaseCommand<UpdateProjectMemberDTO> {
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

  async handle(dto: UpdateProjectMemberDTO): Promise<void> {
    const userId = this.getCurrentUserId()
    const startedAt = Date.now()
    platformOperationalLogger.log(
      'info',
      buildProjectMembershipEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.PROJECT_MEMBER_UPDATE_STARTED,
        eventFamily: 'membership',
        subsystem: 'project_membership',
        workflow: 'project_update_member',
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
        const project = await this.projects.findDetail(dto.project_id, trx)
        await this.actorLookup.findProjectActor(userId, trx)
        const organizationAccess = await this.organizationAccessReader.findOrganizationAccess(
          { organizationId: project.organization_id, actorUserId: userId },
          trx
        )
        const actorMember = await this.memberships.findMember(dto.project_id, userId, trx)
        const existingMember = await this.memberships.findMember(
          dto.project_id,
          dto.user_id,
          trx
        )
        const professionalRole = dto.project_professional_role_id
          ? await this.roleStaffingReader.findRole(dto.project_professional_role_id)
          : null

        if (!existingMember) {
          throw new NotFoundException('Thành viên không tồn tại trong dự án')
        }

        if (
          dto.project_professional_role_id &&
          (!professionalRole || professionalRole.projectId !== dto.project_id)
        ) {
          throw new ValidationException('Professional role không thuộc dự án này')
        }

        enforcePolicy(
          canUpdateProject({
            actorId: userId,
            actorOrgRole: organizationAccess?.actorOrganizationRole ?? null,
            projectOwnerId: project.owner_id ?? '',
            projectCreatorId: project.creator_id,
            actorProjectRole: actorMember?.projectRole ?? null,
            projectOrganizationId: project.organization_id,
          })
        )

        const oldRole = existingMember.projectRole
        const oldProfessionalRoleId = existingMember.projectProfessionalRoleId
        await this.memberships.updateRole(
          dto.project_id,
          dto.user_id,
          dto.project_role,
          dto.project_professional_role_id,
          trx
        )

        await this.projectAuditEventPublisher.publishProjectAudit(
          this.execCtx,
          {
            action: 'update_member_role',
            entityId: project.id,
            oldValues: {
              user_id: dto.user_id,
              project_role: oldRole,
              project_professional_role_id: oldProfessionalRoleId,
            },
            newValues: {
              user_id: dto.user_id,
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
          oldRole,
          oldProfessionalRoleId,
          professionalRoleName: professionalRole?.name ?? null,
        }
      })

      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildProjectMembershipEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.PROJECT_MEMBER_UPDATE_COMPLETED,
          eventFamily: 'membership',
          subsystem: 'project_membership',
          workflow: 'project_update_member',
          stage: 'completed',
          outcome: 'success',
          projectId: completed.projectId,
          targetType: 'project_member',
          targetId: dto.user_id,
          organizationId: completed.organizationId,
          change: {
            old_project_role: completed.oldRole,
            project_role: dto.project_role,
            old_project_professional_role_id: completed.oldProfessionalRoleId,
            project_professional_role_id: dto.project_professional_role_id,
            project_professional_role_name: completed.professionalRoleName,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
        })
      )
      await this.settlePostCommitEffect(
        'project.member.updated',
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
          eventName: PLATFORM_EVENT_NAMES.PROJECT_MEMBER_UPDATE_FAILED,
          eventFamily: 'membership',
          subsystem: 'project_membership',
          workflow: 'project_update_member',
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
