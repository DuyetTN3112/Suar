import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { AiDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/ai_dispute_unit_of_work'
import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'

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

type ValidProcessAiDisputeCallbackDTO = ProcessAiDisputeCallbackDTO & {
  status: 'completed' | 'failed'
}

type JsonRecord = Record<string, unknown>

export interface ProcessCallbackResult {
  id: string
  dispute_id: string
  status: string
}

function validateCallbackPayload(
  dto: ProcessAiDisputeCallbackDTO
): asserts dto is ValidProcessAiDisputeCallbackDTO {
  const errors: Record<string, string> = {}

  if (!dto.evaluation_id) {
    errors['evaluation_id'] = 'evaluation_id is required'
  }

  if (dto.status !== 'completed' && dto.status !== 'failed') {
    errors['status'] = 'status must be completed or failed'
  }

  if (!Number.isFinite(dto.timestamp)) {
    errors['timestamp'] = 'timestamp is required'
  }

  if (!dto.signature) {
    errors['signature'] = 'signature is required'
  }

  if (Object.keys(errors).length > 0) {
    throw ValidationException.fields(errors)
  }
}

function hasIdentifier(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeActionItemAliases(record: JsonRecord): JsonRecord {
  const normalized = { ...record }
  if (normalized['action_items'] === undefined && normalized['actionItems'] !== undefined) {
    normalized['action_items'] = normalized['actionItems']
  }
  if (normalized['actionItems'] === undefined && normalized['action_items'] !== undefined) {
    normalized['actionItems'] = normalized['action_items']
  }
  return normalized
}

function normalizeResponsePayload(value: JsonRecord | undefined): JsonRecord {
  if (!value) return {}
  const normalized = normalizeActionItemAliases(value)
  for (const key of ['verdict', 'result', 'ai_target']) {
    if (isRecord(normalized[key])) {
      normalized[key] = normalizeActionItemAliases(normalized[key])
    }
  }
  return normalized
}

function verdictRecordFromPayload(payload: JsonRecord): JsonRecord {
  if (isRecord(payload['verdict'])) return payload['verdict']
  if (isRecord(payload['result'])) return payload['result']
  if (isRecord(payload['ai_target'])) return payload['ai_target']
  return payload
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function numberField(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export default class ProcessAiDisputeCallbackCommand {
  constructor(
    private readonly cryptography: ReviewCryptography,
    private readonly disputes: AiDisputeUnitOfWork
  ) {}

  async execute(dto: ProcessAiDisputeCallbackDTO): Promise<ProcessCallbackResult> {
    const secret = process.env['AI_CALLBACK_SECRET']
    if (!secret) {
      throw new UnauthorizedException('AI callback secret is not configured')
    }
    validateCallbackPayload(dto)
    // Verify callback timestamp & signature

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
          sourceType === 'sprint_reverse_review_workflow' || sourceType === 'task_review_workflow'
            ? 'reported'
            : 'admin_reviewing'
        await session.transitionSourceStatus(sourceType, sourceId, 'ai_reviewing', nextStatus)
      }

      return {
        id: evaluation.id,
        dispute_id: evaluation.disputeId,
        status: dto.status,
      }
    })
  }
}
