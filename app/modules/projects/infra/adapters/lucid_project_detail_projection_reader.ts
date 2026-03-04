import db from '@adonisjs/lucid/services/db'

import type {
  ProjectDetailProjectionReader,
  ProjectReverseReviewProjection,
  ProjectReviewSessionProjection,
} from '#modules/projects/actions/ports/outbound/project_detail_projection_reader'

export class LucidProjectDetailProjectionReader implements ProjectDetailProjectionReader {
  async loadReviewGovernanceRows(projectId: string): Promise<{
    sessions: ProjectReviewSessionProjection[]
    pendingAssignmentRequirements: boolean[]
  }> {
    const [sessions, assignments] = (await Promise.all([
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
      ProjectReviewSessionProjection[],
      Array<{ is_required: boolean }>,
    ]

    return {
      sessions,
      pendingAssignmentRequirements: assignments.map(
        (assignment) => assignment.is_required === true
      ),
    }
  }

  async listRecentReverseReviews(
    projectId: string,
    limit: number
  ): Promise<ProjectReverseReviewProjection[]> {
    const [legacyRows, sprintRows] = (await Promise.all([
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
        .limit(limit),
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
        .limit(limit),
    ])) as [ProjectReverseReviewProjection[], ProjectReverseReviewProjection[]]

    return [...legacyRows, ...sprintRows]
      .sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      )
      .slice(0, limit)
  }
}
