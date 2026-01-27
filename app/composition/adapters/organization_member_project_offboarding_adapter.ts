import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { OrganizationMemberProjectOffboarding } from '#modules/organizations/members/actions/ports/outbound/organization_member_project_offboarding'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import * as projectMemberMutations from '#modules/projects/infra/repositories/write/project_member_mutations'
import * as taskAggregateMutations from '#modules/tasks/infra/repositories/write/task_aggregate_mutations'

export interface OrganizationMemberProjectOffboardingDependencies {
  findProjectIdsByOrganization:
    typeof projectModelQueries.findIdsByOrganization
  unassignTasksByUserInProjects:
    typeof taskAggregateMutations.unassignByUserInProjects
  deleteMemberFromProjects:
    typeof projectMemberMutations.deleteMemberFromProjects
}

const defaultDependencies: OrganizationMemberProjectOffboardingDependencies = {
  findProjectIdsByOrganization: projectModelQueries.findIdsByOrganization,
  unassignTasksByUserInProjects: taskAggregateMutations.unassignByUserInProjects,
  deleteMemberFromProjects: projectMemberMutations.deleteMemberFromProjects,
}

export class OrganizationMemberProjectOffboardingAdapter
  implements OrganizationMemberProjectOffboarding
{
  constructor(
    private readonly dependencies: OrganizationMemberProjectOffboardingDependencies =
      defaultDependencies
  ) {}

  async offboardMember(
    organizationId: string,
    userId: string,
    trx: Parameters<OrganizationMemberProjectOffboarding['offboardMember']>[2]
  ): Promise<void> {
    const projectIds = await this.dependencies.findProjectIdsByOrganization(
      organizationId,
      trx as TransactionClientContract
    )
    if (projectIds.length === 0) {
      return
    }

    await this.dependencies.unassignTasksByUserInProjects(
      projectIds,
      userId,
      trx as TransactionClientContract
    )
    await this.dependencies.deleteMemberFromProjects(
      projectIds,
      userId,
      trx as TransactionClientContract
    )
  }
}
