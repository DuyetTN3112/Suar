import db from '@adonisjs/lucid/services/db'

import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { BaseQuery } from '#modules/projects/actions/base_query'
import {
  canAccessProjectOrganizationScope,
  calculateProjectDetailPermissions,
  canViewProject,
  canViewProjectPreview,
} from '#modules/projects/domain/project_permission_policy'
import type { ProjectPermissionContext } from '#modules/projects/domain/project_types'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import type { ProjectDetailRecord } from '#modules/projects/types/project_records'
import { reviewPublicApi } from '#modules/reviews/public_contracts/review_public_api'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

/**
 * Member interface for query results
 */
interface ProjectMemberResult {
  user_id: string
  username: string
  email: string
  role: string
  project_professional_role_id: string | null
  professional_role_name: string | null
  professional_role_code: string | null
  joined_at: Date
  task_count: number
  reviewed_skills_count: number
  imported_skills_count: number
  under_dispute_skills_count: number
  latest_confidence_signal: 'low' | 'medium' | 'high' | null
}

interface ProjectReviewGovernanceSummary {
  total_sessions: number
  pending_sessions: number
  overdue_sessions: number
  disputed_sessions: number
  completed_sessions: number
  required_pending_assignments: number
  fallback_pending_assignments: number
  completion_rate: number
}

interface ProjectReverseReviewSummaryItem {
  id: string
  reviewer_id: string | null
  reviewer_username: string | null
  rating: number
  comment: string | null
  is_anonymous: boolean
  created_at: string
}

interface ProjectReverseReviewSummary {
  total_reviews: number
  anonymous_reviews: number
  average_rating: number | null
  recent: ProjectReverseReviewSummaryItem[]
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
    creator_id: string | null
    creator_name: string | null
    manager_id: string | null
    manager_name: string | null
    owner_id: string | null
    owner_name: string | null
    start_date: string | null
    end_date: string | null
    status: string
    visibility: string | null
    created_at: string | null
    updated_at: string | null
  }
  members: {
    user_id: string
    username: string
    email: string
    role: string
    project_professional_role_id: string | null
    professional_role_name: string | null
    professional_role_code: string | null
    joined_at: Date
    task_count: number
    reviewed_skills_count: number
    imported_skills_count: number
    under_dispute_skills_count: number
    latest_confidence_signal: 'low' | 'medium' | 'high' | null
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
  recent_activity: {
    id: string
    user_id: string | null
    entity_type: string
    entity_id: string | null
    action: string
    created_at: Date
    username: string | null
  }[]
  permissions: {
    isOwner: boolean
    isManager: boolean
    isCreator: boolean
    isMember: boolean
    canEdit: boolean
    canDelete: boolean
    canAddMembers: boolean
  }
  review_governance: ProjectReviewGovernanceSummary
  project_reverse_reviews: ProjectReverseReviewSummary
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
    projectId: string
    organizationId?: string
  },
  GetProjectDetailResult
