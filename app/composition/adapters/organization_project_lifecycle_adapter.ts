import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { OrganizationProjectLifecycleReader } from '#modules/organizations/directory/actions/ports/outbound/organization_project_lifecycle_reader'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'

interface OrganizationProjectLifecycleDependencies {
  countNonDeletedByOrgIds: typeof projectModelQueries.countByOrgIds
  countAllByOrgIds: typeof projectModelQueries.countAllByOrgIds
}

const defaultDependencies: OrganizationProjectLifecycleDependencies = {
  countNonDeletedByOrgIds: projectModelQueries.countByOrgIds,
  countAllByOrgIds: projectModelQueries.countAllByOrgIds,
}

export class OrganizationProjectLifecycleAdapter
  implements OrganizationProjectLifecycleReader
{
  constructor(
    private readonly dependencies: OrganizationProjectLifecycleDependencies =
      defaultDependencies
  ) {}

  async countNonDeletedProjects(
    organizationId: string,
    trx?: Parameters<OrganizationProjectLifecycleReader['countNonDeletedProjects']>[1]
  ): Promise<number> {
    const counts = await this.dependencies.countNonDeletedByOrgIds(
      [organizationId],
      trx as TransactionClientContract | undefined
    )
    return counts.get(organizationId) ?? 0
  }

  async countRetainedProjects(
    organizationId: string,
    trx?: Parameters<OrganizationProjectLifecycleReader['countRetainedProjects']>[1]
  ): Promise<number> {
    const counts = await this.dependencies.countAllByOrgIds(
      [organizationId],
      trx as TransactionClientContract | undefined
    )
    return counts.get(organizationId) ?? 0
  }
}
