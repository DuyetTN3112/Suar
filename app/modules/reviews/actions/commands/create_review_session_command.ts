import emitter from '@adonisjs/core/services/emitter'

import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { CreateReviewSessionDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import {
  createReviewerAssignmentsForSession,
  resolveEffectiveCreatorReviewerId,
  resolveReviewSessionDeadline,
} from '#modules/reviews/actions/support/review_session_reviewer_assignments'
import { REVIEW_DEFAULTS } from '#modules/reviews/constants/review_constants'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import type { ReviewSessionRecord } from '#modules/reviews/types/review_records'

/**
 * CreateReviewSessionCommand
 *
 * Creates a review session after a task assignment is completed.
 * This initiates the 360° review process.
 */
export default class CreateReviewSessionCommand extends BaseCommand<
  CreateReviewSessionDTO,
  ReviewSessionRecord
> {
  async handle(dto: CreateReviewSessionDTO): Promise<ReviewSessionRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      // Verify task assignment exists and is completed
      const assignment = await DefaultReviewDependencies.taskAssignment.findCompletedAssignment(
        dto.task_assignment_id,
        trx
      )

      if (!assignment) {
        throw new BusinessLogicException('Task assignment phải tồn tại và đã hoàn thành')
      }

      if (assignment.assignee_id !== dto.reviewee_id) {
        throw new BusinessLogicException('Reviewee must match assignment assignee')
      }

      const task = (await trx
        .from('task_assignments as ta')
        .join('tasks as t', 't.id', 'ta.task_id')
        .where('ta.id', dto.task_assignment_id)
        .select('t.creator_id')
        .first()) as { creator_id?: string } | null

      // Check if review session already exists
      const existing = await ReviewSessionRepository.findByTaskAssignment(
        dto.task_assignment_id,
        trx
      )

      if (existing) {
        throw new ConflictException('Review session already exists for this assignment')
      }

      const creatorReviewerId = await resolveEffectiveCreatorReviewerId(
        {
          task_assignment_id: dto.task_assignment_id,
          reviewee_id: dto.reviewee_id,
          creator_reviewer_id: task?.creator_id ?? null,
        },
        trx
      )

      // Create review session
      const session = await ReviewSessionRepository.create(
        {
          task_assignment_id: dto.task_assignment_id,
          reviewee_id: dto.reviewee_id,
          status: 'pending',
          manager_review_completed: false,
          creator_reviewer_id: creatorReviewerId,
          creator_review_completed: false,
          manager_reviews_count: 0,
          peer_reviews_count: 0,
          required_peer_reviews: dto.required_peer_reviews,
          required_total_reviews: REVIEW_DEFAULTS.MIN_TOTAL_REVIEWS,
          minimum_manager_reviews: REVIEW_DEFAULTS.MIN_MANAGER_REVIEWS,
          minimum_peer_reviews: REVIEW_DEFAULTS.MINIMUM_PEER_REVIEWS,
          deadline: resolveReviewSessionDeadline(),
        },
        trx
      )

      await createReviewerAssignmentsForSession(
        {
          id: session.id,
          task_assignment_id: session.task_assignment_id,
          reviewee_id: session.reviewee_id,
          creator_reviewer_id: session.creator_reviewer_id,
          deadline: session.deadline,
          minimum_manager_reviews: session.minimum_manager_reviews,
          minimum_peer_reviews: session.minimum_peer_reviews,
          required_peer_reviews: session.required_peer_reviews,
        },
        trx
      )

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'create',
          entity_type: 'review_session',
          entity_id: session.id,
          old_values: null,
          new_values: {
            task_assignment_id: dto.task_assignment_id,
            reviewee_id: dto.reviewee_id,
          },
        })
      }

      return {
        session,
        auditEvent: {
          userId: this.getCurrentUserId(),
          action: 'create',
          entityType: 'review_session',
          entityId: session.id,
          newValues: {
            task_assignment_id: dto.task_assignment_id,
            reviewee_id: dto.reviewee_id,
          },
        },
      }
    })

    void emitter.emit('audit:log', result.auditEvent)

    return result.session
  }
}
