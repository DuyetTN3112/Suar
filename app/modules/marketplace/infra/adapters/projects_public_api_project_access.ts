import type { ProjectAccessPort } from '../../application/ports/project_access_port.js'

import { projectPublicApi } from '#modules/projects/public_contracts/project_public_api'

export class ProjectsPublicApiProjectAccess implements ProjectAccessPort {
  public async canViewProjectTasks(projectId: string, userId: string): Promise<boolean> {
    return projectPublicApi.canViewMarketplaceProjectTasks(projectId, userId)
  }

  public async canManageProjectTasks(projectId: string, userId: string): Promise<boolean> {
    return projectPublicApi.canManageMarketplaceProjectTasks(projectId, userId)
  }
}
