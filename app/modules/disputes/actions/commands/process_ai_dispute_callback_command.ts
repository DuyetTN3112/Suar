import {
  hasIdentifier,
  normalizeResponsePayload,
  numberField,
  stringField,
  verdictRecordFromPayload,
} from './ai_dispute_callback_payload_normalizer.js'
import {
  validateCallbackPayload,
  validateProfileAssessmentProposal,
} from './ai_dispute_callback_validation.js'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { AiDisputeUnitOfWork } from '#modules/disputes/actions/ports/outbound/ai_dispute_unit_of_work'
import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'


export { validateProfileAssessmentProposal }

export interface ProcessAiDisputeCallbackDTO {
  evaluation_id: string
  review_dispute_id?: string
  case_file_id?: string
  source_id?: string
  status: string
  recommendation?: string
  confidence_score?: number
  summary?: string
  response_payload?: Record<string, unknown>
  error_message?: string
  timestamp: number
  signature: string
}

export interface ProcessCallbackResult {
  id: string
  dispute_id: string
  status: string
}

export default class ProcessAiDisputeCallbackCommand extends BaseCommand<
  ProcessAiDisputeCallbackDTO,
  ProcessCallbackResult
> {
  constructor(
    private readonly cryptography: ReviewCryptography,
    private readonly disputes: AiDisputeUnitOfWork
  ) {
    super(makeSystemReviewActionContext('system'))
  }

  async execute(dto: ProcessAiDisputeCallbackDTO): Promise<ProcessCallbackResult> {
    return this.handle(dto)
  }

  async handle(dto: ProcessAiDisputeCallbackDTO): Promise<ProcessCallbackResult> {
    const secret = process.env['AI_CALLBACK_SECRET']
    if (!secret) {
      throw new UnauthorizedException('AI callback secret is not configured')
    }
    validateCallbackPayload(dto)

    // Verify timestamp
    const nowSec = Math.floor(Date.now() / 1000)
    if (Math.abs(nowSec - dto.timestamp) > 300) {
      throw new UnauthorizedException('Callback timestamp expired or invalid')
    }

    // Verify signature
    if (
      !this.cryptography.verifyHmac(
        secret,
        `${dto.timestamp}:${dto.evaluation_id}:${dto.status}`,
        dto.signature
      )
    ) {
      throw new UnauthorizedException('Callback signature mismatch')
    }

    return this.disputes.run(async (session) => {
      const evaluation = await session.loadEvaluation(dto.evaluation_id)
      if (!evaluation) {
        throw new NotFoundException('AI evaluation not found')
      }

      if (
        (hasIdentifier(dto.review_dispute_id) &&
          dto.review_dispute_id.trim() !== evaluation.disputeId) ||
        (hasIdentifier(dto.case_file_id) &&
          evaluation.caseFileId !== null &&
          dto.case_file_id.trim() !== evaluation.caseFileId) ||
        (hasIdentifier(dto.source_id) &&
          dto.source_id.trim() !== (evaluation.sourceId ?? evaluation.disputeId))
      ) {
        throw new UnauthorizedException('Callback identifier mismatch')
      }

      if (evaluation.status !== 'queued' && evaluation.status !== 'processing') {
        if (evaluation.status === dto.status) {
          return {
            id: evaluation.id,
            dispute_id: evaluation.disputeId,
            status: evaluation.status,
          }
        }

        throw new ConflictException('AI evaluation is already terminal with a different status', {
          currentStatus: evaluation.status,
          callbackStatus: dto.status,
        })
      }

      const responsePayload = normalizeResponsePayload(dto.response_payload)
      const verdict = verdictRecordFromPayload(responsePayload)
      if (dto.status === 'completed') {
        validateProfileAssessmentProposal(verdict, {
          required: evaluation.requiresProfileAssessment,
          taskDifficultyRequired: evaluation.requiresTaskDifficultyAssessment,
        })
      }
      const recommendation =
        dto.recommendation ??
        stringField(verdict['recommendation']) ??
        stringField(verdict['final_decision']) ??
        stringField(verdict['decision_label'])
      const confidenceScore =
        dto.confidence_score ??
        numberField(verdict['confidence']) ??
        numberField(verdict['confidence_score']) ??
        numberField(verdict['confidenceScore'])
      const summary =
        dto.summary ??
        stringField(verdict['verdict']) ??
        stringField(verdict['summary']) ??
        stringField(verdict['rationale'])

      await session.updateEvaluation(dto.evaluation_id, {
        status: dto.status,
        recommendation: recommendation ?? null,
        confidenceScore: confidenceScore ?? null,
        summary: summary ?? null,
        responsePayload,
        errorMessage: dto.error_message ?? null,
      })

      const sourceType = evaluation.sourceType ?? 'review_dispute'
      const sourceId = evaluation.sourceId ?? evaluation.disputeId
      const sourceStatus = await session.loadSourceStatus(sourceType, sourceId)
      if (sourceStatus === 'ai_reviewing') {
        const nextStatus =
          dto.status === 'completed'
            ? 'admin_reviewing'
            : sourceType === 'task_review_workflow'
              ? 'ai_failed'
              : sourceType === 'review_dispute'
                ? 'admin_reviewing'
                : 'reported'
        await session.transitionSourceStatus(
          sourceType,
          sourceId,
          'ai_reviewing',
          nextStatus
        )
      }

      return {
        id: evaluation.id,
        dispute_id: evaluation.disputeId,
        status: dto.status,
      }
    })
  }
}
