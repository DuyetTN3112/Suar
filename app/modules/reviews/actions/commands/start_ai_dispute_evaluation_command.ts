import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { buildAiDisputePayload } from '#modules/reviews/domain/ai_dispute_payload_builder'
import { canStartAiDisputeEvaluation } from '#modules/reviews/domain/ai_dispute_rules'

export interface StartAiDisputeEvaluationDTO {
  dispute_id: string
  provider: string
}

export interface AiDisputeEvaluationResult {
  id: string
  dispute_id: string
  case_file_id: string
  provider: string
  external_run_id: string | null
  status: string
  created_at: string
  request_payload: ReturnType<typeof buildAiDisputePayload>
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) throw new UnauthorizedException()
  return ctx.userId
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>
  return (value ?? {}) as Record<string, unknown>
}

function parseJsonArray(value: unknown): Record<string, unknown>[] {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>[]
  return (value ?? []) as Record<string, unknown>[]
}

function normalize(row: Record<string, unknown>): AiDisputeEvaluationResult {
  return {
    id: row.id as string,
    dispute_id: row.dispute_id as string,
    case_file_id: row.case_file_id as string,
    provider: row.provider as string,
    external_run_id: (row.external_run_id as string | null) ?? null,
    status: row.status as string,
    created_at: toIsoLike(row.created_at),
    request_payload:
      typeof row.request_payload === 'string'
        ? (JSON.parse(row.request_payload) as ReturnType<typeof buildAiDisputePayload>)
        : (row.request_payload as ReturnType<typeof buildAiDisputePayload>),
  }
}

function toIsoLike(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return new Date(0).toISOString()
}

export default class StartAiDisputeEvaluationCommand {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: StartAiDisputeEvaluationDTO): Promise<AiDisputeEvaluationResult> {
    const actorId = requireUserId(this.execCtx)
    const actor = (await db.from('users').where('id', actorId).select('system_role').first()) as
      | { system_role: string }
      | undefined
    if (!actor) throw new NotFoundException('User not found')

    const dispute = (await db.from('review_disputes').where('id', dto.dispute_id).first()) as
      | { status: string; dispute_reason: string }
      | undefined
    if (!dispute) throw new NotFoundException('Review dispute not found')

    const caseFile = (await db
      .from('review_dispute_case_files')
      .where('dispute_id', dto.dispute_id)
      .orderBy('case_version', 'desc')
      .first()) as
      | {
          id: string
          missing_data: string | unknown[] | null
          task_snapshot: string | Record<string, unknown> | null
          required_skills_snapshot: string | unknown[] | null
          assignment_snapshot: string | Record<string, unknown> | null
          submission_snapshot: string | Record<string, unknown> | null
          review_snapshot: string | Record<string, unknown> | null
          skill_reviews_snapshot: string | unknown[] | null
          evidences_snapshot: string | unknown[] | null
          task_comments_snapshot: string | unknown[] | null
          dispute_claim_snapshot: string | Record<string, unknown> | null
          reviewer_context_snapshot: string | Record<string, unknown> | null
          reviewee_profile_context_snapshot: string | Record<string, unknown> | null
        }
      | undefined

    if (!caseFile) {
      throw new NotFoundException('Review dispute case file not found')
    }

    const missingData = parseJsonArray(caseFile.missing_data)
    const missingCriticalData = ['task', 'assignment', 'review'].some((key) =>
      missingData.some((item) => item.key === key)
    )
    const policyResult = canStartAiDisputeEvaluation({
      actorSystemRole: actor.system_role,
      disputeStatus: dispute.status,
      hasCaseFile: true,
      missingCriticalData,
    })

    if (!policyResult.allowed) {
      if (policyResult.code === 'FORBIDDEN') throw new ForbiddenException(policyResult.reason)
      throw new BusinessLogicException(policyResult.reason)
    }

    const payload = buildAiDisputePayload({
      id: caseFile.id,
      dispute_id: dto.dispute_id,
      task_snapshot: parseJsonObject(caseFile.task_snapshot),
      required_skills_snapshot: parseJsonArray(caseFile.required_skills_snapshot),
      assignment_snapshot: parseJsonObject(caseFile.assignment_snapshot),
      submission_snapshot: parseJsonObject(caseFile.submission_snapshot),
      review_snapshot: parseJsonObject(caseFile.review_snapshot),
      skill_reviews_snapshot: parseJsonArray(caseFile.skill_reviews_snapshot),
      evidences_snapshot: parseJsonArray(caseFile.evidences_snapshot),
      task_comments_snapshot: parseJsonArray(caseFile.task_comments_snapshot),
      dispute_claim_snapshot: parseJsonObject(caseFile.dispute_claim_snapshot),
      reviewer_context_snapshot: parseJsonObject(caseFile.reviewer_context_snapshot),
      reviewee_profile_context_snapshot: parseJsonObject(caseFile.reviewee_profile_context_snapshot),
    })

    const [created] = (await db
      .table('ai_dispute_evaluations')
      .insert({
        dispute_id: dto.dispute_id,
        case_file_id: caseFile.id,
        provider: dto.provider,
        status: 'queued',
        request_payload: JSON.stringify(payload),
      })
      .returning('*')) as [Record<string, unknown>]

    if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'testing') {
      const clawagentUrl = process.env.CLAWAGENT_API_URL ?? 'http://localhost:8080/api/dispute-resolve'
      const callbackUrl = process.env.SUAR_CALLBACK_URL ?? 'http://localhost:3333/api/public/ai-disputes/callback'
      const clawagentSecret = process.env.DEVPORTAL_API_KEY_SECRET

      const reviewSnapshot = parseJsonObject(caseFile.review_snapshot)
      const claimantArg = dispute.dispute_reason
      const respondentArg = (reviewSnapshot.overall_feedback as string) || 'No specific response argument provided.'

      const triggerPayload = {
        disputeId: created.id,
        title: `Dispute for case file ${caseFile.id}`,
        claimant: {
          role: 'Reviewee',
          argument: claimantArg,
        },
        respondent: {
          role: 'Reviewer',
          argument: respondentArg,
        },
        context: payload,
        callbackUrl,
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (clawagentSecret) {
          headers['X-API-Key'] = clawagentSecret
        }

        const response = await fetch(clawagentUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(triggerPayload),
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Clawagent returned HTTP ${response.status}: ${errText}`)
        }

        // Trigger was successful, update status in DB to processing
        await db
          .from('ai_dispute_evaluations')
          .where('id', created.id as string)
          .update({ status: 'processing' })

        created.status = 'processing'
      } catch (error) {
        // If trigger failed, update DB to failed
        await db
          .from('ai_dispute_evaluations')
          .where('id', created.id as string)
          .update({
            status: 'failed',
            error_message: `Failed to trigger clawagent: ${(error as Error).message}`,
            completed_at: db.raw('NOW()'),
          })

        created.status = 'failed'
        created.error_message = `Failed to trigger clawagent: ${(error as Error).message}`
      }
    }

    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'queue_ai_dispute_evaluation',
        entity_type: 'review_dispute',
        entity_id: dto.dispute_id,
        old_values: null,
        new_values: {
          ai_evaluation_id: created.id,
          case_file_id: caseFile.id,
          provider: dto.provider,
          status: created.status,
        },
      })
    }

    return normalize(created)
  }
}
