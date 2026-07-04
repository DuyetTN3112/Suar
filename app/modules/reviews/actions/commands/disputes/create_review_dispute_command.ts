import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ReviewConfirmationDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_confirmation_dispute_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  canOpenReviewDispute,
  isActiveReviewDisputeStatus,
} from '#modules/reviews/domain/disputes/review_dispute_rules'
import { buildReviewDisputeEvent } from '#modules/reviews/observability/review_event_factory'
import {
  ReviewDisputeStatus,
  ReviewSessionStatus,
} from '#modules/reviews/public_contracts/review_constants'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'

export interface CreateReviewDisputeDTO {
  review_session_id: string
  dispute_reason: string
  disputed_dimensions?: Record<string, unknown> | null
  disputed_skill_reviews?: Record<string, unknown>[] | null
  requested_outcome:
    | 'adjust_score'
    | 'remove_review'
    | 'request_re_review'
    | 'add_context'
    | 'other'
}

export interface ReviewDisputeResult {
  id: string
  review_session_id: string
  task_assignment_id: string
  task_id: string
  reviewee_id: string
  opened_by: string
  status: string
  dispute_reason: string
  requested_outcome: string
  resolved_by: string | null
  final_decision: string | null
  final_rationale: string | null
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

function toResult(row: Record<string, unknown>): ReviewDisputeResult {
  return row as unknown as ReviewDisputeResult
}

function daysSinceCompleted(value: Date | string | null): number | null {
  if (!value) return null
  const completedAt = value instanceof Date ? DateTime.fromJSDate(value) : DateTime.fromISO(value)
  return Math.floor(DateTime.now().diff(completedAt, 'days').days)
}

export default class CreateReviewDisputeCommand extends BaseCommand<
  CreateReviewDisputeDTO,
  ReviewDisputeResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewConfirmationDisputeUnitOfWork
  ) {
    super(execCtx)
  }

  async handle(dto: CreateReviewDisputeDTO): Promise<ReviewDisputeResult> {
    const actorId = requireUserId(this.execCtx)
    const startedAt = Date.now()
    platformOperationalLogger.log(
      'info',
      buildReviewDisputeEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_CREATED,
        eventFamily: 'dispute',
        subsystem: 'review_disputes',
        workflow: 'review_dispute_create',
        stage: 'started',
        outcome: 'success',
        disputeId: null,
        reviewSessionId: dto.review_session_id,
        change: {
          requested_outcome: dto.requested_outcome,
        },
        retentionClass: 'transient_runtime',
      })
    )

    try {
      const result = await this.unitOfWork.run(async (persistence) => {
        const session = await persistence.loadSessionForUpdate(dto.review_session_id)
        if (!session) {
          throw new NotFoundException('Review session not found')
        }
        const assignment = await persistence.loadAssignment(session.taskAssignmentId)
        if (!assignment) {
          throw new NotFoundException('Task assignment not found')
        }
        const disputeStatuses = await persistence.listDisputeStatuses(session.id)
        const policy = canOpenReviewDispute({
          actorId,
          revieweeId: session.revieweeId,
          reviewSessionStatus: session.status,
          hasActiveDispute: disputeStatuses.some(isActiveReviewDisputeStatus),
          disputeReason: dto.dispute_reason,
          daysSinceCompleted: daysSinceCompleted(session.completedAt),
        })
        if (!policy.allowed) {
          if (policy.code === 'FORBIDDEN') {
            throw new ForbiddenException(policy.reason)
          }
          throw new BusinessLogicException(policy.reason)
        }

        const disputeReason = dto.dispute_reason.trim()
        const created = await persistence.createDispute({
          reviewSessionId: session.id,
          taskAssignmentId: assignment.id,
          taskId: assignment.taskId,
          revieweeId: session.revieweeId,
          openedBy: actorId,
          status: ReviewDisputeStatus.PENDING,
          disputeReason,
          disputedDimensions: dto.disputed_dimensions ?? null,
          disputedSkillReviews: dto.disputed_skill_reviews ?? null,
          requestedOutcome: dto.requested_outcome,
        })

        const confirmations = [...session.confirmations]
        let confirmation: ReviewConfirmationEntry | undefined = confirmations.find(
          (entry) => entry.user_id === actorId && entry.action === 'disputed'
        )
        if (!confirmation) {
          confirmation = {
            user_id: actorId,
            action: 'disputed',
            dispute_reason: disputeReason,
            created_at: DateTime.now().toISO(),
          }
          confirmations.push(confirmation)
        }
        await persistence.saveSessionState({
          reviewSessionId: session.id,
          status: ReviewSessionStatus.DISPUTED,
          confirmations,
          updatedAt: new Date(),
        })
        await persistence.stageTalentProjection({
          revieweeUserId: session.revieweeId,
          sourceEventName: 'review_dispute:created',
          sourceEventId: created['id'] as string,
          occurredAt: new Date().toISOString(),
        })
        await persistence.writeAudit(this.execCtx, {
          userId: actorId,
          action: 'create_review_dispute',
          entityType: 'review_dispute',
          entityId: created['id'] as string,
          newValues: {
            review_session_id: session.id,
            task_assignment_id: assignment.id,
            requested_outcome: dto.requested_outcome,
          },
        })

        return { created, session, assignment }
      })

      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildReviewDisputeEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_CREATED,
          eventFamily: 'dispute',
          subsystem: 'review_disputes',
          workflow: 'review_dispute_create',
          stage: 'completed',
          outcome: 'success',
          disputeId: result.created['id'] as string,
          reviewSessionId: result.session.id,
          taskAssignmentId: result.assignment.id,
          taskId: result.assignment.taskId,
          revieweeId: result.session.revieweeId,
          change: {
            requested_outcome: dto.requested_outcome,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
        })
      )
      return toResult(result.created)
    } catch (error) {
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildReviewDisputeEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_CREATION_FAILED,
          eventFamily: 'dispute',
          subsystem: 'review_disputes',
          workflow: 'review_dispute_create',
          stage: 'failed',
          outcome: 'failure',
          disputeId: null,
          reviewSessionId: dto.review_session_id,
          change: {
            requested_outcome: dto.requested_outcome,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
          error,
        })
      )
      throw error
    }
  }

  execute(dto: CreateReviewDisputeDTO): Promise<ReviewDisputeResult> {
    return this.handle(dto)
  }
}
