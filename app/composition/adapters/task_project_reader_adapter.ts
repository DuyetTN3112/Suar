import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import type {
  TaskProjectOption,
  TaskProjectReader,
  TaskProjectSummary,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'

export class TaskProjectReaderAdapter implements TaskProjectReader {
  ensureProjectBelongsToOrganization(
    projectId: string,
    organizationId: string,
    trx?: Parameters<TaskProjectReader['ensureProjectBelongsToOrganization']>[2]
  ): Promise<void> {
    return projectModelQueries.validateBelongsToOrg(
      projectId,
      organizationId,
      trx as TransactionClientContract | undefined
    )
  }

  listProjectsByOrganization(
    organizationId: string,
    trx?: Parameters<TaskProjectReader['listProjectsByOrganization']>[1]
  ): Promise<TaskProjectOption[]> {
    return projectModelQueries.listSimpleByOrganization(
      organizationId,
      trx as TransactionClientContract | undefined
    )
  }

  async findProjectSummaries(
    projectIds: string[],
    trx?: Parameters<TaskProjectReader['findProjectSummaries']>[1]
  ): Promise<TaskProjectSummary[]> {
    const projects = await projectModelQueries.findSummariesByIds(
      projectIds,
      trx as TransactionClientContract | undefined
    )
    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      ownerId: project.owner_id,
    }))
  }
}

