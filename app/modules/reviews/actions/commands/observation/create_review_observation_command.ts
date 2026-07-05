import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ReviewObservationAuthoringContextReader } from '#modules/reviews/actions/ports/outbound/observation/review_observation_authoring_context_reader'
import type {
  PersistedReviewObservationResult,
  ReviewEvidenceSufficiency,
  ReviewObservationEvidenceLinkInput,
  ReviewObservationWriter,
  ReviewRationaleClassification,
} from '#modules/reviews/actions/ports/outbound/observation/review_observation_writer'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  REVIEW_OBSERVATION_CODES,
  validateReviewObservation,
  type ReviewObservationCode,
} from '#modules/reviews/domain/observation/review_observation_rules'
import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'

export interface CreateReviewObservationDTO {
  readonly idempotencyKey: string
  readonly completionReportId: string
  readonly completionClaimId: string | null
  readonly observation: ReviewObservationV1
  readonly evidenceSufficiency: ReviewEvidenceSufficiency
  readonly rationaleClassification: ReviewRationaleClassification
  readonly evidenceRelations: readonly {
    readonly evidenceId: string
    readonly relation: ReviewObservationEvidenceLinkInput['relation']
  }[]
}

export interface CreateReviewObservationDependencies {
  readonly contexts: ReviewObservationAuthoringContextReader
  readonly writer: ReviewObservationWriter
}

export class ReviewObservationBlockedError extends BusinessLogicException {
  readonly blockerCodes: readonly ReviewObservationCode[]

  constructor(blockerCodes: readonly ReviewObservationCode[]) {
    super(blockerCodes[0] ?? 'TVA.REVIEW.OBSERVATION.BLOCKED', {
      reasonCodes: blockerCodes,
    })
    this.blockerCodes = blockerCodes
  }
}

function evidenceRelationMap(
  dto: CreateReviewObservationDTO
): Map<string, ReviewObservationEvidenceLinkInput['relation']> {
  const relationById = new Map(
    dto.evidenceRelations.map((relation) => [relation.evidenceId, relation.relation])
  )
  if (
    relationById.size !== dto.evidenceRelations.length ||
    relationById.size !== dto.observation.evidenceRefs.length ||
    dto.observation.evidenceRefs.some((id) => !relationById.has(id))
  ) {
    throw new ValidationException(
      'Review observation evidence relations must exactly match its evidence references'
    )
  }
  return relationById
}

export default class CreateReviewObservationCommand extends BaseCommand<
  CreateReviewObservationDTO,
  PersistedReviewObservationResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly dependencies: CreateReviewObservationDependencies
  ) {
    super(execCtx)
  }

  async handle(dto: CreateReviewObservationDTO): Promise<PersistedReviewObservationResult> {
    const actorId = this.execCtx.userId
    if (!actorId) throw new UnauthorizedException()
    const idempotencyKey = dto.idempotencyKey.trim()
    if (!idempotencyKey) {
      throw new ValidationException('Review observation idempotency key is required')
    }
    if (!['draft', 'final'].includes(dto.observation.governanceState)) {
      throw new ValidationException(
        'A new review observation must start as draft or final; corrections use revision governance'
      )
    }
    const relationById = evidenceRelationMap(dto)
    const authoring = await this.dependencies.contexts.load({
      reviewWorkflowId: dto.observation.reviewWorkflowId,
      reviewSessionId: dto.observation.reviewSessionId,
      taskAssignmentId: dto.observation.taskAssignmentId,
      assignmentSnapshotId: dto.observation.assignmentSnapshotId,
      completionReportId: dto.completionReportId,
      completionClaimId: dto.completionClaimId,
      reviewerId: actorId,
      reviewerType: dto.observation.reviewerType,
      subjectUserId: dto.observation.subjectUserId,
      observationType: dto.observation.observationType,
      targetRef: dto.observation.targetRef,
      sourceSnapshotHash: dto.observation.sourceSnapshotHash,
      evidenceIds: dto.observation.evidenceRefs,
    })
    if (!authoring) {
      throw new ForbiddenException('Review observation authoring context is unavailable')
    }
    if (dto.observation.sourceSnapshotHash !== authoring.assignmentSnapshotHash) {
      throw new ReviewObservationBlockedError([REVIEW_OBSERVATION_CODES.sourceSnapshotHashMismatch])
    }
    const validation = validateReviewObservation({
      actorId,
      reviewerEligible: authoring.reviewerEligible,
      reviewerConflict: authoring.reviewerConflict,
      authorizedAssessmentCeiling: authoring.authorizedAssessmentCeiling,
      evidenceSufficiency: dto.evidenceSufficiency,
      observation: dto.observation,
      completionClaim: authoring.completionClaim,
      evidenceAccess: authoring.evidence.map((item) => ({
        evidenceId: item.evidenceId,
        reviewerAccessState: item.reviewerAccessState,
      })),
    })
    if (!validation.allowed) throw new ReviewObservationBlockedError(validation.blockerCodes)

    return this.dependencies.writer.createOrLoad({
      idempotencyKey,
      auditContext: this.execCtx,
      observation: dto.observation,
      reviewerRole: authoring.reviewerRole,
      taskAssignmentHash: authoring.taskAssignmentHash,
      assignmentSnapshotHash: authoring.assignmentSnapshotHash,
      completionReportId: authoring.completionReportId,
      completionReportHash: authoring.completionReportHash,
      completionClaimId: authoring.completionClaim?.id ?? null,
      completionClaimHash: authoring.completionClaimHash,
      sourceSnapshotId: authoring.sourceSnapshotId,
      taskContractVersionId: authoring.taskContractVersionId,
      taskContractHash: authoring.taskContractHash,
      rationaleClassification: dto.rationaleClassification,
      evidenceSufficiency: dto.evidenceSufficiency,
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
      disputeId: null,
      disputeFrozenAt: null,
      evidenceLinks: authoring.evidence.map((item) => ({
        ...item,
        relation: relationById.get(
          item.evidenceId
        ) as ReviewObservationEvidenceLinkInput['relation'],
      })),
    })
  }

  execute(dto: CreateReviewObservationDTO): Promise<PersistedReviewObservationResult> {
    return this.handle(dto)
  }
}
