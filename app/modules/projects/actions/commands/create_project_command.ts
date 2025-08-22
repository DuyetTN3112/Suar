import type { CreateProjectDTO } from '../dtos/request/create_project_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import type { ProjectPermissionReader } from '#modules/projects/application/ports/project_permission_reader'
import { canCreateProject } from '#modules/projects/domain/project_permission_policy'
import { validateProjectStatus, validateProjectDates } from '#modules/projects/domain/project_state_rules'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { PublicApiProjectPermissionReader } from '#modules/projects/infra/adapters/public_api_project_permission_reader'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import * as projectMemberMutations from '#modules/projects/infra/repositories/write/project_member_mutations'
import * as projectMutations from '#modules/projects/infra/repositories/write/project_mutations'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import type { ProjectDetailRecord } from '#modules/projects/types/project_records'

/**
 * Command to create a new project
 *
 * Di chuyển logic từ database triggers:
 * - before_insert_project: Check permission can_create_project, set owner_id, manager_id
 * - after_project_insert: Add owner to project_members với project_role_id = 1
 *
 * Business Rules:
 * - Check permission can_create_project (từ trigger before_insert_project)
 * - Owner mặc định là creator
 * - Manager mặc định là owner
 * - Creator tự động thành project_members với role owner (project_role_id = 1)
 *
 * @extends {BaseCommand<CreateProjectDTO, ProjectDetailRecord>}
 */
export default class CreateProjectCommand extends BaseCommand<
  CreateProjectDTO,
  ProjectDetailRecord
> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly permissionReader: ProjectPermissionReader = new PublicApiProjectPermissionReader(),
    private readonly organizationAccessReader: ProjectOrganizationAccessReader = new OrganizationPublicApiProjectOrganizationAccessReader(),
    private readonly projectEventPublisher: ProjectEventPublisher = new InProcessProjectEventPublisher(),
    private readonly projectAuditEventPublisher: ProjectAuditEventPublisher = new AuditEventProjectAuditEventPublisher()
  ) {
    super(execCtx)
  }

  async handle(dto: CreateProjectDTO): Promise<ProjectDetailRecord> {
    const userId = this.getCurrentUserId()

    const createdProject = await this.executeInTransaction(async (trx) => {
      // 1. Check permission can_create_project (logic từ procedure)
      const hasPermission = await this.permissionReader.checkOrganizationPermission({
        actorUserId: userId,
        organizationId: dto.organization_id,
        permission: 'can_create_project',
        trx,
      })

      enforcePolicy(
        canCreateProject({
          actorSystemRole: null,
          isOrgAdminOrOwner: hasPermission,
        })
      )

      const isSuperadmin = await this.permissionReader.isSystemSuperadmin(userId, trx)

      // 2. v3: Validate status via pure rule
      if (dto.status) {
        enforcePolicy(validateProjectStatus(dto.status))
      }

      // 3. Validate dates via pure rule
      if (dto.start_date && dto.end_date) {
        enforcePolicy(
          validateProjectDates({
            startDate: dto.start_date.toISO() ?? null,
            endDate: dto.end_date.toISO() ?? null,
          })
        )
      }

      // 4. Organization members must be approved unless the actor is a superadmin bypass.
      if (!isSuperadmin) {
        await this.organizationAccessReader.ensureApprovedMember(dto.organization_id, userId, trx)
      }

      // 5. Set owner_id and manager_id
      const ownerId = userId
      const managerId = dto.manager_id ?? ownerId

      // 6. Create the project
      const project = await projectMutations.createRecord(
        {
          name: dto.name,
          description: dto.description ?? null,
          organization_id: dto.organization_id,
          creator_id: userId,
          owner_id: ownerId,
          manager_id: managerId,
          status: dto.status,
          visibility: dto.visibility,
          start_date: dto.start_date ?? null,
          end_date: dto.end_date ?? null,
          budget: dto.budget,
        },
        trx
      )

      // 7. Add owner as project member (from trigger)
      await projectMemberMutations.addMember(project.id, ownerId, ProjectRole.OWNER, trx)

      await this.projectAuditEventPublisher.publishProjectAudit(this.execCtx, {
        action: 'create',
        entityId: project.id,
        oldValues: null,
        newValues: project,
      })

      return project
    })

    const result = await this.loadProjectWithRelations(createdProject.id)

    await this.projectEventPublisher.publishProjectCreated({
      projectId: result.id,
      creatorId: userId,
      organizationId: result.organization_id,
      name: result.name,
    })

    return result
  }

  /**
   * Load project with all necessary relations
   */
  private async loadProjectWithRelations(
    projectId: string
  ): Promise<ProjectDetailRecord> {
    return projectModelQueries.findDetailWithRelationsRecord(projectId)
  }
}
