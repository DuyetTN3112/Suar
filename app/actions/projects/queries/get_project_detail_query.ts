import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { BaseQuery } from '#actions/projects/base_query'
import {
  canAccessProjectOrganizationScope,
  calculateProjectDetailPermissions,
  canViewProject,
} from '#domain/projects/project_permission_policy'
import type { ProjectPermissionContext } from '#domain/projects/project_types'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import * as projectMemberQueries from '#infra/projects/repositories/read/project_member_queries'
import * as projectModelQueries from '#infra/projects/repositories/read/project_model_queries'
import type { DatabaseId } from '#types/database'
import type { ProjectDetailRecord } from '#types/project_records'

/**
 * Member interface for query results
 */
interface ProjectMemberResult {
  user_id: DatabaseId
  username: string
  email: string
  role: string
  joined_at: Date
  task_count: number
}

/**
 * Query result interface
 */
export interface GetProjectDetailResult {
  project: {
    id: string
    name: string
    description: string | null
    organization_id: string
    organization_name: string | null
    creator_id: string
    creator_name: string | null
    manager_id: string | null
    manager_name: string | null
    owner_id: string | null
    owner_name: string | null
    start_date: string | null
    end_date: string | null
    status: string
    budget: number | null
    visibility: string | null
    created_at: string | null
    updated_at: string | null
  }
  members: {
    user_id: DatabaseId
    username: string
    email: string
    role: string
    joined_at: Date
    task_count: number
  }[]
  tasks: {
    id: string
    title: string
    description: string | null
    status: string
    task_status_id: string | null
    priority: string | null
    assignee_name: string | null
    due_date: string | null
  }[]
  tasks_summary: {
    total: number
    pending: number
    in_progress: number
    completed: number
    overdue: number
  }
  recent_activity: unknown[]
  permissions: {
    isOwner: boolean
    isManager: boolean
    isCreator: boolean
    isMember: boolean
    canEdit: boolean
    canDelete: boolean
    canAddMembers: boolean
  }
}

/**
 * Query to get detailed information about a single project
 *
 * Features:
 * - Full project information with all relations
 * - List of members with roles and task counts
 * - Task summary grouped by status
 * - Recent activity (last 10 audit logs)
 * - User permissions (what actions user can perform)
 * - Cached for 5 minutes
 *
 * @extends {BaseQuery<number, GetProjectDetailResult>}
 */
export default class GetProjectDetailQuery extends BaseQuery<
  {
    projectId: DatabaseId
    organizationId?: DatabaseId
  },
  GetProjectDetailResult
> {
  /**
   * Execute the query
   */
  async handle(input: {
    projectId: DatabaseId
    organizationId?: DatabaseId
  }): Promise<GetProjectDetailResult> {
    const projectId = input.projectId
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Load project with relations
    const project = await projectModelQueries.findDetailWithRelationsRecord(projectId)

    const permissionContext = await this.buildPermissionContext(
      userId,
      project,
      input.organizationId
    )
    enforcePolicy(canViewProject(permissionContext))

    // Fetch all related data in parallel
    const [members, tasks, tasksSummary, recentActivity] = await Promise.all([
      this.getMembers(projectId),
      this.getTasks(projectId),
      this.getTasksSummary(projectId),
      this.getRecentActivity(projectId),
    ])

    // Calculate permissions
    const permissions = calculateProjectDetailPermissions({
      ...permissionContext,
      projectManagerId: project.manager_id,
    })

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        organization_id: project.organization_id,
        organization_name: project.organization?.name ?? null,
        creator_id: project.creator_id,
        creator_name: project.creator?.username ?? null,
        manager_id: project.manager_id,
        manager_name: project.manager?.username ?? null,
        owner_id: project.owner_id,
        owner_name: project.owner?.username ?? null,
        start_date: project.start_date,
        end_date: project.end_date,
        status: project.status,
        budget: project.budget,
        visibility: project.visibility,
        created_at: project.created_at,
        updated_at: project.updated_at,
      },
      members,
      tasks,
      tasks_summary: tasksSummary,
      recent_activity: recentActivity,
      permissions,
    }
  }

  private async buildPermissionContext(
    userId: DatabaseId,
    project: ProjectDetailRecord,
    currentOrganizationId?: DatabaseId
  ): Promise<ProjectPermissionContext> {
    enforcePolicy(
      canAccessProjectOrganizationScope({
        requestedOrganizationId: currentOrganizationId ?? null,
        projectOrganizationId: project.organization_id,
      })
    )

    const orgId = currentOrganizationId ?? project.organization_id
    const [actorSystemRole, actorMembership, actorProjectRole] = await Promise.all([
      DefaultProjectDependencies.user.getSystemRoleName(userId),
      DefaultProjectDependencies.organization.getMembershipRole(orgId, userId),
      projectMemberQueries.getRoleName(project.id, userId).then((role) =>
        role === 'unknown' ? null : role
      ),
    ])

    return {
      actorId: userId,
      actorSystemRole,
      actorOrgRole: actorMembership,
      actorProjectRole,
      projectCreatorId: project.creator_id,
      projectOwnerId: project.owner_id ?? (''),
      projectOrganizationId: project.organization_id,
    }
  }

  /**
   * Get list of project members with details → delegate to Model
   */
  private async getMembers(projectId: DatabaseId): Promise<ProjectMemberResult[]> {
    const { data: members } = await projectMemberQueries.getMembersWithDetails(projectId)

    // Get task count for each member via Model
    const taskCountMap = await DefaultProjectDependencies.task.countByAssignees(projectId)

    return members.map((member) => ({
      ...member,
      task_count: taskCountMap.get(member.user_id) ?? 0,
    }))
  }

  private async getTasks(projectId: DatabaseId): Promise<
    {
      id: string
      title: string
      description: string | null
      status: string
      task_status_id: string | null
      priority: string | null
      assignee_name: string | null
      due_date: string | null
    }[]
  > {
    return DefaultProjectDependencies.task.listPreviewByProject(projectId, 8)
  }

  /**
   * Get tasks summary grouped by status
   */
  private getTasksSummary(projectId: DatabaseId): Promise<{
    total: number
    pending: number
    in_progress: number
    completed: number
    overdue: number
  }> {
    return DefaultProjectDependencies.task.getSummaryByProject(projectId)
  }

  /**
   * Get recent activity (last 10 audit logs) → delegate to Model
   */
  private async getRecentActivity(projectId: DatabaseId): Promise<
    {
      id: DatabaseId
      user_id: DatabaseId | null
      entity_type: string
      entity_id: DatabaseId | null
      action: string
      created_at: Date
      username: string | null
    }[]
  > {
    const logs = await auditPublicApi.listByEntity('project', projectId, 10)
    const userMap = await auditPublicApi.buildUserMap(logs, ['id', 'username'])

    return logs.map((log) => {
      const user = userMap.get(String(log.user_id))
      return {
        id: log.id,
        user_id: log.user_id ?? null,
        entity_type: log.entity_type,
        entity_id: log.entity_id ?? null,
        action: log.action,
        created_at: log.created_at,
        username: user?.username ?? null,
      }
    })
  }

  /**
   * Get cache key for this query
   */
  protected getCacheKey(projectId: DatabaseId): string {
    const userId = this.getCurrentUserId() ?? 0
    return `projects:detail:${projectId}:user:${userId}`
  }

  /**
   * Cache TTL: 5 minutes
   */
  protected getCacheTTL(): number {
    return 5 * 60
  }
}
