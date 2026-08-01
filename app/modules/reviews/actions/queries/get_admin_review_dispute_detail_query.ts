import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { AiDisputeEvaluationSourceReader } from '#modules/reviews/actions/ports/outbound/ai_dispute_evaluation_source_reader'
import type { ReviewAdminDisputeReadModel } from '#modules/reviews/actions/ports/outbound/review_admin_dispute_read_model'
import type { ReviewDisputeArtifactReader } from '#modules/reviews/actions/ports/outbound/review_dispute_artifact_reader'
import ListAiDisputeEvaluationsQuery from '#modules/reviews/actions/queries/list_ai_dispute_evaluations_query'
import ListReviewDisputeCaseFilesQuery from '#modules/reviews/actions/queries/list_review_dispute_case_files_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type {
  AdminReviewDisputeTimelineEntry,
  GetAdminReviewDisputeDetailInput,
  GetAdminReviewDisputeDetailResult,
} from '#modules/reviews/public_contracts/admin_review_dispute_capability'

export type GetAdminReviewDisputeDetailDTO = GetAdminReviewDisputeDetailInput
export type { GetAdminReviewDisputeDetailResult }

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
): AdminReviewDisputeTimelineEntry[] {
  const entries: AdminReviewDisputeTimelineEntry[] = [
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

async function requireSystemAdmin(
  actorId: string,
  readModel: ReviewAdminDisputeReadModel
): Promise<void> {
  const role = await readModel.findActorSystemRole(actorId)
  if (role === undefined) {
    throw new NotFoundException('User not found')
  }
  if (role !== 'system_admin' && role !== 'superadmin') {
    throw new ForbiddenException('Only system admin can inspect review disputes')
  }
}

export default class GetAdminReviewDisputeDetailQuery {
  constructor(
    private execCtx: ReviewActionContext,
    private readonly disputeArtifacts: ReviewDisputeArtifactReader,
    private readonly aiSources: AiDisputeEvaluationSourceReader,
    private readonly readModel: ReviewAdminDisputeReadModel
  ) {}

  async execute(dto: GetAdminReviewDisputeDetailDTO): Promise<GetAdminReviewDisputeDetailResult> {
    const actorId = requireUserId(this.execCtx)
    await requireSystemAdmin(actorId, this.readModel)
    const snapshot = await this.readModel.findDisputeDetail(dto.disputeId)
    if (!snapshot) {
      throw new NotFoundException('Review dispute not found')
    }

    if (snapshot.sourceType === 'task_review_workflow') {
      const reportMessage = [...snapshot.comments]
        .reverse()
        .find((message) => message['visibility'] === 'system')
      const reportMetadata = parseJsonObject(reportMessage?.['metadata'])
      const messageRuntimeContext = parseJsonObject(reportMetadata['runtime_context'])
      const workflowRuntimeContext = parseJsonObject(snapshot.dispute['runtime_context'])
      const runtimeContext =
        Object.keys(workflowRuntimeContext).length > 0
          ? workflowRuntimeContext
          : messageRuntimeContext
      const aiEvaluations = await this.listAiEvaluations(dto.disputeId, 'task_review_workflow')

      return {
        dispute: {
          ...snapshot.dispute,
          source_type: snapshot.sourceType,
          dispute_review_type: 'task_review',
          dispute_reason: reportMessage?.['body'] ?? 'Task review workflow reported',
          requested_outcome: 'request_admin_review',
          runtime_context: runtimeContext,
        },
        comments: snapshot.comments,
        evidences: [],
        case_files: [],
        ai_evaluations: aiEvaluations,
        timeline: buildTimeline(snapshot.comments, [], [], aiEvaluations, []),
      }
    }

    if (snapshot.sourceType === 'sprint_reverse_review_workflow') {
      const reportMessage = [...snapshot.comments]
        .reverse()
        .find((message) => message['visibility'] === 'report')
      const reportMetadata = parseJsonObject(reportMessage?.['metadata'])
      const runtimeContext = parseJsonObject(reportMetadata['runtime_context'])
      const aiEvaluations = await this.listAiEvaluations(
        dto.disputeId,
        'sprint_reverse_review_workflow'
      )

      return {
        dispute: {
          ...snapshot.dispute,
          source_type: snapshot.sourceType,
          dispute_reason: reportMessage?.['body'] ?? snapshot.dispute['comment'] ?? null,
          requested_outcome: 'request_admin_review',
          runtime_context: runtimeContext,
        },
        comments: snapshot.comments,
        evidences: [],
        case_files: [],
        ai_evaluations: aiEvaluations,
        timeline: buildTimeline(snapshot.comments, [], [], aiEvaluations, []),
      }
    }

    if (snapshot.sourceType === 'sprint_review_dispute') {
      const aiEvaluations = await this.listAiEvaluations(dto.disputeId, 'sprint_review_dispute')
      return {
        dispute: {
          ...snapshot.dispute,
          source_type: snapshot.sourceType,
          runtime_context: parseJsonObject(snapshot.dispute['runtime_context']),
        },
        comments: snapshot.comments,
        evidences: [],
        case_files: [],
        ai_evaluations: aiEvaluations,
        timeline: buildTimeline(snapshot.comments, [], [], aiEvaluations, snapshot.auditEvents),
      }
    }

    const [commentSnapshot, evidenceSnapshot, caseFiles, evaluations] = await Promise.all([
      this.disputeArtifacts.listComments(dto.disputeId, actorId),
      this.disputeArtifacts.listEvidences(dto.disputeId, actorId),
      new ListReviewDisputeCaseFilesQuery(
        this.execCtx,
        this.disputeArtifacts,
        this.aiSources
      ).execute({ dispute_id: dto.disputeId }),
      new ListAiDisputeEvaluationsQuery(this.execCtx, this.aiSources).execute({
        dispute_id: dto.disputeId,
      }),
    ])
    const comments = commentSnapshot.items
    const evidences = evidenceSnapshot.items
    const normalizedCaseFiles = caseFiles as unknown as Record<string, unknown>[]
    const normalizedEvaluations = evaluations as unknown as Record<string, unknown>[]

    return {
      dispute: {
        ...snapshot.dispute,
        disputed_dimensions: parseJsonObject(snapshot.dispute['disputed_dimensions']),
        disputed_skill_reviews: parseJsonArray(snapshot.dispute['disputed_skill_reviews']),
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
        snapshot.auditEvents
      ),
    }
  }

  private async listAiEvaluations(
    disputeId: string,
    sourceType: 'sprint_review_dispute' | 'sprint_reverse_review_workflow' | 'task_review_workflow'
  ): Promise<Record<string, unknown>[]> {
    return (await new ListAiDisputeEvaluationsQuery(this.execCtx, this.aiSources).execute({
      dispute_id: disputeId,
      source_type: sourceType,
    })) as unknown as Record<string, unknown>[]
  }
}
