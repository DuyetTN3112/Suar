import type { ProjectTransaction } from './project_transaction.js'

export interface ProjectMembershipSnapshot {
  projectId: string
  userId: string
  projectRole: string
  projectProfessionalRoleId: string | null
}

export interface ProjectMemberListRecord {
  user_id: string
  role: string
  project_professional_role_id: string | null
  professional_role_name: string | null
  professional_role_code: string | null
  joined_at: Date
  username: string
  email: string
}

export interface ProjectMemberListOptions {
  page?: number
  limit?: number
  role?: string
  search?: string
}

export abstract class ProjectMembershipRepository {
  abstract findMember(
    projectId: string,
    userId: string,
    transaction?: ProjectTransaction
  ): Promise<ProjectMembershipSnapshot | null>
  abstract getRoleName(
    projectId: string,
    userId: string,
    transaction?: ProjectTransaction
  ): Promise<string>
  abstract listMemberUserIds(
    projectId: string,
    transaction?: ProjectTransaction
  ): Promise<string[]>
  abstract listMembers(
    projectId: string,
    options?: ProjectMemberListOptions,
    transaction?: ProjectTransaction
  ): Promise<{ data: ProjectMemberListRecord[]; total: number }>
  abstract hasAccess(
    projectId: string,
    userId: string,
    transaction?: ProjectTransaction
  ): Promise<boolean>
  abstract countByProjectIds(
    projectIds: string[],
    transaction?: ProjectTransaction
  ): Promise<Map<string, number>>
  abstract addMember(
    projectId: string,
    userId: string,
    projectRole: string,
    projectProfessionalRoleId: string | null,
    transaction: ProjectTransaction
  ): Promise<void>
  abstract updateRole(
    projectId: string,
    userId: string,
    projectRole: string,
    projectProfessionalRoleId: string | null,
    transaction: ProjectTransaction
  ): Promise<void>
  abstract deleteMember(
    projectId: string,
    userId: string,
    transaction: ProjectTransaction
  ): Promise<void>
}
