import type { UpdateProjectMemberDTO } from '../dtos/request/update_project_member_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectActorLookup } from '#modules/projects/application/ports/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import { canUpdateProject } from '#modules/projects/domain/project_permission_policy'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { UsersPublicApiProjectActorLookup } from '#modules/projects/infra/adapters/users_public_api_project_actor_lookup'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import * as projectMemberMutations from '#modules/projects/infra/repositories/write/project_member_mutations'
import { buildProjectMembershipEvent } from '#modules/projects/observability/project_event_factory'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'

export default class UpdateProjectMemberCommand extends BaseCommand<UpdateProjectMemberDTO> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly actorLookup: ProjectActorLookup = new UsersPublicApiProjectActorLookup(),
    private readonly organizationAccessReader: ProjectOrganizationAccessReader = new OrganizationPublicApiProjectOrganizationAccessReader(),
    private readonly projectEventPublisher: ProjectEventPublisher = new InProcessProjectEventPublisher(),
    private readonly projectAuditEventPublisher: ProjectAuditEventPublisher = new AuditEventProjectAuditEventPublisher()
  ) {
    super(execCtx)
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
      await this.executeInTransaction(async (trx) => {
      const project = await projectModelQueries.findActiveOrFail(dto.project_id, trx)
      const actor = await this.actorLookup.findProjectActor(userId, trx)
      const organizationAccess = await this.organizationAccessReader.findOrganizationAccess(
        { organizationId: project.organization_id, actorUserId: userId },
        trx
      )
      const existingMember = await projectMemberQueries.findMember(dto.project_id, dto.user_id, trx)
      const professionalRole = dto.project_professional_role_id
        ? await skillPublicApi.findProjectProfessionalRoleById(
            dto.project_professional_role_id,
            false,
            trx
          )
        : null

      if (!existingMember) {
        throw new Error('Thành viên không tồn tại trong dự án')
      }

      if (dto.project_professional_role_id && (!professionalRole || professionalRole.project_id !== dto.project_id)) {
        throw new Error('Professional role không thuộc dự án này')
      }

      enforcePolicy(
        canUpdateProject({
          actorId: userId,
          actorSystemRole: actor?.systemRole ?? null,
          actorOrgRole: organizationAccess?.actorOrganizationRole ?? null,
          projectOwnerId: project.owner_id ?? '',
          projectCreatorId: project.creator_id,
          actorProjectRole: existingMember.project_role,
          projectOrganizationId: project.organization_id,
        })
      )

      const oldRole = existingMember.project_role
      const oldProfessionalRoleId = existingMember.project_professional_role_id
      await projectMemberMutations.updateRole(
        dto.project_id,
        dto.user_id,
        dto.project_role,
        dto.project_professional_role_id,
        trx
      )

      await this.projectAuditEventPublisher.publishProjectAudit(this.execCtx, {
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
          projectId: project.id,
          targetType: 'project_member',
          targetId: dto.user_id,
          organizationId: project.organization_id,
          change: {
            old_project_role: oldRole,
            project_role: dto.project_role,
            old_project_professional_role_id: oldProfessionalRoleId,
            project_professional_role_id: dto.project_professional_role_id,
            project_professional_role_name: professionalRole?.name ?? null,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
        })
      )
      })

      await this.projectEventPublisher.publishProjectMemberAdded({
        projectId: dto.project_id,
        userId: dto.user_id,
        project_role: dto.project_role,
        addedBy: userId,
      })
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
