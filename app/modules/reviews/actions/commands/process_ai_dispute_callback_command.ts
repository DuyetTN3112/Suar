import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import ValidationException from '#modules/http/exceptions/validation_exception'

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
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${dto.timestamp}:${dto.evaluation_id}:${dto.status}`)
      .digest('hex')

    // Constant-time comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
    const actualBuffer = Buffer.from(dto.signature, 'utf8')
    if (
      expectedBuffer.length !== actualBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new UnauthorizedException('Callback signature mismatch')
    }

    const trx = await db.transaction()

    try {
      const evaluation = (await trx
        .from('ai_dispute_evaluations')
        .where('id', dto.evaluation_id)
        .forUpdate()
        .first()) as
        | {
            id: string
            status: string
            dispute_id: string
            case_file_id: string | null
            source_type: string | null
            source_id: string | null
          }
        | undefined

      if (!evaluation) {
        throw new NotFoundException('AI evaluation not found')
      }

      if (
        (hasIdentifier(dto.review_dispute_id) &&
          dto.review_dispute_id.trim() !== evaluation.dispute_id) ||
        (hasIdentifier(dto.case_file_id) &&
          evaluation.case_file_id !== null &&
          dto.case_file_id.trim() !== evaluation.case_file_id) ||
        (hasIdentifier(dto.source_id) &&
          dto.source_id.trim() !== (evaluation.source_id ?? evaluation.dispute_id))
      ) {
        throw new UnauthorizedException('Callback identifier mismatch')
      }

      if (evaluation.status !== 'queued' && evaluation.status !== 'processing') {
        throw new BusinessLogicException('AI evaluation already completed')
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

      // Update evaluation
      await trx
        .from('ai_dispute_evaluations')
        .where('id', dto.evaluation_id)
        .update({
          status: dto.status,
          recommendation: recommendation ?? null,
          confidence_score: confidenceScore ?? null,
          summary: summary ?? null,
          response_payload: JSON.stringify(responsePayload),
          error_message: dto.error_message ?? null,
          completed_at: db.raw('NOW()'),
        })

      const sourceType = evaluation.source_type ?? 'review_dispute'
      const sourceId = evaluation.source_id ?? evaluation.dispute_id
      if (sourceType === 'sprint_review_dispute') {
        const dispute = (await trx.from('sprint_review_disputes').where('id', sourceId).first()) as
          | { id: string; status: string }
          | undefined

        if (dispute?.status === 'ai_reviewing') {
          await trx
            .from('sprint_review_disputes')
            .where('id', dispute.id)
            .update({
              status: 'admin_reviewing',
              updated_at: db.raw('NOW()'),
            })
        }
      } else if (sourceType === 'sprint_reverse_review_workflow') {
        const workflow = (await trx
          .from('sprint_reverse_review_workflows')
          .where('id', sourceId)
          .first()) as { id: string; status: string } | undefined

        if (workflow?.status === 'ai_reviewing') {
          await trx
            .from('sprint_reverse_review_workflows')
            .where('id', workflow.id)
            .update({
              status: 'reported',
              updated_at: db.raw('NOW()'),
            })
        }
      } else if (sourceType === 'task_review_workflow') {
        const workflow = (await trx
          .from('task_review_workflows')
          .where('id', sourceId)
          .first()) as { id: string; status: string } | undefined

        if (workflow?.status === 'ai_reviewing') {
          await trx
            .from('task_review_workflows')
            .where('id', workflow.id)
            .update({
              status: 'reported',
              updated_at: db.raw('NOW()'),
            })
        }
      } else {
        // Also optionally transition dispute status if needed
        const dispute = (await trx
          .from('review_disputes')
          .where('id', evaluation.dispute_id)
          .first()) as { id: string; status: string } | undefined

        if (dispute?.status === 'ai_reviewing') {
          await trx
            .from('review_disputes')
            .where('id', dispute.id)
            .update({
              status: 'admin_reviewing',
              updated_at: db.raw('NOW()'),
            })
        }
      }

      await trx.commit()
      return {
        id: evaluation.id,
        dispute_id: evaluation.dispute_id,
        status: dto.status,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
