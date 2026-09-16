import type { ProjectDetailProjectionReader } from '#modules/projects/actions/ports/outbound/project_detail_projection_reader'
import type { ProjectReverseReviewReader } from '#modules/projects/actions/ports/outbound/project_reverse_review_reader'
import type { GetProjectDetailResult } from '#modules/projects/public_contracts/project_detail'

type ProjectReviewGovernanceSummary = GetProjectDetailResult['review_governance']
type ProjectReverseReviewSummary = GetProjectDetailResult['project_reverse_reviews']

export async function loadProjectReviewGovernance(
  projectId: string,
  detailProjection: ProjectDetailProjectionReader
): Promise<ProjectReviewGovernanceSummary> {
  const { sessions: statusRows, pendingAssignmentRequirements } =
    await detailProjection.loadReviewGovernanceRows(projectId)

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

export async function loadProjectReverseReviews(
  projectId: string,
  reverseReviews: ProjectReverseReviewReader,
  detailProjection: ProjectDetailProjectionReader
): Promise<ProjectReverseReviewSummary> {
  const [stats, recentRows] = await Promise.all([
    reverseReviews.loadProjectStats(projectId),
    detailProjection.listRecentReverseReviews(projectId, 5),
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
