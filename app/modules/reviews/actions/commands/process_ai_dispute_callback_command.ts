import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'

export interface ProcessAiDisputeCallbackDTO {
  evaluation_id: string
  status: 'completed' | 'failed'
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

export default class ProcessAiDisputeCallbackCommand {
  async execute(dto: ProcessAiDisputeCallbackDTO): Promise<ProcessCallbackResult> {
    const secret = process.env.AI_CALLBACK_SECRET
    if (!secret) {
      throw new UnauthorizedException('AI callback secret is not configured')
    }
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
    if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
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
          }
        | undefined

      if (!evaluation) {
        throw new NotFoundException('AI evaluation not found')
      }

      if (evaluation.status !== 'queued' && evaluation.status !== 'processing') {
        throw new BusinessLogicException('AI evaluation already completed')
      }

      // Update evaluation
      await trx
        .from('ai_dispute_evaluations')
        .where('id', dto.evaluation_id)
        .update({
          status: dto.status,
          recommendation: dto.recommendation ?? null,
          confidence_score: dto.confidence_score ?? null,
          summary: dto.summary ?? null,
          response_payload: JSON.stringify(dto.response_payload ?? {}),
          error_message: dto.error_message ?? null,
          completed_at: db.raw('NOW()'),
        })

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
