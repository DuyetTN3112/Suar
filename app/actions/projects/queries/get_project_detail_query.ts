import { BaseQuery } from '#actions/shared/base_query'
import ProjectRepository from '#repositories/project_repository'
import ProjectMemberRepository from '#repositories/project_member_repository'
import TaskRepository from '#repositories/task_repository'
import UserRepository from '#repositories/user_repository'
import RepositoryFactory from '#repositories/repository_factory'
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
  project: unknown
  members: Array<{
    user_id: DatabaseId
    username: string
    email: string
    role: string
    joined_at: Date
    task_count: number
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
  { projectId: DatabaseId },
  GetProjectDetailResult
> {
  /**
   * Execute the query
   */
  async handle(input: { projectId: DatabaseId }): Promise<GetProjectDetailResult> {
    const projectId = input.projectId
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Load project with relations
    const project = await ProjectRepository.findDetailWithRelations(projectId)

    // Check access permission
    await this.validateAccess(userId, project)

    // Fetch all related data in parallel
    const [members, tasksSummary, recentActivity] = await Promise.all([
      this.getMembers(projectId),
      this.getTasksSummary(projectId),
      this.getRecentActivity(projectId),
    ])

    // Calculate permissions
    const permissions = this.calculatePermissions(userId, project, members)

    return {
      project: project.toJSON(),
      members,
      tasks_summary: tasksSummary,
      recent_activity: recentActivity,
      permissions,
    }
  }

  /**
   * Validate user has access to this project
   */
  private async validateAccess(userId: DatabaseId, project: Project): Promise<void> {
    const hasAccess = await ProjectMemberRepository.hasAccess(userId, project.id)
    if (!hasAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập dự án này')
    }
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
      task_count: taskCountMap.get(String(member.user_id)) ?? 0,
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
    const userMap = new Map(users.map((u) => [String(u.id), u]))

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