> {
  /**
   * Execute the query
   */
  async handle(input: {
    projectId: string
    organizationId?: string
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
    const canViewInternal = canViewProject(permissionContext).allowed
    if (!canViewInternal) {
      enforcePolicy(canViewProjectPreview(permissionContext))
      return this.buildPreviewResult(project, permissionContext)
    }

    // Fetch all related data in parallel
    const [members, tasks, tasksSummary, recentActivity, reviewGovernance, projectReverseReviews] =
      await Promise.all([
      this.getMembers(projectId),
      this.getTasks(projectId),
      this.getTasksSummary(projectId),
      this.getRecentActivity(projectId),
      this.getReviewGovernance(projectId),
      this.getProjectReverseReviews(projectId),
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
        visibility: project.visibility,
        created_at: project.created_at,
        updated_at: project.updated_at,
      },
      members,
      tasks,
      tasks_summary: tasksSummary,
      recent_activity: recentActivity,
      permissions,
      review_governance: reviewGovernance,
      project_reverse_reviews: projectReverseReviews,
    }
  }

  private buildPreviewResult(
    project: ProjectDetailRecord,
    permissionContext: ProjectPermissionContext
  ): GetProjectDetailResult {
    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        organization_id: project.organization_id,
        organization_name: project.organization?.name ?? null,
        creator_id: null,
        creator_name: null,
        manager_id: null,
        manager_name: null,
        owner_id: null,
        owner_name: null,
        start_date: project.start_date,
        end_date: project.end_date,
        status: project.status,
        visibility: project.visibility,
        created_at: project.created_at,
        updated_at: project.updated_at,
      },
      members: [],
      tasks: [],
      tasks_summary: {
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        overdue: 0,
      },
      recent_activity: [],
      permissions: calculateProjectDetailPermissions({
        ...permissionContext,
        projectManagerId: project.manager_id,
      }),
      review_governance: {
        total_sessions: 0,
        pending_sessions: 0,
        overdue_sessions: 0,
        disputed_sessions: 0,
        completed_sessions: 0,
        required_pending_assignments: 0,
        fallback_pending_assignments: 0,
        completion_rate: 0,
      },
      project_reverse_reviews: {
        total_reviews: 0,
        anonymous_reviews: 0,
        average_rating: null,
        recent: [],
      },
    }
  }

  private async buildPermissionContext(
    userId: string,
    project: ProjectDetailRecord,
    currentOrganizationId?: string
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
  private async getMembers(projectId: string): Promise<ProjectMemberResult[]> {
    const { data: members } = await projectMemberQueries.getMembersWithDetails(projectId)

    // Get task count for each member via Model
    const [taskCountMap, explainabilityByUserId] = await Promise.all([
      DefaultProjectDependencies.task.countByAssignees(projectId),
      userPublicApi.getTalentExplainabilitySummaryByUserId(members.map((member) => member.user_id)),
    ])

    return members.map((member) => ({
      ...member,
      task_count: taskCountMap.get(member.user_id) ?? 0,
      reviewed_skills_count: explainabilityByUserId.get(member.user_id)?.reviewedSkillsCount ?? 0,
      imported_skills_count: explainabilityByUserId.get(member.user_id)?.importedSkillsCount ?? 0,
      under_dispute_skills_count:
        explainabilityByUserId.get(member.user_id)?.underDisputeSkillsCount ?? 0,
      latest_confidence_signal:
        explainabilityByUserId.get(member.user_id)?.latestConfidenceSignal ?? null,
    }))
  }

  private async getTasks(projectId: string): Promise<
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
  private getTasksSummary(projectId: string): Promise<{
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
  private async getRecentActivity(projectId: string): Promise<
    {
      id: string
      user_id: string | null
      entity_type: string
      entity_id: string | null
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

  private async getReviewGovernance(projectId: string): Promise<ProjectReviewGovernanceSummary> {
    const summaryRow = (await db
      .from('review_sessions as rs')
      .join('task_assignments as ta', 'ta.id', 'rs.task_assignment_id')
      .join('tasks as t', 't.id', 'ta.task_id')
      .where('t.project_id', projectId)
      .count('* as total_sessions')
      .count('* as pending_sessions')
      .whereIn('rs.status', ['pending', 'in_progress'])
      .first()) as { total_sessions?: number | string; pending_sessions?: number | string } | null

    const [statusRows, assignmentRows] = (await Promise.all([
      db
        .from('review_sessions as rs')
        .join('task_assignments as ta', 'ta.id', 'rs.task_assignment_id')
        .join('tasks as t', 't.id', 'ta.task_id')
        .where('t.project_id', projectId)
        .select('rs.status', 'rs.deadline'),
      db
        .from('review_session_reviewer_assignments as rra')
        .join('review_sessions as rs', 'rs.id', 'rra.review_session_id')
        .join('task_assignments as ta', 'ta.id', 'rs.task_assignment_id')
        .join('tasks as t', 't.id', 'ta.task_id')
        .where('t.project_id', projectId)
        .where('rra.status', 'pending')
        .select('rra.is_required'),
    ])) as [
      Array<{ status: string; deadline: string | Date | null }>,
      Array<{ is_required: boolean }>
    ]

    const totalSessions = statusRows.length
    const completedSessions = statusRows.filter((row) => row.status === 'completed').length
    const disputedSessions = statusRows.filter((row) => row.status === 'disputed').length
    const pendingSessions = statusRows.filter((row) =>
      row.status === 'pending' || row.status === 'in_progress'
    ).length
    const overdueSessions = statusRows.filter((row) => {
      if (row.status === 'completed' || row.status === 'disputed' || !row.deadline) {
        return false
      }

      const deadline = new Date(row.deadline)
      return !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now()
    }).length

    const requiredPendingAssignments = assignmentRows.filter((row) => row.is_required === true).length
    const fallbackPendingAssignments = assignmentRows.length - requiredPendingAssignments

    return {
      total_sessions: totalSessions || Number(summaryRow?.total_sessions ?? 0),
      pending_sessions: pendingSessions || Number(summaryRow?.pending_sessions ?? 0),
      overdue_sessions: overdueSessions,
      disputed_sessions: disputedSessions,
      completed_sessions: completedSessions,
      required_pending_assignments: requiredPendingAssignments,
      fallback_pending_assignments: fallbackPendingAssignments,
      completion_rate:
        totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
    }
  }

  /**
   * Get cache key for this query
   */
  protected getCacheKey(projectId: string): string {
    const userId = this.getCurrentUserId() ?? 0
    return `projects:detail:${projectId}:user:${userId}`
  }

  /**
   * Cache TTL: 5 minutes
   */
  protected getCacheTTL(): number {
    return 5 * 60
  }

  private async getProjectReverseReviews(projectId: string): Promise<ProjectReverseReviewSummary> {
    interface ProjectReverseReviewRow {
      id: string
      reviewer_id: string | null
      reviewer_username: string | null
      rating: number | string | null
      comment: string | null
      is_anonymous: boolean
      created_at: string | Date
    }

    const [stats, legacyRecentRows, sprintEnvironmentRows] = (await Promise.all([
      reviewPublicApi.loadReverseReviewTargetStats('project', projectId),
      db
        .from('reverse_reviews')
        .where('target_type', 'project')
        .where('target_id', projectId)
        .leftJoin('users as reviewer', 'reviewer.id', 'reverse_reviews.reviewer_id')
        .select(
          'reverse_reviews.id',
          'reverse_reviews.reviewer_id',
          'reverse_reviews.rating',
          'reverse_reviews.comment',
          'reverse_reviews.is_anonymous',
          'reverse_reviews.created_at',
          'reviewer.username as reviewer_username'
        )
        .orderBy('reverse_reviews.created_at', 'desc')
        .limit(5),
      db
        .from('sprint_environment_reviews as ser')
        .innerJoin('sprint_review_packages as srp', 'srp.id', 'ser.package_id')
        .joinRaw('left join users as reviewer on reviewer.id::text = srp.reviewer_id')
        .where('ser.target_type', 'project')
        .where('ser.target_id', projectId)
        .select(
          'ser.id',
          'srp.reviewer_id',
          'ser.rating',
          'ser.comment',
          'ser.is_anonymous_publicly as is_anonymous',
          'ser.created_at',
          'reviewer.username as reviewer_username'
        )
        .orderBy('ser.created_at', 'desc')
        .limit(5),
    ])) as [
      Awaited<ReturnType<typeof reviewPublicApi.loadReverseReviewTargetStats>>,
      ProjectReverseReviewRow[],
      ProjectReverseReviewRow[],
    ]

    const recentRows = [...legacyRecentRows, ...sprintEnvironmentRows]
      .sort((left, right) => {
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      })
      .slice(0, 5)

    const fallbackAverageRating =
      recentRows.length > 0
        ? Number(
            (
              recentRows.reduce((sum, row) => sum + Number(row.rating ?? 0), 0) / recentRows.length
            ).toFixed(1)
          )
        : null

    return {
      total_reviews: stats?.total_reviews ?? recentRows.length,
      anonymous_reviews:
        stats?.anonymous_reviews ??
        recentRows.filter((row) => row.is_anonymous === true).length,
      average_rating: stats?.average_rating ?? fallbackAverageRating,
      recent: recentRows.map((row) => ({
        id: row.id,
        reviewer_id: row.is_anonymous === true ? null : row.reviewer_id,
        reviewer_username: row.is_anonymous === true ? null : row.reviewer_username,
        rating: Number(row.rating ?? 0),
        comment: row.comment,
        is_anonymous: row.is_anonymous,
        created_at:
          row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      })),
    }
  }
}
