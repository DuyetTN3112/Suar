import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { projectPublicApi } from '#modules/projects/public_contracts/project_public_api'
import type {
  TaskProjectOption,
  TaskProjectReader,
} from '#modules/tasks/actions/ports/task_external_dependencies'

export class MonolithTaskProjectReader implements TaskProjectReader {
  async ensureProjectBelongsToOrganization(
    projectId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    await projectPublicApi.ensureBelongsToOrganization(projectId, organizationId, trx)
  }

  async listProjectsByOrganization(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<TaskProjectOption[]> {
    return projectPublicApi.listSimpleByOrganization(organizationId, trx)
  }
}
