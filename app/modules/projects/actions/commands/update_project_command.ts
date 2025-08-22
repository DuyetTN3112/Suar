import type { UpdateProjectDTO } from '../dtos/request/update_project_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectActorLookup } from '#modules/projects/application/ports/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import { canUpdateProjectFields } from '#modules/projects/domain/project_permission_policy'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { UsersPublicApiProjectActorLookup } from '#modules/projects/infra/adapters/users_public_api_project_actor_lookup'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectMutations from '#modules/projects/infra/repositories/write/project_mutations'
import type { ProjectRecord } from '#modules/projects/types/project_records'

/**
 * Command to update an existing project
 *
 * Business Rules:
 * - Owner can update all fields
 * - Superadmin can update all fields
 * - Manager can update: description, start_date, end_date, status
 * - Logs all field changes to audit trail
 *
 * @extends {BaseCommand<UpdateProjectDTO, ProjectRecord>}
 */
export default class UpdateProjectCommand extends BaseCommand<
  UpdateProjectDTO,
  ProjectRecord
> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly actorLookup: ProjectActorLookup = new UsersPublicApiProjectActorLookup(),
    private readonly organizationAccessReader: ProjectOrganizationAccessReader = new OrganizationPublicApiProjectOrganizationAccessReader(),
    private readonly projectEventPublisher: ProjectEventPublisher = new InProcessProjectEventPublisher(),
    private readonly projectAuditEventPublisher: ProjectAuditEventPublisher = new AuditEventProjectAuditEventPublisher()
  ) {
    super(execCtx)
  }

  /**
   * Execute the command
   *
   * @param dto - Validated UpdateProjectDTO
   * @returns Updated project
   */
  async handle(dto: UpdateProjectDTO): Promise<ProjectRecord> {
    const userId = this.getCurrentUserId()

    // Check if there are any updates
    if (!dto.hasUpdates()) {
      throw new BusinessLogicException('Không có thay đổi nào để cập nhật')
    }

    const result = await this.executeInTransaction(async (trx) => {
      // 1. Load project with lock (prevents concurrent updates)
      const project = await projectMutations.findActiveForUpdateRecord(dto.project_id, trx)

      // 2. Check permissions via pure rule
      const actor = await this.actorLookup.findProjectActor(userId, trx)
      const organizationAccess = await this.organizationAccessReader.findOrganizationAccess(
        {
          organizationId: project.organization_id,
          actorUserId: userId,
        },
        trx
      )
      const projectMember = await projectMemberQueries.findMember(dto.project_id, userId, trx)
      const actorProjectRole = projectMember?.project_role ?? null

      const fieldResult = canUpdateProjectFields(
        {
          actorId: userId,
          actorSystemRole: actor?.systemRole ?? null,
          actorOrgRole: organizationAccess?.actorOrganizationRole ?? null,
          actorProjectRole,
          projectCreatorId: project.creator_id,
          projectOwnerId: project.owner_id ?? '',
          projectOrganizationId: project.organization_id,
        },
        dto.getUpdatedFields()
      )
      enforcePolicy(fieldResult)

      // 3. Store old values for audit
      const oldValues = this.getTrackedFields(project)

      // 4. Update project fields
      const updateData = dto.toObject()
      const updatedProject = await projectMutations.updateByIdRecord(project.id, updateData, trx)

      // 5. Get new values
      const newValues = this.getTrackedFields(updatedProject)

      // 6. Log audit trail for each changed field
      await this.logFieldChanges(project.id, oldValues, newValues, dto.getUpdatedFields())

      return {
        project: updatedProject,
        projectUpdatedEvent: {
          projectId: project.id,
          updatedBy: userId,
          changes: updateData,
        },
      }
    })

    await this.projectEventPublisher.publishProjectUpdated(result.projectUpdatedEvent)

    return result.project
  }

  /**
   * Get tracked field values for audit
   */
  private getTrackedFields(project: ProjectRecord): Record<string, unknown> {
    return {
      name: project.name,
      description: project.description,
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date,
      manager_id: project.manager_id,
      owner_id: project.owner_id,
      visibility: project.visibility,
      budget: project.budget,
    }
  }

  /**
   * Log changes for each updated field
   */
  private async logFieldChanges(
    projectId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    updatedFields: string[]
  ): Promise<void> {
    for (const field of updatedFields) {
      if (oldValues[field] !== newValues[field]) {
        if (this.execCtx.userId) {
          await this.projectAuditEventPublisher.publishProjectAudit(this.execCtx, {
            action: 'update',
            entityId: projectId,
            oldValues: { [field]: oldValues[field] },
            newValues: {
              [field]: newValues[field],
            },
          })
        }
      }
    }
  }
}
