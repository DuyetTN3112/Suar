import type { SerializedModelRecord, SerializableModelRecord } from './model_response_serialization.js'
import { serializeModelCollectionForHttpResponse, serializeModelForHttpResponse } from './model_response_serialization.js'

import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import type { GetProjectDetailResult } from '#modules/projects/public_contracts/project_detail'

interface ProjectsIndexResult {
  data: unknown[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: unknown
  stats: unknown
}

interface RoleStaffingCandidatesApiResult {
  role: {
    id: string
    name: string
    code: string
  }
  requirements: Array<{
    skill_id: string
    skill_name: string
    minimum_level_id: string | null
    target_level_id: string | null
    assessment_ceiling_level_id: string | null
    is_mandatory: boolean
    importance: string
    weight: number
  }>
  candidates: Array<{
    user_id: string
    username: string
    email: string
    source: 'project_member' | 'org_member' | 'external'
    match_score: number
    matched_skills: number
    total_required_skills: number
    skill_gaps: string[]
    reviewed_skills_count: number
    imported_skills_count: number
    under_dispute_skills_count: number
    latest_confidence_signal: 'low' | 'medium' | 'high' | null
  }>
  project_members: Array<{
    user_id: string
    username: string
    email: string
    source: 'project_member' | 'org_member' | 'external'
    match_score: number
    matched_skills: number
    total_required_skills: number
    skill_gaps: string[]
    reviewed_skills_count: number
    imported_skills_count: number
    under_dispute_skills_count: number
    latest_confidence_signal: 'low' | 'medium' | 'high' | null
  }>
  org_members: Array<{
    user_id: string
    username: string
    email: string
    source: 'project_member' | 'org_member' | 'external'
    match_score: number
    matched_skills: number
    total_required_skills: number
    skill_gaps: string[]
    reviewed_skills_count: number
    imported_skills_count: number
    under_dispute_skills_count: number
    latest_confidence_signal: 'low' | 'medium' | 'high' | null
  }>
}

function mapStaffingCandidate(candidate: RoleStaffingCandidatesApiResult['candidates'][number]) {
  return {
    userId: candidate.user_id,
    username: candidate.username,
    email: candidate.email,
    source: candidate.source,
    matchScore: candidate.match_score,
    matchedSkills: candidate.matched_skills,
    totalRequiredSkills: candidate.total_required_skills,
    skillGaps: candidate.skill_gaps,
    reviewedSkillsCount: candidate.reviewed_skills_count,
    importedSkillsCount: candidate.imported_skills_count,
    underDisputeSkillsCount: candidate.under_dispute_skills_count,
    latestConfidenceSignal: candidate.latest_confidence_signal,
  }
}

export function mapProjectsIndexPageProps(
  result: ProjectsIndexResult,
  showOrganizationRequiredModal: boolean
) {
  return {
    projects: serializeModelCollectionForHttpResponse(
      result.data as (SerializableModelRecord | SerializedModelRecord)[]
    ),
    pagination: toCanonicalPagePagination({
      total: result.pagination.total,
      perPage: result.pagination.limit,
      currentPage: result.pagination.page,
      lastPage: result.pagination.totalPages,
    }),
    filters: result.filters,
    stats: result.stats,
    showOrganizationRequiredModal,
  }
}

export function mapProjectDetailPageProps<T extends object>(result: T): T {
  return result
}

export function mapProjectDetailApiBody(result: GetProjectDetailResult) {
  return {
    data: {
      projectContext: result.project_context
        ? {
            activeVersionId: result.project_context.active_version_id,
            activeVersionNumber: result.project_context.active_version_number,
            context: result.project_context.context
              ? {
                  id: result.project_context.context.id,
                  versionNumber: result.project_context.context.version_number,
                  title: result.project_context.context.title,
                  summary: result.project_context.context.summary,
                  richContent: result.project_context.context.rich_content,
                  plainTextProjection: result.project_context.context.plain_text_projection,
                  activeFrom: result.project_context.context.active_from,
                  retiredAt: result.project_context.context.retired_at,
                  privacyClassification: result.project_context.context.privacy_classification,
                  createdAt: result.project_context.context.created_at,
                }
              : null,
          }
        : null,
      project: {
        id: result.project.id,
        name: result.project.name,
        description: result.project.description,
        organizationId: result.project.organization_id,
        organizationName: result.project.organization_name,
        creatorId: result.project.creator_id,
        creatorName: result.project.creator_name,
        managerId: result.project.manager_id,
        managerName: result.project.manager_name,
        ownerId: result.project.owner_id,
        ownerName: result.project.owner_name,
        startDate: result.project.start_date,
        endDate: result.project.end_date,
        status: result.project.status,
        visibility: result.project.visibility,
        businessDomains: result.project.business_domains,
        createdAt: result.project.created_at,
        updatedAt: result.project.updated_at,
      },
      members: result.members.map((member) => ({
        userId: member.user_id,
        username: member.username,
        email: member.email,
        role: member.role,
        projectProfessionalRoleId: member.project_professional_role_id,
        professionalRoleName: member.professional_role_name,
        professionalRoleCode: member.professional_role_code,
        joinedAt: member.joined_at,
        taskCount: member.task_count,
        reviewedSkillsCount: member.reviewed_skills_count,
        importedSkillsCount: member.imported_skills_count,
        underDisputeSkillsCount: member.under_dispute_skills_count,
        latestConfidenceSignal: member.latest_confidence_signal,
      })),
      tasks: result.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        taskStatusId: task.task_status_id,
        priority: task.priority,
        assigneeName: task.assignee_name,
        dueDate: task.due_date,
      })),
      tasksSummary: {
        total: result.tasks_summary.total,
        pending: result.tasks_summary.pending,
        inProgress: result.tasks_summary.in_progress,
        completed: result.tasks_summary.completed,
        overdue: result.tasks_summary.overdue,
      },
      recentActivity: result.recent_activity.map((activity) => ({
        id: activity.id,
        userId: activity.user_id,
        entityType: activity.entity_type,
        entityId: activity.entity_id,
        action: activity.action,
        createdAt: activity.created_at,
        username: activity.username,
      })),
      projectReverseReviews: {
        totalReviews: result.project_reverse_reviews.total_reviews,
        anonymousReviews: result.project_reverse_reviews.anonymous_reviews,
        averageRating: result.project_reverse_reviews.average_rating,
        recent: result.project_reverse_reviews.recent.map((review) => ({
          id: review.id,
          reviewerId: review.reviewer_id,
          reviewerUsername: review.reviewer_username,
          rating: review.rating,
          comment: review.comment,
          isAnonymous: review.is_anonymous,
          createdAt: review.created_at,
        })),
      },
      reviewGovernance: {
        totalSessions: result.review_governance.total_sessions,
        pendingSessions: result.review_governance.pending_sessions,
        overdueSessions: result.review_governance.overdue_sessions,
        disputedSessions: result.review_governance.disputed_sessions,
        completedSessions: result.review_governance.completed_sessions,
        requiredPendingAssignments: result.review_governance.required_pending_assignments,
        fallbackPendingAssignments: result.review_governance.fallback_pending_assignments,
        completionRate: result.review_governance.completion_rate,
      },
      permissions: result.permissions,
    },
  }
}

