import { organizationRouteAccessReader } from '#composition/organizations/access/organization_access_read_composition'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ProjectSwitchTargetReader } from '#modules/projects/actions/ports/outbound/project_switch_target_reader'
import * as projectModelQueries from '#modules/projects/infra/repositories/project-context/read/project_model_queries'

export class ProjectSwitchTargetReaderAdapter extends ProjectSwitchTargetReader {
  async find(projectId: string, userId: string) {
    const project = await projectModelQueries.findActiveOrFail(projectId)
    const hasOrganizationProjectAccess = await organizationRouteAccessReader.checkPermission(
      userId,
      project.organization_id,
      'can_view_all_projects'
    )
    if (!hasOrganizationProjectAccess) {
      const accessibleProjects = await projectModelQueries.listSimpleByOrganizationForUser(
        project.organization_id,
        userId
      )
      if (!accessibleProjects.some((candidate) => candidate.id === project.id)) {
        throw new BusinessLogicException('Dự án không thuộc quyền truy cập của user hiện tại')
      }
    }

    return {
      id: project.id,
      name: project.name,
      organizationId: project.organization_id,
    }
  }
}
