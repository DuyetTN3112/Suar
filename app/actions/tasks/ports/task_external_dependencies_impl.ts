import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import ProjectRepository from '#infra/projects/repositories/project_repository'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import SkillRepository from '#infra/skills/repositories/skill_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import * as PermissionService from '#services/permission_service'
import type { DatabaseId } from '#types/database'

import type {
  TaskExternalDependencies,
  TaskOrgReader,
  TaskPermissionReader,
  TaskProjectOption,
  TaskProjectReader,
  TaskReviewReader,
  TaskSkillOption,
  TaskSkillReader,
  TaskUserIdentity,
  TaskUserOption,
  TaskUserReader,
} from './task_external_dependencies.js'

export class InfraTaskOrgReader implements TaskOrgReader {
  async ensureActiveOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await OrganizationRepository.findActiveOrFail(organizationId, trx)
  }

  async isApprovedMember(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return OrganizationUserRepository.isApprovedMember(userId, organizationId, trx)
  }
}

export class InfraTaskProjectReader implements TaskProjectReader {
  async ensureProjectBelongsToOrganization(
    projectId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await ProjectRepository.validateBelongsToOrg(projectId, organizationId, trx)
  }

  async listProjectsByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskProjectOption[]> {
    return ProjectRepository.listSimpleByOrganization(organizationId, trx)
  }
}

export class InfraTaskUserReader implements TaskUserReader {
  async ensureActiveUser(userId: DatabaseId, trx?: TransactionClientContract): Promise<void> {
    await UserRepository.findActiveOrFail(userId, trx)
  }

  async findUserIdentity(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskUserIdentity | null> {
    const user = await UserRepository.findById(userId, trx)
    if (!user) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    }
  }

  async isFreelancer(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    return UserRepository.isFreelancer(userId, trx)
  }

  async listUsersByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskUserOption[]> {
    const users = await UserRepository.findByOrganization(organizationId, trx)

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email ?? '',
    }))
  }
}

export class InfraTaskReviewReader implements TaskReviewReader {
  async hasAnyReviewForTask(
    taskId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return ReviewSessionRepository.hasAnyForTask(taskId, trx)
  }

  async hasAnyReviewForTasksWithStatus(
    taskStatusId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return ReviewSessionRepository.hasAnyForTasksWithStatus(taskStatusId, trx)
  }
}

export class InfraTaskSkillReader implements TaskSkillReader {
  async listActiveSkills(): Promise<TaskSkillOption[]> {
    const skills = await SkillRepository.activeSkills()

    return skills.map((skill) => ({
      id: skill.id,
      name: skill.skill_name,
    }))
  }

  async findActiveSkillIds(
    skillIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<DatabaseId[]> {
    const skills = await SkillRepository.findActiveByIds(skillIds, trx)
    return skills.map((skill) => skill.id)
  }
}

export class InfraTaskPermissionReader implements TaskPermissionReader {
  async getSystemRoleName(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    return (await PermissionService.getSystemRoleInfo(userId, trx))?.roleName ?? null
  }

  async getOrgRoleName(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    return (await PermissionService.getOrgMembership(userId, organizationId, trx))?.org_role ?? null
  }

  async getProjectRoleName(
    userId: DatabaseId,
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    return (
      await PermissionService.getProjectMembership(userId, projectId, trx)
    )?.project_role ?? null
  }
}

export const DefaultTaskDependencies: TaskExternalDependencies = {
  org: new InfraTaskOrgReader(),
  project: new InfraTaskProjectReader(),
  user: new InfraTaskUserReader(),
  review: new InfraTaskReviewReader(),
  skill: new InfraTaskSkillReader(),
  permission: new InfraTaskPermissionReader(),
}
