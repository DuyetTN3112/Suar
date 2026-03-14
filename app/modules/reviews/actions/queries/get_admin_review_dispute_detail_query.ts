import db from '@adonisjs/lucid/services/db'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  loadReviewDisputeComments,
  loadReviewDisputeEvidences,
} from '#modules/reviews/actions/commands/review_dispute_access'
import ListAiDisputeEvaluationsQuery from '#modules/reviews/actions/queries/list_ai_dispute_evaluations_query'
import ListReviewDisputeCaseFilesQuery from '#modules/reviews/actions/queries/list_review_dispute_case_files_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface GetAdminReviewDisputeDetailDTO {
  disputeId: string
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
      id: `audit:${String(event['id'])}`,
      kind: 'audit' as const,
      action: String(event['action']),
      occurred_at: toIsoLike(event['occurred_at'] ?? event['created_at']),
      actor_id: (event['user_id'] as string | null) ?? null,
      actor_label: (event['actor_label'] as string | null) ?? null,
      summary: String(event['summary'] ?? event['action']),
      metadata: parseJsonObject(event['new_values']),
    })),
    ...comments.map((comment) => ({
      id: `comment:${String(comment['id'])}`,
      kind: 'comment' as const,
      action: 'create_review_dispute_comment',
      occurred_at: toIsoLike(comment['created_at']),
      actor_id: (comment['author_id'] as string | null) ?? null,
      actor_label: (comment['author_context'] as string | null) ?? null,
      summary: toText(comment['body'], 'Comment added'),
      metadata: {
        visibility: comment['visibility'] ?? null,
      },
    })),
    ...evidences.map((evidence) => ({
      id: `evidence:${String(evidence['id'])}`,
      kind: 'evidence' as const,
      action: 'add_review_dispute_evidence',
      occurred_at: toIsoLike(evidence['created_at']),
      actor_id: (evidence['uploaded_by'] as string | null) ?? null,
      actor_label: null,
      summary: toText(evidence['title'], toText(evidence['evidence_type'], 'evidence')),
      metadata: {
        evidence_type: evidence['evidence_type'] ?? null,
        url: evidence['url'] ?? null,
      },
    })),
    ...caseFiles.map((caseFile) => ({
      id: `case_file:${String(caseFile['id'])}`,
      kind: 'case_file' as const,
      action: 'build_review_dispute_case_file',
      occurred_at: toIsoLike(caseFile['created_at']),
      actor_id: (caseFile['created_by'] as string | null) ?? null,
      actor_label: null,
      summary: `Case file v${toText(caseFile['case_version'], '?')}`,
      metadata: {
        case_version: caseFile['case_version'] ?? null,
        completeness_score: caseFile['completeness_score'] ?? null,
      },
    })),
    ...evaluations.map((evaluation) => ({
      id: `ai_evaluation:${String(evaluation['id'])}`,
      kind: 'ai_evaluation' as const,
      action: 'queue_ai_dispute_evaluation',
      occurred_at: toIsoLike(evaluation['created_at']),
      actor_id: null,
      actor_label: null,
      summary: `AI ${toText(evaluation['provider'], 'unknown')} -> ${toText(evaluation['status'], 'queued')}`,
      metadata: {
        provider: evaluation['provider'] ?? null,
        status: evaluation['status'] ?? null,
        recommendation: evaluation['recommendation'] ?? null,
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
        .where('rd.id', dto.disputeId)
        .select(
          'rd.*',
          't.title as task_title',
          't.description as task_description',
          't.organization_id',
          't.project_id',
          'rs.status as review_session_status',
          'rs.overall_quality_score as review_overall_score',
          'rs.strengths_observed as review_strengths',
          'rs.areas_for_improvement as review_improvements',
          'reviewee.username as reviewee_username',
          'reviewee.email as reviewee_email'
        )
        .first()) as Record<string, unknown> | undefined

      if (!dispute) {
        const sprintDispute = (await trx
          .from('sprint_review_disputes as srd')
          .joinRaw('inner join sprint_review_packages as srp on srp.id::text = srd.package_id')
          .joinRaw('inner join project_sprints as ps on ps.id::text = srp.sprint_id')
          .joinRaw('left join projects as p on p.id::text = ps.project_id')
          .joinRaw('left join organizations as org on org.id::text = ps.organization_id')
          .joinRaw('left join users as reviewer on reviewer.id::text = srp.reviewer_id')
          .where('srd.id', dto.disputeId)
          .select(
            'srd.*',
            'srd.dispute_review_type',
            'srd.runtime_context',
            'ps.organization_id',
            'ps.project_id',
            'ps.id as sprint_id',
            'ps.name as sprint_name',
            'p.name as project_name',
            'org.name as organization_name',
            'srp.reviewer_id as reviewee_id',
            'reviewer.username as reviewee_username',
            'reviewer.email as reviewee_email'
          )
          .first()) as Record<string, unknown> | undefined

        if (!sprintDispute) {
          const reverseWorkflow = (await trx
            .from('sprint_reverse_review_workflows as srw')
            .joinRaw('inner join project_sprints as ps on ps.id::text = srw.sprint_id::text')
            .joinRaw('left join projects as p on p.id::text = srw.project_id::text')
            .joinRaw('left join organizations as org on org.id::text = srw.organization_id::text')
            .joinRaw('left join users as reviewer on reviewer.id::text = srw.reviewer_id::text')
            .where('srw.id', dto.disputeId)
            .whereIn('srw.status', ['reported', 'ai_reviewing', 'resolved'])
            .select(
              'srw.*',
              db.raw(
                "CASE WHEN srw.target_type = 'environment' THEN 'environment_review' ELSE 'manager_review' END as dispute_review_type"
              ),
              'ps.name as sprint_name',
              'p.name as project_name',
              'org.name as organization_name',
              'srw.reviewer_id as reviewee_id',
              'reviewer.username as reviewee_username',
              'reviewer.email as reviewee_email'
            )
            .first()) as Record<string, unknown> | undefined

          if (!reverseWorkflow) {
            const taskWorkflow = (await trx
              .from('task_review_workflows as trw')
              .leftJoin('tasks as t', 't.id', 'trw.task_id')
              .joinRaw('left join project_sprints as ps on ps.id::text = t.project_sprint_id::text')
              .joinRaw('left join projects as p on p.id::text = trw.project_id::text')
              .joinRaw('left join organizations as org on org.id::text = trw.organization_id::text')
              .leftJoin('users as reviewee', 'reviewee.id', 'trw.reviewee_id')
              .where('trw.id', dto.disputeId)
              .whereIn('trw.status', ['reported', 'ai_reviewing', 'resolved'])
              .select(
                'trw.*',
                db.raw("'task_review' as dispute_review_type"),
                't.title as task_title',
                't.description as task_description',
                't.project_sprint_id as sprint_id',
                'ps.name as sprint_name',
                'p.name as project_name',
                'org.name as organization_name',
                'reviewee.username as reviewee_username',
                'reviewee.email as reviewee_email'
              )
              .first()) as Record<string, unknown> | undefined

            if (!taskWorkflow) {
              throw new NotFoundException('Review dispute not found')
            }

            const messages = (await trx
              .from('task_review_messages')
              .where('workflow_id', dto.disputeId)
              .orderBy('created_at', 'asc')
              .select(
                'id',
                'workflow_id as dispute_id',
                'author_id',
                'body',
                'message_type as visibility',
                'metadata',
                'created_at',
                db.raw('NULL as author_context')
              )) as Record<string, unknown>[]
            const reportMessage = [...messages]
              .reverse()
              .find((message) => message['visibility'] === 'system')
            const reportMetadata = parseJsonObject(reportMessage?.['metadata'])
            const messageRuntimeContext = parseJsonObject(reportMetadata['runtime_context'])
            const workflowRuntimeContext = parseJsonObject(taskWorkflow['runtime_context'])
            const runtimeContext =
              Object.keys(workflowRuntimeContext).length > 0
                ? workflowRuntimeContext
                : messageRuntimeContext

            await trx.commit()

            const aiEvaluations = (await new ListAiDisputeEvaluationsQuery(this.execCtx).execute({
              dispute_id: dto.disputeId,
              source_type: 'task_review_workflow',
            })) as unknown as Record<string, unknown>[]

            return {
              dispute: {
                ...taskWorkflow,
                source_type: 'task_review_workflow',
                dispute_review_type: 'task_review',
                dispute_reason: reportMessage?.['body'] ?? 'Task review workflow reported',
                requested_outcome: 'request_admin_review',
                runtime_context: runtimeContext,
              },
              comments: messages,
              evidences: [],
              case_files: [],
              ai_evaluations: aiEvaluations,
              timeline: buildTimeline(messages, [], [], aiEvaluations, []),
            }
          }

          const messages = (await trx
            .from('sprint_reverse_review_messages')
            .where('workflow_id', dto.disputeId)
            .orderBy('created_at', 'asc')
            .select(
              'id',
              'workflow_id as dispute_id',
              'author_id',
              'body',
              'message_type as visibility',
              'metadata',
              'created_at',
              db.raw('NULL as author_context')
            )) as Record<string, unknown>[]
          const reportMessage = [...messages]
            .reverse()
            .find((message) => message['visibility'] === 'report')
          const reportMetadata = parseJsonObject(reportMessage?.['metadata'])
          const runtimeContext = parseJsonObject(reportMetadata['runtime_context'])

          await trx.commit()

          const aiEvaluations = (await new ListAiDisputeEvaluationsQuery(this.execCtx).execute({
            dispute_id: dto.disputeId,
            source_type: 'sprint_reverse_review_workflow',
          })) as unknown as Record<string, unknown>[]

          return {
            dispute: {
              ...reverseWorkflow,
              source_type: 'sprint_reverse_review_workflow',
              dispute_reason: reportMessage?.['body'] ?? reverseWorkflow['comment'] ?? null,
              requested_outcome: 'request_admin_review',
              runtime_context: runtimeContext,
            },
            comments: messages,
            evidences: [],
            case_files: [],
            ai_evaluations: aiEvaluations,
            timeline: buildTimeline(messages, [], [], aiEvaluations, []),
          }
        }

        const comments = (await trx
          .from('sprint_review_dispute_comments')
          .where('dispute_id', dto.disputeId)
          .whereNull('deleted_at')
          .orderBy('created_at', 'asc')
          .select(
            'id',
            'dispute_id',
            'author_id',
            'body',
            'visibility',
            'created_at',
            db.raw('NULL as author_context')
          )) as Record<string, unknown>[]

        await trx.commit()

        const auditEvents = (await db
          .from('audit_events as ae')
          .leftJoin('users as actor', 'actor.id', 'ae.user_id')
          .where('ae.entity_type', 'sprint_review_dispute')
          .where('ae.entity_id', dto.disputeId)
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
          .orderBy('ae.occurred_at', 'desc')) as Record<string, unknown>[]

        const aiEvaluations = (await new ListAiDisputeEvaluationsQuery(this.execCtx).execute({
          dispute_id: dto.disputeId,
          source_type: 'sprint_review_dispute',
        })) as unknown as Record<string, unknown>[]

        return {
          dispute: {
            ...sprintDispute,
            source_type: 'sprint_review_dispute',
            runtime_context: parseJsonObject(sprintDispute['runtime_context']),
          },
          comments,
          evidences: [],
          case_files: [],
          ai_evaluations: aiEvaluations,
          timeline: buildTimeline(comments, [], [], aiEvaluations, auditEvents),
        }
      }

      const [comments, evidences] = await Promise.all([
        loadReviewDisputeComments(trx, dto.disputeId),
        loadReviewDisputeEvidences(trx, dto.disputeId),
      ])

      await trx.commit()

      const [caseFiles, evaluations, auditEvents] = await Promise.all([
        new ListReviewDisputeCaseFilesQuery(this.execCtx).execute({ dispute_id: dto.disputeId }),
        new ListAiDisputeEvaluationsQuery(this.execCtx).execute({ dispute_id: dto.disputeId }),
        db
          .from('audit_events as ae')
          .leftJoin('users as actor', 'actor.id', 'ae.user_id')
          .where('ae.entity_type', 'review_dispute')
          .where('ae.entity_id', dto.disputeId)
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
          disputed_dimensions: parseJsonObject(dispute['disputed_dimensions']),
          disputed_skill_reviews: parseJsonArray(dispute['disputed_skill_reviews']),
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
