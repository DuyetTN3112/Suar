import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { SEED_REVIEW_SESSION_SPECS } from './review_specs.js'
import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere, findRow } from './seed_utils.js'
import type { SeededAssignment, SeededTask, SeededUser, UserKey } from './types.js'

import { buildReviewDisputeCaseFileRecord } from '#modules/reviews/infra/adapters/disputes/lucid_review_dispute_case_file_builder'

interface ReviewDisputeRow {
  id: string
  review_session_id: string
  task_assignment_id: string
  task_id: string
  reviewee_id: string
  dispute_reason: string
  requested_outcome: string
}

interface CaseFileRow {
  id: string
  completeness_score: number
}

function buildDossierUrl(taskKey: string, suffix: string): string {
  return `https://workbench.suar.dev/disputes/${encodeURIComponent(taskKey)}/${suffix}`
}

async function upsertDisputeEvidence(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  dispute: ReviewDisputeRow,
  task: SeededTask,
  taskKey: string
): Promise<void> {
  const rows = [
    {
      evidence_type: 'review_packet',
      url: buildDossierUrl(taskKey, 'review-packet'),
      title: `Hồ sơ review: ${task.title}`,
      description: 'Rubric đánh giá, ghi chú của reviewer và phản hồi của người thực hiện trong cùng một hồ sơ.',
    },
    {
      evidence_type: 'acceptance_trace',
      url: buildDossierUrl(taskKey, 'acceptance-trace'),
      title: `Vết nghiệm thu: ${task.title}`,
      description: 'Tiêu chí nghiệm thu được đối chiếu với chứng cứ bàn giao và bình luận theo dòng thời gian.',
    },
  ]

  for (const row of rows) {
    const where = {
      dispute_id: dispute.id,
      url: row.url,
    }
    const existing = await findRow(trx, 'review_dispute_evidences', where)
    const payload = {
      evidence_type: row.evidence_type,
      title: row.title,
      description: row.description,
      uploaded_by: dispute.reviewee_id,
      created_at: runtime.isoDaysAgo(1, 13),
    }

    if (existing) {
      await applyWhere(trx.from('review_dispute_evidences'), where).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('review_dispute_evidences')
        .insert({ id: runtime.uuid(), ...where, ...payload })
    }
  }
}

async function rebuildCaseFile(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  dispute: ReviewDisputeRow,
  actorId: string
): Promise<CaseFileRow> {
  await trx.from('ai_dispute_evaluations').where('dispute_id', dispute.id).delete()
  await trx.from('review_dispute_case_files').where('dispute_id', dispute.id).delete()

  const built = await buildReviewDisputeCaseFileRecord(trx, dispute.id, actorId)
  await trx
    .from('review_dispute_case_files')
    .where('id', built.id)
    .update({ created_at: runtime.isoDaysAgo(1, 13) })

  return {
    id: built.id,
    completeness_score: built.completenessScore,
  }
}

async function insertAiEvaluation(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  dispute: ReviewDisputeRow,
  caseFile: CaseFileRow,
  taskKey: string
): Promise<void> {
  const aiVerdictByTask: Record<string, { recommendation: string; confidence: number; rationale: string }> = {
    'owner-review-dispute-case': {
      recommendation: 'adjust_score',
      confidence: 0.82,
      rationale:
        'Nên điều chỉnh điểm vì vết nghiệm thu, chứng cứ bàn giao và trao đổi của reviewer đều nhất quán cho thấy kỹ năng được đánh giá ở mức người thực hiện đề nghị.',
    },
    'orgc-marketplace-ranking': {
      recommendation: 'request_re_review',
      confidence: 0.71,
      rationale:
        'Nên tổ chức đánh giá lại vì hai reviewer chưa thống nhất trọng số tiêu chí; chứng cứ bàn giao đầy đủ nhưng rubric áp dụng chưa được chốt chung.',
    },
    'orga-review-dispute-detail': {
      recommendation: 'partially_accept',
      confidence: 0.68,
      rationale:
        'Nên chấp nhận một phần khiếu nại: chứng cứ ủng hộ nhóm kỹ năng kiểm duyệt ở mức cao hơn, nhưng phần tiêu chí đánh giá còn lại đã được chấm đúng rubric.',
    },
  }
  const verdict = aiVerdictByTask[taskKey] ?? {
    recommendation: 'adjust_score',
    confidence: 0.75,
    rationale:
      'Chứng cứ bàn giao và trao đổi review cho thấy cần xem xét điều chỉnh kết quả đánh giá.',
  }
  const recommendation = verdict.recommendation
  const responsePayload = {
    recommendation,
    confidence: verdict.confidence,
    rationale: verdict.rationale,
    checks: [
      'có chứng cứ bàn giao',
      'có snapshot kỹ năng yêu cầu',
      'đã bao gồm nhận xét review',
      'khiếu nại bám sát mốc thời gian bàn giao',
    ],
  }

  await trx
    .insertQuery()
    .table('ai_dispute_evaluations')
    .insert({
      id: runtime.uuid(),
      dispute_id: dispute.id,
      case_file_id: caseFile.id,
      provider: 'suar-dispute-council',
      external_run_id: `council-${taskKey}`,
      status: 'completed',
      request_payload: runtime.toJson({
        dispute_id: dispute.id,
        case_file_id: caseFile.id,
        completeness_score: caseFile.completeness_score,
      }),
      response_payload: runtime.toJson(responsePayload),
      recommendation,
      confidence_score: responsePayload.confidence,
      summary: responsePayload.rationale,
      error_message: null,
      created_at: runtime.isoDaysAgo(1, 14),
      completed_at: runtime.isoDaysAgo(1, 15),
    })
}

export async function seedReviewDisputeDossiers(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  tasks: Record<string, SeededTask>,
  assignments: Record<string, SeededAssignment>
): Promise<void> {
  const disputedSpecs = SEED_REVIEW_SESSION_SPECS.filter(
    (spec) => spec.sessionStatus === 'disputed'
  )

  for (const spec of disputedSpecs) {
    const task = runtime.requireValue(tasks[spec.key], `dispute-dossier-task:${spec.key}`)
    const assignment = runtime.requireValue(
      assignments[spec.key],
      `dispute-dossier-assignment:${spec.key}`
    )
    const dispute = (await trx
      .from('review_disputes')
      .where('task_assignment_id', assignment.id)
      .where('task_id', task.id)
      .first()) as ReviewDisputeRow | undefined

    if (!dispute) {
      continue
    }

    await upsertDisputeEvidence(runtime, trx, dispute, task, spec.key)
    const caseFile = await rebuildCaseFile(runtime, trx, dispute, users.superadmin.id)
    await insertAiEvaluation(runtime, trx, dispute, caseFile, spec.key)

    if (spec.key === 'owner-review-dispute-case') {
      await trx
        .from('review_disputes')
        .where('id', dispute.id)
        .update({
          status: 'resolved',
          resolved_at: runtime.isoDaysAgo(0, 16),
          resolved_by: users.superadmin.id,
          final_decision: 'adjust_score',
          final_rationale:
            'Chứng cứ bàn giao đáp ứng đầy đủ tiêu chí nghiệm thu và thể hiện năng lực ở mức cao hơn điểm đánh giá ban đầu; điểm hồ sơ được điều chỉnh, đồng thời rubric sẽ được làm rõ cho các kỳ sau.',
          profile_update_action: 'recalculate_after_adjustment',
          reviewer_credibility_action: 'no_action',
          updated_at: runtime.isoDaysAgo(0, 16),
        })
    }
  }
}
