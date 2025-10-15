import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import type { ReviewDisputeResult } from '#modules/reviews/actions/commands/create_review_dispute_command'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  VALID_PROFILE_UPDATE_ACTIONS,
  VALID_REVIEWER_CREDIBILITY_ACTIONS,
} from '#modules/reviews/constants/review_constants'
import { evaluateReviewDisputeReadiness } from '#modules/reviews/domain/review_dispute_readiness'
import { canResolveReviewDispute } from '#modules/reviews/domain/review_dispute_rules'
import { buildReviewDisputeEvent } from '#modules/reviews/observability/review_event_factory'

export type ResolveDisputeSourceType =
  | 'review_dispute'
  | 'sprint_review_dispute'
  | 'sprint_reverse_review_workflow'
  | 'task_review_workflow'

export interface ResolveReviewDisputeDTO {
  dispute_id: string
  source_type?: ResolveDisputeSourceType
  final_decision:
    | 'uphold_review'
    | 'adjust_score'
    | 'request_re_review'
    | 'dismiss_dispute'
    | 'partially_accept'
  final_rationale: string
  profile_update_action?: string | null
  reviewer_credibility_action?: string | null
  override_readiness?: boolean
  override_reason?: string | null
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

export default class ResolveReviewDisputeCommand {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: ResolveReviewDisputeDTO): Promise<ReviewDisputeResult> {
    const actorId = requireUserId(this.execCtx)
    const startedAt = Date.now()
    platformOperationalLogger.log(
      'info',
      buildReviewDisputeEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_RESOLVED,
        eventFamily: 'dispute',
        subsystem: 'review_disputes',
        workflow: 'review_dispute_resolve',
        stage: 'started',
        outcome: 'success',
        disputeId: dto.dispute_id,
        change: {
          final_decision: dto.final_decision,
        },
        retentionClass: 'transient_runtime',
      })
    )
    const trx = await db.transaction()

    try {
      const actor = (await trx.from('users').where('id', actorId).select('system_role').first()) as
        | { system_role: string }
        | undefined
      if (!actor) {
        throw new NotFoundException('User not found')
      }

      if (dto.source_type === 'sprint_review_dispute') {
        const resolved = await this.resolveSprintReviewDispute(
          trx,
          dto,
          actorId,
          actor.system_role,
          startedAt
        )
        await trx.commit()
        return resolved
      }

      if (dto.source_type === 'sprint_reverse_review_workflow') {
        const resolved = await this.resolveSprintReverseReviewWorkflow(
          trx,
          dto,
          actorId,
          actor.system_role,
          startedAt
        )
        await trx.commit()
        return resolved
      }

      if (dto.source_type === 'task_review_workflow') {
        const resolved = await this.resolveTaskReviewWorkflow(
          trx,
          dto,
          actorId,
          actor.system_role,
          startedAt
        )
        await trx.commit()
        return resolved
      }

      const dispute = (await trx
        .from('review_disputes')
        .where('id', dto.dispute_id)
        .forUpdate()
        .first()) as
        | {
            status: string
            review_session_id: string
          }
        | undefined

      if (!dispute) {
        const resolved = await this.resolveSprintReviewDisputeIfPresent(
          trx,
          dto,
          actorId,
          actor.system_role,
          startedAt
        )
        if (resolved) {
          await trx.commit()
          return resolved
        }

        const reverseResolved = await this.resolveSprintReverseReviewWorkflowIfPresent(
          trx,
          dto,
          actorId,
          actor.system_role,
          startedAt
        )
        if (reverseResolved) {
          await trx.commit()
          return reverseResolved
        }

        const taskWorkflowResolved = await this.resolveTaskReviewWorkflowIfPresent(
          trx,
          dto,
          actorId,
          actor.system_role,
          startedAt
        )
        if (taskWorkflowResolved) {
          await trx.commit()
          return taskWorkflowResolved
        }

        throw new NotFoundException('Review dispute not found')
      }

      const policyResult = canResolveReviewDispute({
        actorSystemRole: actor.system_role,
        disputeStatus: dispute.status,
        finalDecision: dto.final_decision,
        finalRationale: dto.final_rationale,
      })

      if (!policyResult.allowed) {
        if (policyResult.code === 'FORBIDDEN') {
          throw new ForbiddenException(policyResult.reason)
        }
        throw new BusinessLogicException(policyResult.reason)
      }

      // Validate typed actions
      if (
        dto.profile_update_action &&
        !VALID_PROFILE_UPDATE_ACTIONS.has(dto.profile_update_action)
      ) {
        throw new BusinessLogicException(
          `Invalid profile_update_action: ${dto.profile_update_action}`
        )
      }
      if (
        dto.reviewer_credibility_action &&
        !VALID_REVIEWER_CREDIBILITY_ACTIONS.has(dto.reviewer_credibility_action)
      ) {
        throw new BusinessLogicException(
          `Invalid reviewer_credibility_action: ${dto.reviewer_credibility_action}`
        )
      }

      await this.enforceDossierReadiness(dto)

      const [resolved] = (await trx
        .from('review_disputes')
        .where('id', dto.dispute_id)
        .update({
          status: 'resolved',
          resolved_at: db.raw('NOW()'),
          resolved_by: actorId,
          final_decision: dto.final_decision,
          final_rationale: dto.final_rationale.trim(),
          profile_update_action: dto.profile_update_action ?? null,
          reviewer_credibility_action: dto.reviewer_credibility_action ?? null,
          updated_at: db.raw('NOW()'),
        })
        .returning('*')) as Record<string, unknown>[]

      const resolvedResult = resolved as unknown as ReviewDisputeResult

      const reviewers = (await trx
        .from('skill_reviews')
        .where('review_session_id', dispute.review_session_id)
        .select('reviewer_id')) as { reviewer_id: string }[]
      const reviewerIds = Array.from(new Set(reviewers.map((r) => r.reviewer_id)))

      await trx.commit()

      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'resolve_review_dispute',
          entity_type: 'review_dispute',
          entity_id: dto.dispute_id,
          old_values: null,
          new_values: {
            final_decision: dto.final_decision,
            profile_update_action: dto.profile_update_action ?? null,
            reviewer_credibility_action: dto.reviewer_credibility_action ?? null,
          },
        })
      }

      await emitter.emit('dispute:resolved', {
        disputeId: resolvedResult.id,
        reviewSessionId: resolvedResult.review_session_id,
        revieweeId: resolvedResult.reviewee_id,
        reviewerIds,
        resolvedBy: actorId,
        finalDecision: dto.final_decision,
        ...(dto.profile_update_action !== undefined
          ? { profileUpdateAction: dto.profile_update_action }
          : {}),
        ...(dto.reviewer_credibility_action !== undefined
          ? { reviewerCredibilityAction: dto.reviewer_credibility_action }
          : {}),
      })

      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildReviewDisputeEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_RESOLVED,
          eventFamily: 'dispute',
          subsystem: 'review_disputes',
          workflow: 'review_dispute_resolve',
          stage: 'completed',
          outcome: 'success',
          disputeId: resolvedResult.id,
          reviewSessionId: resolvedResult.review_session_id,
          revieweeId: resolvedResult.reviewee_id,
          change: {
            final_decision: dto.final_decision,
            profile_update_action: dto.profile_update_action ?? null,
            reviewer_credibility_action: dto.reviewer_credibility_action ?? null,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
        })
      )

      return resolvedResult
    } catch (error) {
      await trx.rollback()
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildReviewDisputeEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_RESOLUTION_FAILED,
          eventFamily: 'dispute',
          subsystem: 'review_disputes',
          workflow: 'review_dispute_resolve',
          stage: 'failed',
          outcome: 'failure',
          disputeId: dto.dispute_id,
          change: {
            final_decision: dto.final_decision,
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

  private validateTypedActions(dto: ResolveReviewDisputeDTO): void {
    if (dto.profile_update_action && !VALID_PROFILE_UPDATE_ACTIONS.has(dto.profile_update_action)) {
      throw new BusinessLogicException(
        `Invalid profile_update_action: ${dto.profile_update_action}`
      )
    }
    if (
      dto.reviewer_credibility_action &&
      !VALID_REVIEWER_CREDIBILITY_ACTIONS.has(dto.reviewer_credibility_action)
    ) {
      throw new BusinessLogicException(
        `Invalid reviewer_credibility_action: ${dto.reviewer_credibility_action}`
      )
    }
  }

  private async resolveSprintReviewDisputeIfPresent(
    trx: TransactionClientContract,
    dto: ResolveReviewDisputeDTO,
    actorId: string,
    actorSystemRole: string,
    startedAt: number
  ): Promise<ReviewDisputeResult | null> {
    const exists = (await trx
      .from('sprint_review_disputes')
      .where('id', dto.dispute_id)
      .select('id')
      .first()) as { id: string } | undefined
    if (!exists) return null
    return this.resolveSprintReviewDispute(trx, dto, actorId, actorSystemRole, startedAt)
  }

  private async resolveSprintReverseReviewWorkflowIfPresent(
    trx: TransactionClientContract,
    dto: ResolveReviewDisputeDTO,
    actorId: string,
    actorSystemRole: string,
    startedAt: number
  ): Promise<ReviewDisputeResult | null> {
    const exists = (await trx
      .from('sprint_reverse_review_workflows')
      .where('id', dto.dispute_id)
      .select('id')
      .first()) as { id: string } | undefined
    if (!exists) return null
    return this.resolveSprintReverseReviewWorkflow(trx, dto, actorId, actorSystemRole, startedAt)
  }

  private async resolveTaskReviewWorkflowIfPresent(
    trx: TransactionClientContract,
    dto: ResolveReviewDisputeDTO,
    actorId: string,
    actorSystemRole: string,
    startedAt: number
  ): Promise<ReviewDisputeResult | null> {
    const exists = (await trx
      .from('task_review_workflows')
      .where('id', dto.dispute_id)
      .select('id')
      .first()) as { id: string } | undefined
    if (!exists) return null
    return this.resolveTaskReviewWorkflow(trx, dto, actorId, actorSystemRole, startedAt)
  }

  private async resolveSprintReviewDispute(
    trx: TransactionClientContract,
    dto: ResolveReviewDisputeDTO,
    actorId: string,
    actorSystemRole: string,
    startedAt: number
  ): Promise<ReviewDisputeResult> {
    const dispute = (await trx
      .from('sprint_review_disputes')
      .where('id', dto.dispute_id)
      .forUpdate()
      .first()) as
      | {
          id: string
          status: string
          dispute_review_type: string | null
        }
      | undefined
    if (!dispute) throw new NotFoundException('Review dispute not found')

    const policyResult = canResolveReviewDispute({
      actorSystemRole,
      disputeStatus: dispute.status,
      finalDecision: dto.final_decision,
      finalRationale: dto.final_rationale,
    })

    if (!policyResult.allowed) {
      if (policyResult.code === 'FORBIDDEN') throw new ForbiddenException(policyResult.reason)
      throw new BusinessLogicException(policyResult.reason)
    }

    this.validateTypedActions(dto)

    const [resolved] = (await trx
      .from('sprint_review_disputes')
      .where('id', dto.dispute_id)
      .update({
        status: 'resolved',
        resolved_at: db.raw('NOW()'),
        resolved_by: actorId,
        final_decision: dto.final_decision,
        final_rationale: dto.final_rationale.trim(),
        updated_at: db.raw('NOW()'),
      })
      .returning('*')) as Record<string, unknown>[]
    const result = {
      ...resolved,
      source_type: 'sprint_review_dispute',
      review_session_id: null,
      reviewee_id: resolved?.['opened_by'] ?? null,
    } as unknown as ReviewDisputeResult

    await this.writeResolutionAudit('sprint_review_dispute', dto.dispute_id, dto)
    await this.writeResolutionCheckpoint(dto, startedAt, {
      source_type: 'sprint_review_dispute',
      dispute_review_type: dispute.dispute_review_type,
    })

    return result
  }

  private async resolveSprintReverseReviewWorkflow(
    trx: TransactionClientContract,
    dto: ResolveReviewDisputeDTO,
    actorId: string,
    actorSystemRole: string,
    startedAt: number
  ): Promise<ReviewDisputeResult> {
    const workflow = (await trx
      .from('sprint_reverse_review_workflows')
      .where('id', dto.dispute_id)
      .forUpdate()
      .first()) as
      | {
          id: string
          status: string
          target_type: string
          reviewer_id: string
        }
      | undefined
    if (!workflow) throw new NotFoundException('Review dispute not found')

    this.assertCanResolveSprintReverseWorkflow(actorSystemRole, workflow.status, dto)

    const [resolved] = (await trx
      .from('sprint_reverse_review_workflows')
      .where('id', dto.dispute_id)
      .update({
        status: 'resolved',
        resolved_at: db.raw('NOW()'),
        resolved_by: actorId,
        final_decision: dto.final_decision,
        final_rationale: dto.final_rationale.trim(),
        updated_at: db.raw('NOW()'),
      })
      .returning('*')) as Record<string, unknown>[]
    const result = {
      ...resolved,
      source_type: 'sprint_reverse_review_workflow',
      dispute_review_type:
        workflow.target_type === 'environment' ? 'environment_review' : 'manager_review',
      review_session_id: null,
      reviewee_id: workflow.reviewer_id,
    } as unknown as ReviewDisputeResult

    await this.writeResolutionAudit('sprint_reverse_review_workflow', dto.dispute_id, dto)
    await this.writeResolutionCheckpoint(dto, startedAt, {
      source_type: 'sprint_reverse_review_workflow',
      dispute_review_type:
        workflow.target_type === 'environment' ? 'environment_review' : 'manager_review',
    })

    return result
  }

  private async resolveTaskReviewWorkflow(
    trx: TransactionClientContract,
    dto: ResolveReviewDisputeDTO,
    actorId: string,
    actorSystemRole: string,
    startedAt: number
  ): Promise<ReviewDisputeResult> {
    const workflow = (await trx
      .from('task_review_workflows')
      .where('id', dto.dispute_id)
      .forUpdate()
      .first()) as
      | {
          id: string
          status: string
          reviewee_id: string | null
        }
      | undefined
    if (!workflow) throw new NotFoundException('Review dispute not found')

    this.assertCanResolveTaskReviewWorkflow(actorSystemRole, workflow.status, dto)

    const [resolved] = (await trx
      .from('task_review_workflows')
      .where('id', dto.dispute_id)
      .update({
        status: 'resolved',
        resolved_at: db.raw('NOW()'),
        resolved_by: actorId,
        final_decision: dto.final_decision,
        final_rationale: dto.final_rationale.trim(),
        updated_at: db.raw('NOW()'),
      })
      .returning('*')) as Record<string, unknown>[]
    const result = {
      ...resolved,
      source_type: 'task_review_workflow',
      dispute_review_type: 'task_review',
      review_session_id: null,
      reviewee_id: workflow.reviewee_id,
    } as unknown as ReviewDisputeResult

    await this.writeResolutionAudit('task_review_workflow', dto.dispute_id, dto)
    await this.writeResolutionCheckpoint(dto, startedAt, {
      source_type: 'task_review_workflow',
      dispute_review_type: 'task_review',
    })

    return result
  }

  private assertCanResolveSprintReverseWorkflow(
    actorSystemRole: string,
    workflowStatus: string,
    dto: ResolveReviewDisputeDTO
  ): void {
    if (actorSystemRole !== 'system_admin' && actorSystemRole !== 'superadmin') {
      throw new ForbiddenException('Only system admin can resolve review disputes')
    }

    if (workflowStatus === 'resolved') {
      throw new BusinessLogicException('Review dispute is already resolved')
    }

    if (workflowStatus !== 'reported' && workflowStatus !== 'ai_reviewing') {
      throw new BusinessLogicException('Review dispute is not active')
    }

    if (
      ![
        'uphold_review',
        'adjust_score',
        'request_re_review',
        'dismiss_dispute',
        'partially_accept',
      ].includes(dto.final_decision)
    ) {
      throw new BusinessLogicException('Review dispute final decision is invalid')
    }

    if (!dto.final_rationale || dto.final_rationale.trim().length === 0) {
      throw new BusinessLogicException('Review dispute final rationale is required')
    }
  }

  private assertCanResolveTaskReviewWorkflow(
    actorSystemRole: string,
    workflowStatus: string,
    dto: ResolveReviewDisputeDTO
  ): void {
    if (actorSystemRole !== 'system_admin' && actorSystemRole !== 'superadmin') {
      throw new ForbiddenException('Only system admin can resolve review disputes')
    }

    if (workflowStatus === 'resolved') {
      throw new BusinessLogicException('Review dispute is already resolved')
    }

    if (workflowStatus !== 'reported' && workflowStatus !== 'ai_reviewing') {
      throw new BusinessLogicException('Review dispute is not active')
    }

    if (
      ![
        'uphold_review',
        'adjust_score',
        'request_re_review',
        'dismiss_dispute',
        'partially_accept',
      ].includes(dto.final_decision)
    ) {
      throw new BusinessLogicException('Review dispute final decision is invalid')
    }

    if (!dto.final_rationale || dto.final_rationale.trim().length === 0) {
      throw new BusinessLogicException('Review dispute final rationale is required')
    }
  }

  private async writeResolutionAudit(
    entityType: string,
    entityId: string,
    dto: ResolveReviewDisputeDTO
  ): Promise<void> {
    if (!this.execCtx.userId) return

    await auditPublicApi.write(this.execCtx, {
      user_id: this.execCtx.userId,
      action: 'resolve_review_dispute',
      entity_type: entityType,
      entity_id: entityId,
      old_values: null,
      new_values: {
        final_decision: dto.final_decision,
        profile_update_action: dto.profile_update_action ?? null,
        reviewer_credibility_action: dto.reviewer_credibility_action ?? null,
      },
    })
  }

  private async writeResolutionCheckpoint(
    dto: ResolveReviewDisputeDTO,
    startedAt: number,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await platformWorkflowLogger.checkpointSafely(
      this.execCtx,
      buildReviewDisputeEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_RESOLVED,
        eventFamily: 'dispute',
        subsystem: 'review_disputes',
        workflow: 'review_dispute_resolve',
        stage: 'completed',
        outcome: 'success',
        disputeId: dto.dispute_id,
        change: {
          final_decision: dto.final_decision,
          ...metadata,
        },
        runtime: {
          duration_ms: Date.now() - startedAt,
        },
      })
    )
  }

  private async enforceDossierReadiness(dto: ResolveReviewDisputeDTO): Promise<void> {
    const latestCaseFile = (await db
      .from('review_dispute_case_files')
      .where('dispute_id', dto.dispute_id)
      .orderBy('case_version', 'desc')
      .first()) as Record<string, unknown> | undefined

    const readiness = evaluateReviewDisputeReadiness({
      taskSnapshot: parseJsonValue(latestCaseFile?.['task_snapshot']),
      assignmentSnapshot: parseJsonValue(latestCaseFile?.['assignment_snapshot']),
      submissionSnapshot: parseJsonValue(latestCaseFile?.['submission_snapshot']),
      reviewSnapshot: parseJsonValue(latestCaseFile?.['review_snapshot']),
      skillReviewsSnapshot: parseJsonArray(latestCaseFile?.['skill_reviews_snapshot']),
      disputeClaimSnapshot: parseJsonObject(latestCaseFile?.['dispute_claim_snapshot']),
      taskCommentsSnapshot: parseJsonArray(latestCaseFile?.['task_comments_snapshot']),
      evidencesSnapshot: parseJsonArray(latestCaseFile?.['evidences_snapshot']),
      selfAssessmentSnapshot: parseJsonValue(latestCaseFile?.['self_assessment_snapshot']),
      taskHistorySnapshot: parseJsonArray(latestCaseFile?.['task_history_snapshot']),
      reviewerContextSnapshot: parseJsonValue(latestCaseFile?.['reviewer_context_snapshot']),
      revieweeProfileContextSnapshot: parseJsonValue(
        latestCaseFile?.['reviewee_profile_context_snapshot']
      ),
      overrideReadiness: dto.override_readiness ?? false,
      overrideReason: dto.override_reason ?? null,
    })

    if (!readiness.readyForNormalResolution) {
      throw new BusinessLogicException(
        `Review dispute dossier is missing required data: ${readiness.missingRequired.join(', ')}`,
        {
          missing_required: readiness.missingRequired,
          missing_recommended: readiness.missingRecommended,
          warning_recipients: readiness.warningRecipients,
        }
      )
    }
  }
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value ?? null
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function parseJsonArray(value: unknown): unknown[] {
  const parsed = parseJsonValue(value)
  return Array.isArray(parsed) ? parsed : []
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  const parsed = parseJsonValue(value)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>
  }
  return null
}
