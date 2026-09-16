import type {
  ProjectOrganizationReader,
  ProjectTaskReaderWriter,
  ProjectUserReader,
} from '../../ports/outbound/project_external_dependencies.js'

import {
  loadProjectReverseReviews,
  loadProjectReviewGovernance,
} from './project_detail_governance_loader.js'
import { buildProjectPreviewResult } from './project_detail_preview_builder.js'

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
  calculateProjectDetailPermissions,
  canAccessProjectOrganizationScope,
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
      return buildProjectPreviewResult(project, organization, permissionContext)
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
      loadProjectReviewGovernance(projectId, this.detailProjection),
      loadProjectReverseReviews(projectId, this.reverseReviews, this.detailProjection),
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
}
