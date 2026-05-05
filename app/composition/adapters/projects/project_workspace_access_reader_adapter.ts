import { organizationRouteAccessReader } from '#composition/organizations/access/organization_access_read_composition'
import { ProjectWorkspaceAccessReader } from '#modules/projects/actions/ports/outbound/project_workspace_access_reader'
import { canEnterProjectWorkspace } from '#modules/projects/domain/project-members/project_permission_policy'
import * as projectMemberQueries from '#modules/projects/infra/repositories/project-members/read/project_member_queries'
import * as projectModelQueries from '#modules/projects/infra/repositories/project-context/read/project_model_queries'

export class ProjectWorkspaceAccessReaderAdapter extends ProjectWorkspaceAccessReader {
  async canEnter(input: {
    organizationId: string
    projectId: string
    userId: string
  }): Promise<boolean> {
    const project = await projectModelQueries.findActiveOrFail(input.projectId)
    if (project.organization_id !== input.organizationId) {
      return false
    }

    const [actorHasOrganizationProjectAccess, actorProjectRole] = await Promise.all([
      organizationRouteAccessReader.checkPermission(
        input.userId,
        input.organizationId,
        'can_view_all_projects'
      ),
      projectMemberQueries
        .getRoleName(input.projectId, input.userId)
        .then((role) => (role === 'unknown' ? null : role)),
    ])

    return canEnterProjectWorkspace({
      actorId: input.userId,
      actorHasOrganizationProjectAccess,
      actorProjectRole,
      projectCreatorId: project.creator_id,
      projectManagerId: project.manager_id,
      projectOwnerId: project.owner_id,
    }).allowed
  }

  async listEnterableByOrganization(input: {
    organizationId: string
    userId: string
    organizationProjectAccessGranted?: boolean
  }) {
    const actorHasOrganizationProjectAccess =
      input.organizationProjectAccessGranted === true ||
      (await organizationRouteAccessReader.checkPermission(
        input.userId,
        input.organizationId,
        'can_view_all_projects'
      ))

    if (actorHasOrganizationProjectAccess) {
      return projectModelQueries.listSimpleByOrganization(input.organizationId)
    }

    const candidates = await projectModelQueries.listSimpleByOrganizationForUser(
      input.organizationId,
      input.userId
    )

    return candidates
      .filter(
        (project) =>
          canEnterProjectWorkspace({
            actorId: input.userId,
            actorHasOrganizationProjectAccess: false,
            actorProjectRole: project.projectRole,
            projectCreatorId: project.creatorId,
            projectManagerId: project.managerId,
            projectOwnerId: project.ownerId,
          }).allowed
      )
      .map((project) => ({
        id: project.id,
        name: project.name,
      }))
  }
}
