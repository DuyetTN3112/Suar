import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { SEED_REVIEW_SESSION_SPECS } from './review_specs.js'
import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere, findRow } from './seed_utils.js'
import type { SeededAssignment, SeededTask, SeededUser, UserKey } from './types.js'

import { buildReviewDisputeCaseFileRecord } from '#modules/reviews/actions/support/review_dispute_case_file_builder'

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
      title: `${task.title} review packet`,
      description: 'Review rubric, reviewer notes, and contributor response in one packet.',
    },
    {
      evidence_type: 'acceptance_trace',
      url: buildDossierUrl(taskKey, 'acceptance-trace'),
      title: `${task.title} acceptance trace`,
      description: 'Acceptance criteria mapped to delivery evidence and timeline comments.',
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
  trx: TransactionClientContract,
  dispute: ReviewDisputeRow,
  actorId: string
): Promise<CaseFileRow> {
  await trx.from('ai_dispute_evaluations').where('dispute_id', dispute.id).delete()
  await trx.from('review_dispute_case_files').where('dispute_id', dispute.id).delete()

  const built = await buildReviewDisputeCaseFileRecord(trx, dispute.id, actorId)
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
  const recommendation =
    taskKey === 'owner-review-dispute-case' ? 'partially_accept' : 'adjust_score'
  const responsePayload = {
    recommendation,
    confidence: 0.82,
    rationale:
      recommendation === 'partially_accept'
        ? 'Delivery evidence supports most acceptance criteria, but reviewer rationale should separate QA coverage from profile scoring concerns.'
        : 'Disputed score should be adjusted because evidence packet and comments show the reviewed skill was observed at the requested level.',
    checks: [
      'submission evidence present',
      'required skills snapshot present',
      'review comments included',
      'dispute claim grounded in delivery timeline',
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
    const caseFile = await rebuildCaseFile(trx, dispute, users.superadmin.id)
    await insertAiEvaluation(runtime, trx, dispute, caseFile, spec.key)

    if (spec.key === 'owner-review-dispute-case') {
      await trx
        .from('review_disputes')
        .where('id', dispute.id)
        .update({
          status: 'resolved',
          resolved_at: runtime.isoDaysAgo(0, 16),
          resolved_by: users.superadmin.id,
          final_decision: 'partially_accept',
          final_rationale:
            'Demo resolution: delivery evidence supports most disputed task-review points, while rubric ambiguity remains documented for follow-up.',
          profile_update_action: 'record_context',
          reviewer_credibility_action: 'no_change',
          updated_at: runtime.isoDaysAgo(0, 16),
        })
    }
  }
}
