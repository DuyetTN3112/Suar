import { HttpContext } from '@adonisjs/core/http'
import { BaseQuery } from '#actions/shared/base_query'
import Project from '#models/project'
import db from '@adonisjs/lucid/services/db'

/**
 * Query result interface
 */
export interface GetProjectDetailResult {
  project: unknown
  members: Array<{
    user_id: number
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
export default class GetProjectDetailQuery extends BaseQuery<number, GetProjectDetailResult> {
  constructor(ctx: HttpContext) {
    super(ctx)
  }

  /**
   * Execute the query
   *
   * @param projectId - ID of the project to fetch
   */
  async handle(projectId: number): Promise<GetProjectDetailResult> {
    const user = this.ctx.auth.user!

    // Load project with relations
    const project = await Project.query()
      .where('id', projectId)
      .whereNull('deleted_at')
      .preload('creator')
      .preload('manager')
      .preload('owner')
      .preload('organization')
      .firstOrFail()

    // Check access permission
    await this.validateAccess(user.id, project)

    // Fetch all related data in parallel
    const [members, tasksSummary, recentActivity] = await Promise.all([
      this.getMembers(projectId),
      this.getTasksSummary(projectId),
      this.getRecentActivity(projectId),
    ])

    // Calculate permissions
    const permissions = this.calculatePermissions(user.id, project, members)

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
  private async validateAccess(userId: number, project: Project): Promise<void> {
    const isCreator = project.creator_id === userId
    const isManager = project.manager_id === userId
    const isOwner = project.owner_id === userId

    if (isCreator || isManager || isOwner) {
      return
    }

    // Check if user is a member
    const isMember = await db
      .from('project_members')
      .where('project_id', project.id)
      .where('user_id', userId)
      .first()

    if (!isMember) {
      throw new Error('Bạn không có quyền truy cập dự án này')
    }
  }

  /**
   * Get list of project members with details
   */
  private async getMembers(projectId: number): Promise<unknown[]> {
    const members = await db
      .from('project_members as pm')
      .select('pm.user_id', 'pm.role', 'pm.created_at as joined_at', 'u.username', 'u.email')
      .leftJoin('users as u', 'pm.user_id', 'u.id')
      .where('pm.project_id', projectId)
      .orderBy('pm.created_at', 'asc')

    // Get task count for each member
    const taskCounts = await db
      .from('tasks')
      .select('assigned_to as user_id')
      .count('* as count')
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .groupBy('assigned_to')

    const taskCountMap = new Map(taskCounts.map((t) => [t.user_id, Number(t.count)]))

    return members.map((member) => ({
      ...member,
      task_count: taskCountMap.get(member.user_id) || 0,
    }))
  }

  /**
   * Get tasks summary grouped by status
   */
  private async getTasksSummary(projectId: number): Promise<{
    total: number
    pending: number
    in_progress: number
    completed: number
    overdue: number
  }> {
    const now = new Date()

    const [total, pending, inProgress, completed, overdue] = await Promise.all([
      db.from('tasks').where('project_id', projectId).whereNull('deleted_at').count('* as count'),
      db
        .from('tasks')
        .where('project_id', projectId)
        .where('status_id', 1)
        .whereNull('deleted_at')
        .count('* as count'),
      db
        .from('tasks')
        .where('project_id', projectId)
        .where('status_id', 2)
        .whereNull('deleted_at')
        .count('* as count'),
      db
        .from('tasks')
        .where('project_id', projectId)
        .where('status_id', 3)
        .whereNull('deleted_at')
        .count('* as count'),
      db
        .from('tasks')
        .where('project_id', projectId)
        .whereNotIn('status_id', [3, 4])
        .where('due_date', '<', now)
        .whereNull('deleted_at')
        .count('* as count'),
    ])

    return {
      total: Number(total[0]?.count || 0),
      pending: Number(pending[0]?.count || 0),
      in_progress: Number(inProgress[0]?.count || 0),
      completed: Number(completed[0]?.count || 0),
      overdue: Number(overdue[0]?.count || 0),
    }
  }

  /**
   * Get recent activity (last 10 audit logs)
   */
  private async getRecentActivity(projectId: number): Promise<unknown[]> {
    const activities = await db
      .from('audit_logs')
      .select('audit_logs.*', 'users.username as username')
      .leftJoin('users', 'audit_logs.user_id', 'users.id')
      .where('entity_type', 'project')
      .where('entity_id', projectId)
      .orderBy('created_at', 'desc')
      .limit(10)

    return activities
  }

  /**
   * Calculate what permissions user has for this project
   */
  private calculatePermissions(
    userId: number,
    project: Project,
    members: unknown[]
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
  protected getCacheKey(projectId: number): string {
    const user = this.ctx.auth.user!
    return `projects:detail:${projectId}:user:${user.id}`
  }

  /**
   * Cache TTL: 5 minutes
   */
  protected getCacheTTL(): number {
    return 5 * 60
  }
}
