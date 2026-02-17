import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import type { ReviewDisputeAuthorContext } from '#modules/reviews/actions/ports/outbound/review_dispute_artifact_reader'
import type { ReviewDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_dispute_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { canRespondToReviewDispute } from '#modules/reviews/domain/review_dispute_rules'
import { buildReviewDisputeEvent } from '#modules/reviews/observability/review_event_factory'
import { ReviewDisputeStatus } from '#modules/reviews/public_contracts/review_constants'

export interface RespondToReviewDisputeDTO {
  dispute_id: string
  body: string
  visibility?: 'all_parties' | 'admin_only'
}

export interface ReviewDisputeResponseResult {
  id: string
  dispute_id: string
  author_id: string
  author_context: ReviewDisputeAuthorContext
  body: string
  visibility: 'all_parties' | 'admin_only'
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

export default class RespondToReviewDisputeCommand {
  constructor(
    private execCtx: ReviewActionContext,
    private readonly disputes: ReviewDisputeUnitOfWork
  ) {}

  async execute(dto: RespondToReviewDisputeDTO): Promise<ReviewDisputeResponseResult> {
    const actorId = requireUserId(this.execCtx)
    const startedAt = Date.now()
    platformOperationalLogger.log(
      'info',
      buildReviewDisputeEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_RESPONSE_CREATED,
        eventFamily: 'dispute',
        subsystem: 'review_dispute_comments',
        workflow: 'review_dispute_respond',
        stage: 'started',
        outcome: 'success',
        disputeId: dto.dispute_id,
        change: {
          visibility: dto.visibility ?? 'all_parties',
        },
        retentionClass: 'transient_runtime',
      })
    )
    try {
      const result = await this.disputes.run(async (session) => {
        const access = await session.loadAccess(dto.dispute_id, actorId)
        const policyResult = canRespondToReviewDispute({
          disputeStatus: access.dispute.status,
          body: dto.body,
          canRespond: access.canRespond,
        })

        if (!policyResult.allowed) {
          if (policyResult.code === 'FORBIDDEN') {
            throw new ForbiddenException(policyResult.reason)
          }
          throw new BusinessLogicException(policyResult.reason)
        }

        if (!access.authorContext) {
          throw new ForbiddenException('Review dispute responder context is required')
        }
        const authorContext = access.authorContext

        const created = await session.createComment({
          disputeId: dto.dispute_id,
          authorId: actorId,
          body: dto.body.trim(),
          visibility: dto.visibility ?? 'all_parties',
        })
        const nextDisputeStatus =
          access.dispute.status === 'pending'
            ? ReviewDisputeStatus.COLLECTING_EVIDENCE
            : access.dispute.status

        if (access.dispute.status === 'pending') {
          await session.advancePendingDispute(dto.dispute_id)
        }

        if (this.execCtx.userId) {
          await session.writeAudit(this.execCtx, {
            userId: this.execCtx.userId,
            action: 'respond_to_review_dispute',
            entityId: dto.dispute_id,
            newValues: {
              comment_id: created['id'],
              visibility: created['visibility'],
              dispute_status: nextDisputeStatus,
            },
          })
        }

        return { access, authorContext, created, nextDisputeStatus }
      })

      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildReviewDisputeEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_RESPONSE_CREATED,
          eventFamily: 'dispute',
          subsystem: 'review_dispute_comments',
          workflow: 'review_dispute_respond',
          stage: 'completed',
          outcome: 'success',
          disputeId: dto.dispute_id,
          reviewSessionId: result.access.dispute.review_session_id,
          taskAssignmentId: result.access.dispute.task_assignment_id,
          taskId: result.access.dispute.task_id,
          revieweeId: result.access.dispute.reviewee_id,
          change: {
            comment_id: result.created['id'],
            visibility: result.created['visibility'],
            dispute_status: result.nextDisputeStatus,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
        })
      )

      return {
        ...(result.created as unknown as Omit<ReviewDisputeResponseResult, 'author_context'>),
        author_context: result.authorContext,
      }
    } catch (error) {
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildReviewDisputeEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_RESPONSE_FAILED,
          eventFamily: 'dispute',
          subsystem: 'review_dispute_comments',
          workflow: 'review_dispute_respond',
          stage: 'failed',
          outcome: 'failure',
          disputeId: dto.dispute_id,
          change: {
            visibility: dto.visibility ?? 'all_parties',
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
}