export function mapProjectMutationApiBody(project: SerializableModelRecord | SerializedModelRecord) {
  const serialized = serializeModelForHttpResponse(project) as {
    [key: string]: unknown
  }
  const rest = { ...serialized }
  const organizationId = rest['organizationId'] ?? rest['organization_id']
  const creatorId = rest['creatorId'] ?? rest['creator_id']
  const managerId = rest['managerId'] ?? rest['manager_id']
  const ownerId = rest['ownerId'] ?? rest['owner_id']
  const startDate = rest['startDate'] ?? rest['start_date']
  const endDate = rest['endDate'] ?? rest['end_date']
  const createdAt = rest['createdAt'] ?? rest['created_at']
  const updatedAt = rest['updatedAt'] ?? rest['updated_at']

  delete rest['organization_id']
  delete rest['creator_id']
  delete rest['manager_id']
  delete rest['owner_id']
  delete rest['start_date']
  delete rest['end_date']
  delete rest['created_at']
  delete rest['updated_at']

  return {
    data: {
      ...rest,
      organizationId: (organizationId as string | null | undefined) ?? undefined,
      creatorId: (creatorId as string | null | undefined) ?? undefined,
      managerId: (managerId as string | null | undefined) ?? undefined,
      ownerId: (ownerId as string | null | undefined) ?? undefined,
      startDate: (startDate as string | null | undefined) ?? undefined,
      endDate: (endDate as string | null | undefined) ?? undefined,
      createdAt: (createdAt as string | null | undefined) ?? undefined,
      updatedAt: (updatedAt as string | null | undefined) ?? undefined,
    },
  }
}

export function mapRoleStaffingCandidatesApiBody(result: RoleStaffingCandidatesApiResult) {
  return {
    data: {
      role: result.role,
      requirements: result.requirements.map((requirement) => ({
        skillId: requirement.skill_id,
        skillName: requirement.skill_name,
        minimumLevelId: requirement.minimum_level_id,
        targetLevelId: requirement.target_level_id,
        assessmentCeilingLevelId: requirement.assessment_ceiling_level_id,
        isMandatory: requirement.is_mandatory,
        importance: requirement.importance,
        weight: requirement.weight,
      })),
      candidates: result.candidates.map((candidate) => mapStaffingCandidate(candidate)),
      projectMembers: result.project_members.map((candidate) => mapStaffingCandidate(candidate)),
      orgMembers: result.org_members.map((candidate) => mapStaffingCandidate(candidate)),
    },
  }
}

export function mapOrganizationProjectsPageProps<T extends object>(result: T): T {
  return result
}

interface ProjectDetailPageOptions {
  shellMode?: 'app' | 'organization'
  baseRoute?: string
}

export function mapScopedProjectDetailPageProps<T extends object>(
  result: T,
  options?: ProjectDetailPageOptions
): T & {
  shellMode: 'app' | 'organization'
  baseRoute: string
} {
  return {
    ...result,
    shellMode: options?.shellMode ?? 'app',
    baseRoute: options?.baseRoute ?? '/projects',
  }
}
