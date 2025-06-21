import { BaseQuery } from '#actions/shared/base_query'
import ProjectRepository from '#infra/projects/repositories/project_repository'
import ProjectMemberRepository from '#infra/projects/repositories/project_member_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import RepositoryFactory from '#infra/shared/repositories/repository_factory'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type Project from '#models/project'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'

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
  members: Array<{
    user_id: DatabaseId
    username: string
    email: string
    role: string
    joined_at: Date
    task_count: number
  }>
  tasks: Array<{
    id: string
    title: string
    description: string | null
    status: string
    task_status_id: string | null
    priority: string | null
    assignee_name: string | null
    due_date: string | null
  }>
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
    const project = await ProjectRepository.findDetailWithRelations(projectId)

    // Check access permission
    await this.validateAccess(userId, project, input.organizationId)

    // Fetch all related data in parallel
    const [members, tasks, tasksSummary, recentActivity] = await Promise.all([
      this.getMembers(projectId),
      this.getTasks(projectId),
      this.getTasksSummary(projectId),
      this.getRecentActivity(projectId),
    ])

    // Calculate permissions
    const permissions = this.calculatePermissions(userId, project, members)

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        organization_id: project.organization_id,
        organization_name: project.organization.name,
        creator_id: project.creator_id,
        creator_name: project.creator.username,
        manager_id: project.manager_id,
        manager_name: project.manager_id ? project.manager.username : null,
        owner_id: project.owner_id,
        owner_name: project.owner_id ? project.owner.username : null,
        start_date: project.start_date ? project.start_date.toISO() : null,
        end_date: project.end_date ? project.end_date.toISO() : null,
        status: project.status,
        budget: project.budget,
        visibility: project.visibility,
        created_at: project.created_at.toISO(),
        updated_at: project.updated_at.toISO(),
      },
      members,
      tasks,
      tasks_summary: tasksSummary,
      recent_activity: recentActivity,
      permissions,
    }
  }

  /**
   * Validate user has access to this project
   */
  private async validateAccess(
    userId: DatabaseId,
    project: Project,
    currentOrganizationId?: DatabaseId
  ): Promise<void> {
    if (currentOrganizationId && project.organization_id !== currentOrganizationId) {
      throw new ForbiddenException('Bạn không có quyền truy cập dự án ngoài tổ chức hiện tại')
    }

    const orgId = currentOrganizationId ?? project.organization_id
    const orgRole = await OrganizationUserRepository.getMemberRoleName(
      orgId,
      userId,
      undefined,
      true
    )
    if (!orgRole) {
      throw new ForbiddenException('Bạn không có quyền truy cập dự án của tổ chức này')
    }

    // Project-specific membership is not required for read access.
    // Any approved member in current organization can view project details.
  }

  /**
   * Get list of project members with details → delegate to Model
   */
  private async getMembers(projectId: DatabaseId): Promise<ProjectMemberResult[]> {
    const { data: members } = await ProjectMemberRepository.getMembersWithDetails(projectId)

    // Get task count for each member via Model
    const taskCountMap = await TaskRepository.countByAssignees(projectId)

    return members.map((member) => ({
      ...member,
      task_count: taskCountMap.get(member.user_id) ?? 0,
    }))
  }

  private async getTasks(projectId: DatabaseId): Promise<
    Array<{
      id: string
      title: string
      description: string | null
      status: string
      task_status_id: string | null
      priority: string | null
      assignee_name: string | null
      due_date: string | null
    }>
  > {
    const tasks = await TaskRepository.listPreviewByProject(projectId, 8)
    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      task_status_id: task.task_status_id,
      priority: task.priority,
      assignee_name: task.assigned_to ? task.assignee.username : null,
      due_date: task.due_date ? task.due_date.toISO() : null,
    }))
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
    return TaskRepository.getTasksSummaryByProject(projectId)
  }

  /**
   * Get recent activity (last 10 audit logs) → delegate to Model
   */
  private async getRecentActivity(projectId: DatabaseId): Promise<
    Array<{
      id: DatabaseId
      user_id: DatabaseId | null
      entity_type: string
      entity_id: DatabaseId | null
      action: string
      created_at: Date
      username: string | null
    }>
  > {
    const auditRepo = await RepositoryFactory.getAuditLogRepository()
    const { data: logs } = await auditRepo.findMany({
      entity_type: 'project',
      entity_id: projectId,
      limit: 10,
    })

    // Load users from PostgreSQL
    const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))] as string[]
    const users = await UserRepository.findByIds(userIds, ['id', 'username'])
    const userMap = new Map(users.map((u) => [u.id, u]))

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
   * Calculate what permissions user has for this project
   */
  private calculatePermissions(
    userId: DatabaseId,
    project: Project,
    members: ProjectMemberResult[]
  ): {
    isOwner: boolean
    isManager: boolean
    isCreator: boolean
    isMember: boolean
    canEdit: boolean
    canDelete: boolean
    canAddMembers: boolean
  } {
    const isOwner = project.owner_id === userId
    const isManager = project.manager_id === userId
    const isCreator = project.creator_id === userId
    const isMember = members.some((m) => m.user_id === userId)

    return {
      isOwner,
      isManager,
      isCreator,
      isMember,
      canEdit: isOwner || isManager || isCreator,
      canDelete: isOwner || isCreator,
      canAddMembers: isOwner || isCreator || isManager,
    }
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
