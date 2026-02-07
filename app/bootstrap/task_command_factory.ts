import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { organizationPublicApi } from '#modules/organizations/actions/public_api'
import { projectPublicApi } from '#modules/projects/actions/public_api'
import { reviewPublicApi } from '#modules/reviews/actions/public_api'
import { skillPublicApi } from '#modules/skills/actions/public_api'
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
} from '#modules/tasks/actions/ports/task_external_dependencies'
import { userPublicApi } from '#modules/users/actions/public_api'
import type { DatabaseId } from '#types/database'

class BootstrapTaskOrgReader implements TaskOrgReader {
  async ensureActiveOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await organizationPublicApi.ensureActiveOrganization(organizationId, trx)
  }

  async isApprovedMember(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return organizationPublicApi.isApprovedMember(userId, organizationId, trx)
  }
}

class BootstrapTaskProjectReader implements TaskProjectReader {
  async ensureProjectBelongsToOrganization(
    projectId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await projectPublicApi.ensureBelongsToOrganization(projectId, organizationId, trx)
  }

  async listProjectsByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskProjectOption[]> {
    return projectPublicApi.listSimpleByOrganization(organizationId, trx)
  }
}

class BootstrapTaskUserReader implements TaskUserReader {
  async ensureActiveUser(userId: DatabaseId, trx?: TransactionClientContract): Promise<void> {
    await userPublicApi.ensureActiveUser(userId, trx)
  }

  async findUserIdentity(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskUserIdentity | null> {
    const user = await userPublicApi.findById(userId, trx)
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
    return userPublicApi.isFreelancer(userId, trx)
  }

  async listUsersByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskUserOption[]> {
    const users = await userPublicApi.listUsersByOrganization(organizationId, trx)

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email ?? '',
    }))
  }
}

class BootstrapTaskReviewReader implements TaskReviewReader {
  async hasAnyReviewForTask(taskId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    return reviewPublicApi.hasAnyForTask(taskId, trx)
  }

  async hasAnyReviewForTasksWithStatus(
    taskStatusId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return reviewPublicApi.hasAnyForTasksWithStatus(taskStatusId, trx)
  }
}

class BootstrapTaskSkillReader implements TaskSkillReader {
  async listActiveSkills(): Promise<TaskSkillOption[]> {
    const skills = await skillPublicApi.listActive()

    return skills.map((skill) => ({
      id: skill.id,
      name: skill.skill_name,
    }))
  }

  async findActiveSkillIds(
    skillIds: DatabaseId[],
    _trx?: TransactionClientContract
  ): Promise<DatabaseId[]> {
    const skills = await skillPublicApi.findActiveByIds(skillIds)
    return skills.map((skill) => skill.id)
  }
}

class BootstrapTaskPermissionReader implements TaskPermissionReader {
  async getSystemRoleName(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    return userPublicApi.getSystemRoleName(userId, trx)
  }

  async getOrgRoleName(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const orgMembership = await organizationPublicApi.getMembershipContext(
      organizationId,
      userId,
      trx,
      true
    )
    return orgMembership?.role ?? null
  }

  async getProjectRoleName(
    userId: DatabaseId,
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const projectMembership = await projectPublicApi.getMembershipContext(projectId, userId, trx)
    return projectMembership?.project_role ?? null
  }
}

export const taskExternalDeps: TaskExternalDependencies = {
  org: new BootstrapTaskOrgReader(),
  project: new BootstrapTaskProjectReader(),
  user: new BootstrapTaskUserReader(),
  review: new BootstrapTaskReviewReader(),
  skill: new BootstrapTaskSkillReader(),
  permission: new BootstrapTaskPermissionReader(),
}

export const DefaultTaskDependencies = taskExternalDeps
