import type { UpdateProjectMemberDTO } from '../dtos/request/update_project_member_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
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

    await this.executeInTransaction(async (trx) => {
      const project = await projectModelQueries.findActiveOrFail(dto.project_id, trx)
      const actor = await this.actorLookup.findProjectActor(userId, trx)
      const organizationAccess = await this.organizationAccessReader.findOrganizationAccess(
        { organizationId: project.organization_id, actorUserId: userId },
        trx
      )
      const existingMember = await projectMemberQueries.findMember(dto.project_id, dto.user_id, trx)

      if (!existingMember) {
        throw new Error('Thành viên không tồn tại trong dự án')
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
      await projectMemberMutations.updateRole(dto.project_id, dto.user_id, dto.project_role, trx)

      await this.projectAuditEventPublisher.publishProjectAudit(this.execCtx, {
        action: 'update_member_role',
        entityId: project.id,
        oldValues: { user_id: dto.user_id, project_role: oldRole },
        newValues: { user_id: dto.user_id, project_role: dto.project_role },
      })
    })

    await this.projectEventPublisher.publishProjectMemberAdded({
      projectId: dto.project_id,
      userId: dto.user_id,
      project_role: dto.project_role,
      addedBy: userId,
    })
  }
}
