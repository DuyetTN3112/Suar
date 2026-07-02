import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  ProjectMembershipRepository,
  ProjectMembershipSnapshot,
} from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectTransaction } from '#modules/projects/actions/ports/outbound/project_transaction'
import * as projectMemberQueries from '#modules/projects/infra/repositories/project-members/read/project_member_queries'
import * as projectMemberMutations from '#modules/projects/infra/repositories/project-members/write/project_member_mutations'

function lucidTransaction(transaction: ProjectTransaction): TransactionClientContract {
  return transaction as TransactionClientContract
}

export class LucidProjectMembershipRepository implements ProjectMembershipRepository {
  async findMember(
    projectId: string,
    userId: string,
    transaction?: ProjectTransaction
  ): Promise<ProjectMembershipSnapshot | null> {
    const member = await projectMemberQueries.findMember(
      projectId,
      userId,
      transaction ? lucidTransaction(transaction) : undefined
    )
    if (!member) {
      return null
    }

    return {
      projectId: member.project_id,
      userId: member.user_id,
      projectRole: member.project_role,
      projectProfessionalRoleId: member.project_professional_role_id,
    }
  }

  getRoleName(projectId: string, userId: string, transaction?: ProjectTransaction) {
    return projectMemberQueries.getRoleName(
      projectId,
      userId,
      transaction ? lucidTransaction(transaction) : undefined
    )
  }

  listMemberUserIds(projectId: string, transaction?: ProjectTransaction) {
    return projectMemberQueries.listMemberUserIds(
      projectId,
      transaction ? lucidTransaction(transaction) : undefined
    )
  }

  listMembers(
    projectId: string,
    options?: Parameters<ProjectMembershipRepository['listMembers']>[1],
    transaction?: ProjectTransaction
  ) {
    return projectMemberQueries.getMembersWithDetails(
      projectId,
      options,
      transaction ? lucidTransaction(transaction) : undefined
    )
  }

  hasAccess(projectId: string, userId: string, transaction?: ProjectTransaction) {
    return projectMemberQueries.hasAccess(
      projectId,
      userId,
      transaction ? lucidTransaction(transaction) : undefined
    )
  }

  countByProjectIds(projectIds: string[], transaction?: ProjectTransaction) {
    return projectMemberQueries.countByProjectIds(
      projectIds,
      transaction ? lucidTransaction(transaction) : undefined
    )
  }

  async addMember(
    projectId: string,
    userId: string,
    projectRole: string,
    projectProfessionalRoleId: string | null,
    transaction: ProjectTransaction
  ): Promise<void> {
    await projectMemberMutations.addMember(
      projectId,
      userId,
      projectRole,
      projectProfessionalRoleId,
      lucidTransaction(transaction)
    )
  }

  updateRole(
    projectId: string,
    userId: string,
    projectRole: string,
    projectProfessionalRoleId: string | null,
    transaction: ProjectTransaction
  ): Promise<void> {
    return projectMemberMutations.updateRole(
      projectId,
      userId,
      projectRole,
      projectProfessionalRoleId,
      lucidTransaction(transaction)
    )
  }

  async deleteMember(
    projectId: string,
    userId: string,
    transaction: ProjectTransaction
  ): Promise<void> {
    await projectMemberMutations.deleteMember(
      projectId,
      userId,
      lucidTransaction(transaction)
    )
  }
}
