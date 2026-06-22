import db from '@adonisjs/lucid/services/db'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { loadReviewDisputeComments, loadReviewDisputeEvidences } from '#modules/reviews/actions/commands/review_dispute_access'
import ListAiDisputeEvaluationsQuery from '#modules/reviews/actions/queries/list_ai_dispute_evaluations_query'
import ListReviewDisputeCaseFilesQuery from '#modules/reviews/actions/queries/list_review_dispute_case_files_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface GetAdminReviewDisputeDetailDTO {
  dispute_id: string
}

export interface GetAdminReviewDisputeDetailResult {
  dispute: Record<string, unknown>
  comments: Record<string, unknown>[]
  evidences: Record<string, unknown>[]
  case_files: Record<string, unknown>[]
  ai_evaluations: Record<string, unknown>[]
  timeline: TimelineEntry[]
}

interface TimelineEntry {
  id: string
  kind: 'audit' | 'comment' | 'evidence' | 'case_file' | 'ai_evaluation'
  action: string
  occurred_at: string
  actor_id: string | null
  actor_label: string | null
  summary: string
  metadata?: Record<string, unknown>
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

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

function toIsoLike(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return new Date(0).toISOString()
}

function toText(value: unknown, fallback: string): string {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function buildTimeline(
  comments: Record<string, unknown>[],
  evidences: Record<string, unknown>[],
  caseFiles: Record<string, unknown>[],
  evaluations: Record<string, unknown>[],
  auditEvents: Record<string, unknown>[]
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...auditEvents.map((event) => ({
      id: `audit:${String(event.id)}`,
      kind: 'audit' as const,
      action: String(event.action),
      occurred_at: toIsoLike(event.occurred_at ?? event.created_at),
      actor_id: (event.user_id as string | null) ?? null,
      actor_label: (event.actor_label as string | null) ?? null,
      summary: String(event.summary ?? event.action),
      metadata: parseJsonObject(event.new_values),
    })),
    ...comments.map((comment) => ({
      id: `comment:${String(comment.id)}`,
      kind: 'comment' as const,
      action: 'create_review_dispute_comment',
      occurred_at: toIsoLike(comment.created_at),
      actor_id: (comment.author_id as string | null) ?? null,
      actor_label: (comment.author_context as string | null) ?? null,
      summary: toText(comment.body, 'Comment added'),
      metadata: {
        visibility: comment.visibility ?? null,
      },
    })),
    ...evidences.map((evidence) => ({
      id: `evidence:${String(evidence.id)}`,
      kind: 'evidence' as const,
      action: 'add_review_dispute_evidence',
      occurred_at: toIsoLike(evidence.created_at),
      actor_id: (evidence.uploaded_by as string | null) ?? null,
      actor_label: null,
      summary: toText(evidence.title, toText(evidence.evidence_type, 'evidence')),
      metadata: {
        evidence_type: evidence.evidence_type ?? null,
        url: evidence.url ?? null,
      },
    })),
    ...caseFiles.map((caseFile) => ({
      id: `case_file:${String(caseFile.id)}`,
      kind: 'case_file' as const,
      action: 'build_review_dispute_case_file',
      occurred_at: toIsoLike(caseFile.created_at),
      actor_id: (caseFile.created_by as string | null) ?? null,
      actor_label: null,
      summary: `Case file v${toText(caseFile.case_version, '?')}`,
      metadata: {
        case_version: caseFile.case_version ?? null,
        completeness_score: caseFile.completeness_score ?? null,
      },
    })),
    ...evaluations.map((evaluation) => ({
      id: `ai_evaluation:${String(evaluation.id)}`,
      kind: 'ai_evaluation' as const,
      action: 'queue_ai_dispute_evaluation',
      occurred_at: toIsoLike(evaluation.created_at),
      actor_id: null,
      actor_label: null,
      summary: `AI ${toText(evaluation.provider, 'unknown')} -> ${toText(evaluation.status, 'queued')}`,
      metadata: {
        provider: evaluation.provider ?? null,
        status: evaluation.status ?? null,
        recommendation: evaluation.recommendation ?? null,
      },
    })),
  ]

  return entries.sort((left, right) => {
    return new Date(right.occurred_at).getTime() - new Date(left.occurred_at).getTime()
  })
}

async function requireSystemAdmin(actorId: string): Promise<void> {
  const actor = (await db.from('users').where('id', actorId).select('system_role').first()) as
    | { system_role?: string }
    | undefined

  if (!actor) {
    throw new NotFoundException('User not found')
  }

  if (actor.system_role !== 'system_admin' && actor.system_role !== 'superadmin') {
    throw new ForbiddenException('Only system admin can inspect review disputes')
  }
}

export default class GetAdminReviewDisputeDetailQuery {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: GetAdminReviewDisputeDetailDTO): Promise<GetAdminReviewDisputeDetailResult> {
    const actorId = requireUserId(this.execCtx)
    await requireSystemAdmin(actorId)

    const trx = await db.transaction()

    try {
      const dispute = (await trx
        .from('review_disputes as rd')
        .leftJoin('tasks as t', 't.id', 'rd.task_id')
        .leftJoin('review_sessions as rs', 'rs.id', 'rd.review_session_id')
        .leftJoin('users as reviewee', 'reviewee.id', 'rd.reviewee_id')
        .where('rd.id', dto.dispute_id)
        .select(
          'rd.*',
          't.title as task_title',
          't.organization_id',
          't.project_id',
          'rs.status as review_session_status',
          'reviewee.username as reviewee_username',
          'reviewee.email as reviewee_email'
        )
        .first()) as Record<string, unknown> | undefined

      if (!dispute) {
        throw new NotFoundException('Review dispute not found')
      }

      const [comments, evidences] = await Promise.all([
        loadReviewDisputeComments(trx, dto.dispute_id),
        loadReviewDisputeEvidences(trx, dto.dispute_id),
      ])

      await trx.commit()

      const [caseFiles, evaluations, auditEvents] = await Promise.all([
        new ListReviewDisputeCaseFilesQuery(this.execCtx).execute({ dispute_id: dto.dispute_id }),
        new ListAiDisputeEvaluationsQuery(this.execCtx).execute({ dispute_id: dto.dispute_id }),
        db
          .from('audit_events as ae')
          .leftJoin('users as actor', 'actor.id', 'ae.user_id')
          .where('ae.entity_type', 'review_dispute')
          .where('ae.entity_id', dto.dispute_id)
          .select(
            'ae.id',
            'ae.action',
            'ae.user_id',
            'ae.new_values',
            'ae.occurred_at',
            'ae.created_at',
            db.raw(
              "COALESCE(actor.username, actor.email, CAST(ae.user_id AS text), 'system') as actor_label"
            )
          )
          .orderBy('ae.occurred_at', 'desc'),
      ])

      const normalizedCaseFiles = caseFiles as unknown as Record<string, unknown>[]
      const normalizedEvaluations = evaluations as unknown as Record<string, unknown>[]

      return {
        dispute: {
          ...dispute,
          disputed_dimensions: parseJsonObject(dispute.disputed_dimensions),
          disputed_skill_reviews: parseJsonArray(dispute.disputed_skill_reviews),
        },
        comments,
        evidences,
        case_files: normalizedCaseFiles,
        ai_evaluations: normalizedEvaluations,
        timeline: buildTimeline(
          comments,
          evidences,
          normalizedCaseFiles,
          normalizedEvaluations,
          auditEvents as Record<string, unknown>[]
        ),
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
