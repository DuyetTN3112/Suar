import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import CloseProjectSprintReviewCommand, {
  type CloseProjectSprintReviewDTO,
  type CloseProjectSprintReviewResult,
} from '../commands/close_project_sprint_review_command.js'
import type { ReviewActionContext } from '../review_action_context.js'
import {
  loadReverseReviewTargetStats,
  loadUserReverseReviewSummary,
  type ReverseReviewPersonSummary,
  type ReverseReviewTargetStatsRecord,
} from '../support/reverse_review_target_stats.js'

import ReviewEvidenceRepository from '#modules/reviews/infra/repositories/review_evidence_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'

type ReverseReviewTargetType = 'peer' | 'manager' | 'project' | 'organization'

export class ReviewPublicApi {
  async hasAnyForTask(taskId: string, trx?: TransactionClientContract): Promise<boolean> {
    return ReviewSessionRepository.hasAnyForTask(taskId, trx)
  }

  async countPendingForProject(
    projectId: string,
    trx?: TransactionClientContract
  ): Promise<number> {
    return ReviewSessionRepository.countPendingForProject(projectId, trx)
  }

  async hasAnyForTasksWithStatus(
    taskStatusId: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return ReviewSessionRepository.hasAnyForTasksWithStatus(taskStatusId, trx)
  }

  async listEvidencesBySession(reviewSessionId: string, trx?: TransactionClientContract) {
    return ReviewEvidenceRepository.listBySession(reviewSessionId, trx)
  }

  async loadReverseReviewTargetStats(
    targetType: ReverseReviewTargetType,
    targetId: string,
    trx?: TransactionClientContract
  ): Promise<ReverseReviewTargetStatsRecord | null> {
    return loadReverseReviewTargetStats(targetType, targetId, trx)
  }

  async loadUserReverseReviewSummary(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<ReverseReviewPersonSummary | null> {
    return loadUserReverseReviewSummary(userId, trx)
  }

  async closeProjectSprintReview(
    input: CloseProjectSprintReviewDTO,
    execCtx: ReviewActionContext
  ): Promise<CloseProjectSprintReviewResult> {
    return new CloseProjectSprintReviewCommand(execCtx).execute(input)
  }
}

export const reviewPublicApi = new ReviewPublicApi()
