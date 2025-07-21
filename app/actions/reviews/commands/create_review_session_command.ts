import emitter from '@adonisjs/core/services/emitter'

import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { BaseCommand } from '#actions/reviews/base_command'
import type { CreateReviewSessionDTO } from '#actions/reviews/dtos/request/review_dtos'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ConflictException from '#exceptions/conflict_exception'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import type { ReviewSessionRecord } from '#types/review_records'

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

      // Check if review session already exists
      const existing = await ReviewSessionRepository.findByTaskAssignment(
        dto.task_assignment_id,
        trx
      )

      if (existing) {
        throw new ConflictException('Review session already exists for this assignment')
      }

      // Create review session
      const session = await ReviewSessionRepository.create(
        {
          task_assignment_id: dto.task_assignment_id,
          reviewee_id: dto.reviewee_id,
          status: 'pending',
          manager_review_completed: false,
          peer_reviews_count: 0,
          required_peer_reviews: dto.required_peer_reviews,
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
