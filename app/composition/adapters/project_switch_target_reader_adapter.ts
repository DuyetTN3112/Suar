import { ProjectSwitchTargetReader } from '#modules/projects/actions/ports/outbound/project_switch_target_reader'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'

export class ProjectSwitchTargetReaderAdapter extends ProjectSwitchTargetReader {
  async find(projectId: string) {
    const project = await projectModelQueries.findActiveOrFail(projectId)
    return {
      id: project.id,
      name: project.name,
      organizationId: project.organization_id,
    }
  }
}
