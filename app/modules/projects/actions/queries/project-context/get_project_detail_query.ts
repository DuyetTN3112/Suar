import type {
  ProjectOrganizationReader,
  ProjectOrganizationSummary,
  ProjectTaskReaderWriter,
  ProjectUserReader,
} from '../../ports/outbound/project_external_dependencies.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseQuery } from '#modules/projects/actions/base_query'
import type { ProjectContextFactReader } from '#modules/projects/actions/ports/outbound/project-context/project_context_fact_reader'
import type { ProjectAuditActivityReader } from '#modules/projects/actions/ports/outbound/project_audit_activity_reader'
import type { ProjectDetailProjectionReader } from '#modules/projects/actions/ports/outbound/project_detail_projection_reader'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectReverseReviewReader } from '#modules/projects/actions/ports/outbound/project_reverse_review_reader'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { mapProjectContextPageProjection } from '#modules/projects/domain/project-context/project_context_page_projection'
import type { ProjectPermissionContext } from '#modules/projects/domain/project-context/project_types'
import {
  canAccessProjectOrganizationScope,
  calculateProjectDetailPermissions,
  canUpdateProject,
  canViewProject,
  canViewProjectPreview,
} from '#modules/projects/domain/project-members/project_permission_policy'
import type {
  GetProjectDetailInput,
  GetProjectDetailResult,
} from '#modules/projects/public_contracts/project_detail'
import type { ProjectRecord } from '#modules/projects/types/project_records'

/**
 * Member interface for query results
 */
type ProjectMemberResult = GetProjectDetailResult['members'][number]
type ProjectReviewGovernanceSummary = GetProjectDetailResult['review_governance']
type ProjectReverseReviewSummary = GetProjectDetailResult['project_reverse_reviews']

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
  GetProjectDetailInput,
  GetProjectDetailResult
> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly auditActivityReader: ProjectAuditActivityReader,
    private readonly organizationReader: ProjectOrganizationReader,
    private readonly taskReader: ProjectTaskReaderWriter,
    private readonly userReader: ProjectUserReader,
    private readonly reverseReviews: ProjectReverseReviewReader,
    private readonly projects: ProjectLifecycleRepository,
    private readonly memberships: ProjectMembershipRepository,
    private readonly detailProjection: ProjectDetailProjectionReader,
    private readonly projectContextFactReader?: ProjectContextFactReader
  ) {
    super(execCtx)
  }

  /**
   * Execute the query
   */
  async handle(input: GetProjectDetailInput): Promise<GetProjectDetailResult> {
    const projectId = input.projectId
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Load project with relations
    const project = await this.projects.findDetail(projectId)
    const organization = await this.organizationReader.findOrganizationSummary(
      project.organization_id
    )

    const permissionContext = await this.buildPermissionContext(
      userId,
      project,
      input.organizationId
    )
    const canViewInternal = canViewProject(permissionContext).allowed
    if (!canViewInternal) {
      enforcePolicy(canViewProjectPreview(permissionContext))
      return this.buildPreviewResult(project, organization, permissionContext)
    }

    // Fetch all related data in parallel
    const [
      identitySummaries,
      members,
      tasks,
      tasksSummary,
      recentActivity,
      reviewGovernance,
      projectReverseReviews,
      projectContextFact,
    ] = await Promise.all([
      this.userReader.findIdentitySummaries(
        [project.creator_id, project.manager_id, project.owner_id].filter(
          (identityId): identityId is string => typeof identityId === 'string'
        )
      ),
      this.getMembers(projectId),
      this.getTasks(projectId),
      this.getTasksSummary(projectId),
      this.getRecentActivity(projectId),
      this.getReviewGovernance(projectId),
      this.getProjectReverseReviews(projectId),
      this.projectContextFactReader?.readProjectContextFact({
        projectId,
        organizationId: project.organization_id,
      }) ?? Promise.resolve(null),
    ])
    const identityById = new Map(identitySummaries.map((identity) => [identity.id, identity]))

    // Calculate permissions
    const permissions = calculateProjectDetailPermissions({
      ...permissionContext,
      projectManagerId: project.manager_id,
    })

    return {
      project_context: mapProjectContextPageProjection(projectContextFact, {
        includeConcurrencyFence: canUpdateProject(permissionContext).allowed,
      }),
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        organization_id: project.organization_id,
        organization_name: organization?.name ?? null,
        creator_id: project.creator_id,
        creator_name: identityById.get(project.creator_id)?.username ?? null,
        manager_id: project.manager_id,
        manager_name: project.manager_id
          ? (identityById.get(project.manager_id)?.username ?? null)
          : null,
        owner_id: project.owner_id,
        owner_name: project.owner_id
          ? (identityById.get(project.owner_id)?.username ?? null)
          : null,
        start_date: project.start_date,
        end_date: project.end_date,
        status: project.status,
        visibility: project.visibility,
        business_domains: project.business_domains ?? [],
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
    project: ProjectRecord,
    organization: ProjectOrganizationSummary | null,
    permissionContext: ProjectPermissionContext
  ): GetProjectDetailResult {
    return {
      project_context: null,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        organization_id: project.organization_id,
        organization_name: organization?.name ?? null,
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
        business_domains: project.business_domains ?? [],
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
    project: ProjectRecord,
    currentOrganizationId?: string
  ): Promise<ProjectPermissionContext> {
    enforcePolicy(
      canAccessProjectOrganizationScope({
        requestedOrganizationId: currentOrganizationId ?? null,
        projectOrganizationId: project.organization_id,
      })
    )

    const orgId = currentOrganizationId ?? project.organization_id
    const [actorMembership, actorProjectRole] = await Promise.all([
      this.organizationReader.getMembershipRole(orgId, userId),
      this.memberships
        .getRoleName(project.id, userId)
        .then((role) => (role === 'unknown' ? null : role)),
    ])

    return {
      actorId: userId,
      actorOrgRole: actorMembership,
      actorProjectRole,
      projectCreatorId: project.creator_id,
      projectOwnerId: project.owner_id ?? '',
      projectOrganizationId: project.organization_id,
    }
  }

  /**
   * Get list of project members with details → delegate to Model
   */
  private async getMembers(projectId: string): Promise<ProjectMemberResult[]> {
    const { data: members } = await this.memberships.listMembers(projectId)

    // Get task count for each member via Model
    const [taskCountMap, explainabilityByUserId] = await Promise.all([
      this.taskReader.countByAssignees(projectId),
      this.userReader.findTalentExplainabilitySummaries(members.map((member) => member.user_id)),
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
    return this.taskReader.listPreviewByProject(projectId, 8)
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
    return this.taskReader.getSummaryByProject(projectId)
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
    return this.auditActivityReader.listRecentProjectActivity(projectId, 10)
  }

  private async getReviewGovernance(projectId: string): Promise<ProjectReviewGovernanceSummary> {
    const { sessions: statusRows, pendingAssignmentRequirements } =
      await this.detailProjection.loadReviewGovernanceRows(projectId)

    const totalSessions = statusRows.length
    const completedSessions = statusRows.filter((row) => row.status === 'completed').length
    const disputedSessions = statusRows.filter((row) => row.status === 'disputed').length
    const pendingSessions = statusRows.filter(
      (row) => row.status === 'pending' || row.status === 'in_progress'
    ).length
    const overdueSessions = statusRows.filter((row) => {
      if (row.status === 'completed' || row.status === 'disputed' || !row.deadline) {
        return false
      }

      const deadline = new Date(row.deadline)
      return !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now()
    }).length

    const requiredPendingAssignments = pendingAssignmentRequirements.filter(Boolean).length
    const fallbackPendingAssignments =
      pendingAssignmentRequirements.length - requiredPendingAssignments

    return {
      total_sessions: totalSessions,
      pending_sessions: pendingSessions,
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
    const [stats, recentRows] = await Promise.all([
      this.reverseReviews.loadProjectStats(projectId),
      this.detailProjection.listRecentReverseReviews(projectId, 5),
    ])

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
        stats?.anonymous_reviews ?? recentRows.filter((row) => row.is_anonymous === true).length,
      average_rating: stats?.average_rating ?? fallbackAverageRating,
      recent: recentRows.map((row) => ({
        id: row.id,
        reviewer_id: row.is_anonymous === true ? null : row.reviewer_id,
        reviewer_username: row.is_anonymous === true ? null : row.reviewer_username,
        rating: Number(row.rating ?? 0),
        comment: row.comment,
        is_anonymous: row.is_anonymous,
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      })),
    }
  }
}
