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
import type { ReviewDisputeResult } from '#modules/reviews/actions/commands/disputes/create_review_dispute_command'
import type {
  ReviewDisputeResolutionDecision,
  ReviewDisputeResolutionPersistenceSession,
  ReviewDisputeResolutionSourceType,
  ReviewDisputeResolutionUnitOfWork,
  SprintReviewDisputeResolutionSnapshot,
  SprintReverseReviewResolutionSnapshot,
  TaskReviewResolutionSnapshot,
} from '#modules/reviews/actions/ports/outbound/review_dispute_resolution_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { evaluateReviewDisputeReadiness } from '#modules/reviews/domain/disputes/review_dispute_readiness'
import { canResolveReviewDispute } from '#modules/reviews/domain/disputes/review_dispute_rules'
import { buildReviewDisputeEvent } from '#modules/reviews/observability/review_event_factory'
import {
  VALID_PROFILE_UPDATE_ACTIONS,
  VALID_REVIEWER_CREDIBILITY_ACTIONS,
} from '#modules/reviews/public_contracts/review_constants'

export type ResolveDisputeSourceType = ReviewDisputeResolutionSourceType

export interface ResolveReviewDisputeDTO {
  dispute_id: string
  source_type?: ResolveDisputeSourceType
  final_decision: ReviewDisputeResolutionDecision
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

export default class ResolveReviewDisputeCommand extends BaseCommand<
  ResolveReviewDisputeDTO,
  ReviewDisputeResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly resolutions: ReviewDisputeResolutionUnitOfWork
  ) {
    super(execCtx)
  }

  async execute(dto: ResolveReviewDisputeDTO): Promise<ReviewDisputeResult> {
    return this.handle(dto)
  }

  async handle(dto: ResolveReviewDisputeDTO): Promise<ReviewDisputeResult> {
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

    try {
      const outcome = await this.resolutions.run(async (persistence) => {
        const role = await persistence.findActorSystemRole(actorId)
        if (role === undefined) {
          throw new NotFoundException('User not found')
        }
        const actorSystemRole = role ?? ''

        if (dto.source_type === 'sprint_review_dispute') {
          return {
            result: await this.resolveSprintReviewDispute(
              persistence,
              dto,
              actorId,
              actorSystemRole
            ),
            sourceType: 'sprint_review_dispute',
          }
        }
        if (dto.source_type === 'sprint_reverse_review_workflow') {
          return {
            result: await this.resolveSprintReverseReviewWorkflow(
              persistence,
              dto,
              actorId,
              actorSystemRole
            ),
            sourceType: 'sprint_reverse_review_workflow',
          }
        }
        if (dto.source_type === 'task_review_workflow') {
          return {
            result: await this.resolveTaskReviewWorkflow(
              persistence,
              dto,
              actorId,
              actorSystemRole
            ),
            sourceType: 'task_review_workflow',
          }
        }

        const classic = await persistence.loadClassicDisputeForUpdate(dto.dispute_id)
        if (classic) {
          return {
            result: await this.resolveClassicReviewDispute(
              persistence,
              dto,
              actorId,
              actorSystemRole,
              classic.status,
              classic.reviewSessionId
            ),
            sourceType: 'review_dispute',
          }
        }

        const sprint = await this.resolveSprintReviewDisputeIfPresent(
          persistence,
          dto,
          actorId,
          actorSystemRole
        )
        if (sprint) {
          return { result: sprint, sourceType: 'sprint_review_dispute' }
        }
        const reverse = await this.resolveSprintReverseReviewWorkflowIfPresent(
          persistence,
          dto,
          actorId,
          actorSystemRole
        )
        if (reverse) {
          return { result: reverse, sourceType: 'sprint_reverse_review_workflow' }
        }
        const task = await this.resolveTaskReviewWorkflowIfPresent(
          persistence,
          dto,
          actorId,
          actorSystemRole
        )
        if (task) {
          return { result: task, sourceType: 'task_review_workflow' }
        }
        throw new NotFoundException('Review dispute not found')
      })

      if (outcome.sourceType === 'review_dispute') {
        await this.writeClassicResolutionCheckpoint(dto, startedAt, outcome.result)
      } else {
        await this.writeAlternativeResolutionCheckpoint(dto, startedAt, outcome.result)
      }
      return outcome.result
    } catch (error) {
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

  private async resolveClassicReviewDispute(
    persistence: ReviewDisputeResolutionPersistenceSession,
    dto: ResolveReviewDisputeDTO,
    actorId: string,
    actorSystemRole: string,
    disputeStatus: string,
    reviewSessionId: string
  ): Promise<ReviewDisputeResult> {
    this.assertCanResolve(actorSystemRole, disputeStatus, dto)
    this.validateTypedActions(dto)
    await this.enforceDossierReadiness(persistence, dto)

    const resolved = await persistence.resolveClassicDispute({
      disputeId: dto.dispute_id,
      actorId,
      finalDecision: dto.final_decision,
      finalRationale: dto.final_rationale,
      ...(dto.profile_update_action !== undefined
        ? { profileUpdateAction: dto.profile_update_action }
        : {}),
      ...(dto.reviewer_credibility_action !== undefined
        ? { reviewerCredibilityAction: dto.reviewer_credibility_action }
        : {}),
    })
    const result = resolved as unknown as ReviewDisputeResult
    const reviewerIds = await persistence.listReviewerIds(reviewSessionId)
    await persistence.stageResolvedEvent({
      disputeId: result.id,
      reviewSessionId: result.review_session_id,
      revieweeId: result.reviewee_id,
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
    await this.writeResolutionAudit(persistence, 'review_dispute', dto, actorId)
    return result
  }

  private async resolveSprintReviewDisputeIfPresent(
    persistence: ReviewDisputeResolutionPersistenceSession,
    dto: ResolveReviewDisputeDTO,
    actorId: string,
    actorSystemRole: string
  ): Promise<ReviewDisputeResult | null> {
    const dispute = await persistence.loadSprintDisputeForUpdate(dto.dispute_id)
    if (!dispute) return null
    return this.resolveSprintReviewDispute(persistence, dto, actorId, actorSystemRole, dispute)
  }

  private async resolveSprintReverseReviewWorkflowIfPresent(
    persistence: ReviewDisputeResolutionPersistenceSession,
    dto: ResolveReviewDisputeDTO,
    actorId: string,
    actorSystemRole: string
  ): Promise<ReviewDisputeResult | null> {
    const workflow = await persistence.loadSprintReverseWorkflowForUpdate(dto.dispute_id)
    if (!workflow) return null
    return this.resolveSprintReverseReviewWorkflow(
      persistence,
      dto,
      actorId,
      actorSystemRole,
      workflow
    )
  }

  private async resolveTaskReviewWorkflowIfPresent(
    persistence: ReviewDisputeResolutionPersistenceSession,
    dto: ResolveReviewDisputeDTO,
    actorId: string,
    actorSystemRole: string
  ): Promise<ReviewDisputeResult | null> {
    const workflow = await persistence.loadTaskWorkflowForUpdate(dto.dispute_id)
    if (!workflow) return null
    return this.resolveTaskReviewWorkflow(persistence, dto, actorId, actorSystemRole, workflow)
  }

  private async resolveSprintReviewDispute(
    persistence: ReviewDisputeResolutionPersistenceSession,
    dto: ResolveReviewDisputeDTO,
    actorId: string,
    actorSystemRole: string,
    loaded?: SprintReviewDisputeResolutionSnapshot
  ): Promise<ReviewDisputeResult> {
    const dispute = loaded ?? (await persistence.loadSprintDisputeForUpdate(dto.dispute_id))
    if (!dispute) throw new NotFoundException('Review dispute not found')
    this.assertCanResolve(actorSystemRole, dispute.status, dto)
    this.validateTypedActions(dto)

    const resolved = await persistence.resolveSprintDispute({
      disputeId: dto.dispute_id,
      actorId,
      finalDecision: dto.final_decision,
      finalRationale: dto.final_rationale,
    })
    const result = {
      ...resolved,
      source_type: 'sprint_review_dispute',
      review_session_id: null,
      reviewee_id: resolved['opened_by'] ?? null,
    } as unknown as ReviewDisputeResult
    await this.writeResolutionAudit(persistence, 'sprint_review_dispute', dto, actorId)
    return result
  }

  private async resolveSprintReverseReviewWorkflow(
    persistence: ReviewDisputeResolutionPersistenceSession,
    dto: ResolveReviewDisputeDTO,
    actorId: string,
    actorSystemRole: string,
    loaded?: SprintReverseReviewResolutionSnapshot
  ): Promise<ReviewDisputeResult> {
    const workflow =
      loaded ?? (await persistence.loadSprintReverseWorkflowForUpdate(dto.dispute_id))
    if (!workflow) throw new NotFoundException('Review dispute not found')
    this.assertCanResolveSprintReverseWorkflow(actorSystemRole, workflow.status, dto)

    const resolved = await persistence.resolveSprintReverseWorkflow({
      disputeId: dto.dispute_id,
      actorId,
      finalDecision: dto.final_decision,
      finalRationale: dto.final_rationale,
    })
    const result = {
      ...resolved,
      source_type: 'sprint_reverse_review_workflow',
      dispute_review_type:
        workflow.targetType === 'environment' ? 'environment_review' : 'manager_review',
      review_session_id: null,
      reviewee_id: workflow.reviewerId,
    } as unknown as ReviewDisputeResult
    await this.writeResolutionAudit(persistence, 'sprint_reverse_review_workflow', dto, actorId)
    return result
  }

  private async resolveTaskReviewWorkflow(
    persistence: ReviewDisputeResolutionPersistenceSession,
    dto: ResolveReviewDisputeDTO,
    actorId: string,
    actorSystemRole: string,
    loaded?: TaskReviewResolutionSnapshot
  ): Promise<ReviewDisputeResult> {
    const workflow = loaded ?? (await persistence.loadTaskWorkflowForUpdate(dto.dispute_id))
    if (!workflow) throw new NotFoundException('Review dispute not found')
    this.assertCanResolveTaskReviewWorkflow(actorSystemRole, workflow.status, dto)

    const resolved = await persistence.resolveTaskWorkflow({
      disputeId: dto.dispute_id,
      actorId,
      finalDecision: dto.final_decision,
      finalRationale: dto.final_rationale,
    })
    const result = {
      ...resolved,
      source_type: 'task_review_workflow',
      dispute_review_type: 'task_review',
      review_session_id: null,
      reviewee_id: workflow.revieweeId,
    } as unknown as ReviewDisputeResult
    await this.writeResolutionAudit(persistence, 'task_review_workflow', dto, actorId)
    await persistence.stageTaskWorkflowResolutionNotification({
      workflowId: workflow.id,
      taskId: workflow.taskId,
      organizationId: workflow.organizationId,
      actorId,
      recipientIds: [
        ...(workflow.revieweeId ? [workflow.revieweeId] : []),
        ...(await persistence.listTaskWorkflowReviewerIds(workflow.id)),
      ],
      finalDecision: dto.final_decision,
      occurredAt: new Date(),
      ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
    })
    return result
  }

  private assertCanResolve(
    actorSystemRole: string,
    disputeStatus: string,
    dto: ResolveReviewDisputeDTO
  ): void {
    const policyResult = canResolveReviewDispute({
      actorSystemRole,
      disputeStatus,
      finalDecision: dto.final_decision,
      finalRationale: dto.final_rationale,
    })
    if (!policyResult.allowed) {
      if (policyResult.code === 'FORBIDDEN') {
        throw new ForbiddenException(policyResult.reason)
      }
      throw new BusinessLogicException(policyResult.reason)
    }
  }

  private assertCanResolveSprintReverseWorkflow(
    actorSystemRole: string,
    workflowStatus: string,
    dto: ResolveReviewDisputeDTO
  ): void {
    this.assertCanResolveWorkflow(actorSystemRole, workflowStatus, dto)
  }

  private assertCanResolveTaskReviewWorkflow(
    actorSystemRole: string,
    workflowStatus: string,
    dto: ResolveReviewDisputeDTO
  ): void {
    this.assertCanResolveWorkflow(actorSystemRole, workflowStatus, dto)
  }

  private assertCanResolveWorkflow(
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
    if (
      workflowStatus !== 'reported' &&
      workflowStatus !== 'ai_reviewing' &&
      workflowStatus !== 'admin_reviewing'
    ) {
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
    persistence: ReviewDisputeResolutionPersistenceSession,
    entityType: ReviewDisputeResolutionSourceType,
    dto: ResolveReviewDisputeDTO,
    actorId: string
  ): Promise<void> {
    await persistence.writeAudit(this.execCtx, {
      entityType,
      entityId: dto.dispute_id,
      actorId,
      finalDecision: dto.final_decision,
      profileUpdateAction: dto.profile_update_action ?? null,
      reviewerCredibilityAction: dto.reviewer_credibility_action ?? null,
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

  private async writeClassicResolutionCheckpoint(
    dto: ResolveReviewDisputeDTO,
    startedAt: number,
    result: ReviewDisputeResult
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
        disputeId: result.id,
        reviewSessionId: result.review_session_id,
        revieweeId: result.reviewee_id,
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
  }

  private async writeAlternativeResolutionCheckpoint(
    dto: ResolveReviewDisputeDTO,
    startedAt: number,
    result: ReviewDisputeResult
  ): Promise<void> {
    const resolved = result as unknown as Record<string, unknown>
    await this.writeResolutionCheckpoint(dto, startedAt, {
      source_type: resolved['source_type'],
      dispute_review_type: resolved['dispute_review_type'] ?? null,
    })
  }

  private async enforceDossierReadiness(
    persistence: ReviewDisputeResolutionPersistenceSession,
    dto: ResolveReviewDisputeDTO
  ): Promise<void> {
    const latestCaseFile = await persistence.loadLatestDossier(dto.dispute_id)
    const readiness = evaluateReviewDisputeReadiness({
      taskSnapshot: parseJsonValue(latestCaseFile?.taskSnapshot),
      assignmentSnapshot: parseJsonValue(latestCaseFile?.assignmentSnapshot),
      submissionSnapshot: parseJsonValue(latestCaseFile?.submissionSnapshot),
      reviewSnapshot: parseJsonValue(latestCaseFile?.reviewSnapshot),
      skillReviewsSnapshot: parseJsonArray(latestCaseFile?.skillReviewsSnapshot),
      disputeClaimSnapshot: parseJsonObject(latestCaseFile?.disputeClaimSnapshot),
      taskCommentsSnapshot: parseJsonArray(latestCaseFile?.taskCommentsSnapshot),
      evidencesSnapshot: parseJsonArray(latestCaseFile?.evidencesSnapshot),
      selfAssessmentSnapshot: parseJsonValue(latestCaseFile?.selfAssessmentSnapshot),
      taskHistorySnapshot: parseJsonArray(latestCaseFile?.taskHistorySnapshot),
      reviewerContextSnapshot: parseJsonValue(latestCaseFile?.reviewerContextSnapshot),
      revieweeProfileContextSnapshot: parseJsonValue(
        latestCaseFile?.revieweeProfileContextSnapshot
      ),
      overrideReadiness: dto.override_readiness ?? false,
      overrideReason: dto.override_reason ?? null,
    })
    this.assertDossierReady(readiness)
  }

  private assertDossierReady(readiness: ReturnType<typeof evaluateReviewDisputeReadiness>): void {
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
