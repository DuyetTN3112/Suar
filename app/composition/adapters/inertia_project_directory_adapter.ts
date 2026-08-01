import { organizationRouteAccessReader } from '#composition/organization_access_read_composition'
import {
  InertiaProjectDirectory,
  type InertiaProjectOption,
} from '#modules/http/actions/ports/outbound/inertia_project_directory'
import { canEnterProjectWorkspace } from '#modules/projects/domain/project_permission_policy'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'

export class InertiaProjectDirectoryAdapter extends InertiaProjectDirectory {
  async listAccessibleByOrganization(input: {
    organizationId: string
    userId: string
    canManageOrganization: boolean
  }): Promise<InertiaProjectOption[]> {
    const actorHasOrganizationProjectAccess =
      input.canManageOrganization ||
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
