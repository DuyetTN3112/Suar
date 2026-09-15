import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  addMissingData,
  compactTask,
  loadOrganizationContext,
  loadPartyContext,
  loadProjectContext,
  loadTaskPeers,
  type TaskContextRow,
} from './lucid_review_dispute_context_loader.js'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { computeDisputeCaseFileCompleteness } from '#modules/disputes/domain/review_dispute_rules'
import {
  loadReviewDisputeComments,
  loadReviewDisputeEvidences,
} from '#modules/disputes/infra/repositories/review_dispute_artifact_queries'

export interface BuiltReviewDisputeCaseFileRecord {
  id: string
  caseVersion: number
  completenessScore: number
  row: Record<string, unknown>
}

export async function buildReviewDisputeCaseFileRecord(
  trx: TransactionClientContract,
  disputeId: string,
  actorId: string
): Promise<BuiltReviewDisputeCaseFileRecord> {
  const dispute = (await trx.from('review_disputes').where('id', disputeId).first()) as
    | {
        id: string
        task_id: string
        task_assignment_id: string
        review_session_id: string
        reviewee_id: string
        dispute_reason: string
        requested_outcome: string
      }
    | undefined

  if (!dispute) {
    throw new NotFoundException('Review dispute not found')
  }

  const task = (await trx.from('tasks').where('id', dispute.task_id).first()) as
    | (Record<string, unknown> & { acceptance_criteria?: string; verification_method?: string })
    | undefined
  const assignment = (await trx
    .from('task_assignments')
    .where('id', dispute.task_assignment_id)
    .first()) as Record<string, unknown> | undefined
  const review = (await trx
    .from('review_sessions')
    .where('id', dispute.review_session_id)
    .first()) as Record<string, unknown> | undefined
  const requiredSkills = (await trx
    .from('task_required_skills')
    .where('task_id', dispute.task_id)
    .select('*')) as Record<string, unknown>[]
  const skillReviews = (await trx
    .from('skill_reviews')
    .where('review_session_id', dispute.review_session_id)
    .select('*')) as Record<string, unknown>[]
  const submission = (await trx
    .from('task_submissions')
    .where('task_id', dispute.task_id)
    .first()) as (Record<string, unknown> & { id: string }) | undefined
  const taskComments = (await trx
    .from('task_comments')
    .where('task_id', dispute.task_id)
    .whereNull('deleted_at')
    .select('*')) as Record<string, unknown>[]
  const disputeComments = await loadReviewDisputeComments(trx, disputeId)
  const taskHistory = (await trx
    .from('task_versions')
    .where('task_id', dispute.task_id)
    .orderBy('changed_at', 'asc')) as Record<string, unknown>[]

  const evidences = await loadReviewDisputeEvidences(trx, disputeId)

  const latest = (await trx
    .from('review_dispute_case_files')
    .where('dispute_id', disputeId)
    .max('case_version as latest_version')
    .first()) as { latest_version: number | null } | undefined

  const nextVersion = (latest?.latest_version ?? 0) + 1
  const { completenessScore, missingData } = computeDisputeCaseFileCompleteness({
    task,
    assignment,
    review,
    submission,
    requiredSkills,
    skillReviews,
  })
  const typedTask = task as TaskContextRow | undefined
  const assignerId = assignment?.['assigned_by'] ?? task?.['creator_id']
  const organizationContext = await loadOrganizationContext(trx, typedTask?.organization_id)
  const projectContext = await loadProjectContext(
    trx,
    typedTask?.project_id,
    typedTask?.project_sprint_id
  )
  const relatedProjectTasks = await loadTaskPeers(trx, typedTask, 'project')
  const sprintPeerTasks = await loadTaskPeers(trx, typedTask, 'sprint')
  const reviewerContext = await loadPartyContext(
    trx,
    assignerId,
    typedTask?.organization_id,
    typedTask?.project_id
  )
  const revieweeContext = await loadPartyContext(
    trx,
    dispute.reviewee_id,
    typedTask?.organization_id,
    typedTask?.project_id
  )
  const taskSnapshot = {
    ...compactTask(task ?? {}),
    organization: organizationContext,
    project: projectContext,
    related_project_tasks: relatedProjectTasks,
    sprint_peer_tasks: sprintPeerTasks,
  }
  const contextualMissingData = [...missingData]

  if (Object.keys(organizationContext).length === 0) {
    addMissingData(contextualMissingData, 'organization_context')
  }
  if (Object.keys(projectContext).length === 0) {
    addMissingData(contextualMissingData, 'project_context')
  }
  if (relatedProjectTasks.length === 0) {
    addMissingData(contextualMissingData, 'related_project_tasks')
  }
  if (sprintPeerTasks.length === 0) {
    addMissingData(contextualMissingData, 'sprint_peer_tasks')
  }
  if (Object.keys((reviewerContext['profile'] ?? {})).length === 0) {
    addMissingData(contextualMissingData, 'reviewer_profile_context')
  }
  if (
    !Array.isArray(reviewerContext['work_schedule']) ||
    reviewerContext['work_schedule'].length === 0
  ) {
    addMissingData(contextualMissingData, 'reviewer_work_schedule_context')
  }
  if (Object.keys((revieweeContext['profile'] ?? {})).length === 0) {
    addMissingData(contextualMissingData, 'reviewee_profile_context')
  }
  if (
    !Array.isArray(revieweeContext['work_schedule']) ||
    revieweeContext['work_schedule'].length === 0
  ) {
    addMissingData(contextualMissingData, 'reviewee_work_schedule_context')
  }

  const [created] = (await trx
    .table('review_dispute_case_files')
    .insert({
      dispute_id: disputeId,
      case_version: nextVersion,
      task_snapshot: JSON.stringify(taskSnapshot),
      required_skills_snapshot: JSON.stringify(requiredSkills),
      acceptance_criteria_snapshot: JSON.stringify({
        acceptance_criteria: task?.acceptance_criteria ?? null,
        verification_method: task?.verification_method ?? null,
      }),
      assignment_snapshot: JSON.stringify(assignment ?? {}),
      submission_snapshot: JSON.stringify(submission ?? {}),
      review_snapshot: JSON.stringify(review ?? {}),
      skill_reviews_snapshot: JSON.stringify(skillReviews),
      evidences_snapshot: JSON.stringify(evidences),
      self_assessment_snapshot: JSON.stringify({}),
      task_comments_snapshot: JSON.stringify(taskComments),
      task_history_snapshot: JSON.stringify(taskHistory),
      reviewee_profile_context_snapshot: JSON.stringify(revieweeContext),
      reviewer_context_snapshot: JSON.stringify(reviewerContext),
      dispute_claim_snapshot: JSON.stringify({
        dispute_id: dispute.id,
        dispute_review_type: 'task_review',
        dispute_reason: dispute.dispute_reason,
        requested_outcome: dispute.requested_outcome,
        dispute_comments: disputeComments,
      }),
      completeness_score: completenessScore,
      missing_data: JSON.stringify(contextualMissingData.map((key) => ({ key }))),
      created_by: actorId,
    })
    .returning('*')) as [Record<string, unknown>]

  return {
    id: String(created['id']),
    caseVersion: nextVersion,
    completenessScore,
    row: created,
  }
}
