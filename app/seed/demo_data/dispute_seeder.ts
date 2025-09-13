/**
 * Seeder cho review_disputes + review_dispute_case_files.
 * 
 * Tạo dispute demo data nội bộ cho Suar.
 * Dùng existing users, tasks, review_sessions từ seed trước đó.
 */

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere } from './seed_utils.js'
import type { SeededTask, SeededUser, SeededAssignment } from './types.js'

// ============================================================================
// DISPUTE SCENARIOS — templates cho synthetic data
// ============================================================================

interface DisputeScenario {
  key: string
  taskKey: string
  reviewerType: 'manager' | 'peer'
  disputeReason: string
  disputedDimensions: string[]
  requestedOutcome: 'adjust_score' | 'remove_review' | 'request_re_review' | 'add_context' | 'other'
  finalDecision: 'uphold_review' | 'adjust_score' | 'request_re_review' | 'dismiss_dispute' | 'partially_accept'
  finalRationale: string
  overallScore: number
  deliveryTimeliness: 'early' | 'on_time' | 'slightly_late' | 'significantly_late'
  requirementAdherence: number
  codeQualityScore: number
  hasSubmission: boolean
  hasCodeReview?: boolean
  hasTestResults: boolean
  acceptanceCriteriaMet: boolean
  testCoveragePct: number
  reviewerCredibility: number
  completenessScore: number
}

// 20 dispute scenarios covering all 5 final_decision outcomes
const DISPUTE_SCENARIOS: DisputeScenario[] = [
  // --- adjust_score (review too harsh) ---
  {
    key: 'dispute-task-01',
    taskKey: 'task-01',
    reviewerType: 'manager',
    disputeReason: 'Reviewer gave score 2/5 nhưng code đã pass acceptance criteria và có đầy đủ unit tests',
    disputedDimensions: ['overall_quality', 'code_quality', 'requirement_adherence'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'adjust_score',
    finalRationale: 'Task đạt acceptance criteria với test coverage 78%. Review score 2/5 không phản ánh đúng chất lượng delivery. Điều chỉnh score phù hợp hơn.',
    overallScore: 2,
    deliveryTimeliness: 'on_time',
    requirementAdherence: 4,
    codeQualityScore: 3,
    hasSubmission: true,
    hasTestResults: true,
    acceptanceCriteriaMet: true,
    testCoveragePct: 78,
    reviewerCredibility: 85,
    completenessScore: 90,
  },
  {
    key: 'dispute-task-02',
    taskKey: 'task-02',
    reviewerType: 'peer',
    disputeReason: 'Peer reviewer đánh giá thấp kỹ năng TypeScript mặc dù đã dùng đúng patterns và type safety',
    disputedDimensions: ['code_quality'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'adjust_score',
    finalRationale: 'Code sử dụng TypeScript patterns đúng, type safety được đảm bảo. Reviewer có thể chưa quen với pattern mới.',
    overallScore: 2,
    deliveryTimeliness: 'on_time',
    requirementAdherence: 4,
    codeQualityScore: 2,
    hasSubmission: true,
    hasTestResults: true,
    acceptanceCriteriaMet: true,
    testCoveragePct: 85,
    reviewerCredibility: 60,
    completenessScore: 85,
  },
  // --- uphold_review (review correct, task failed) ---
  {
    key: 'dispute-task-03',
    taskKey: 'task-03',
    reviewerType: 'manager',
    disputeReason: 'Tôi nghĩ score 2/5 là quá cao cho task miss deadline và không có tests',
    disputedDimensions: ['overall_quality', 'delivery_timeliness'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'uphold_review',
    finalRationale: 'Task miss deadline, không có tests, acceptance criteria không đạt. Review score 2/5 là fair assessment.',
    overallScore: 2,
    deliveryTimeliness: 'significantly_late',
    requirementAdherence: 1,
    codeQualityScore: 2,
    hasSubmission: true,
    hasTestResults: false,
    acceptanceCriteriaMet: false,
    testCoveragePct: 15,
    reviewerCredibility: 90,
    completenessScore: 75,
  },
  {
    key: 'dispute-task-04',
    taskKey: 'task-04',
    reviewerType: 'manager',
    disputeReason: 'Task không đạt acceptance criteria nhưng reviewee nghĩ reviewer quá khắt khe',
    disputedDimensions: ['requirement_adherence', 'overall_quality'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'uphold_review',
    finalRationale: 'Acceptance criteria không đạt, test coverage 10%. Reviewer assessment chính xác.',
    overallScore: 1,
    deliveryTimeliness: 'significantly_late',
    requirementAdherence: 1,
    codeQualityScore: 1,
    hasSubmission: true,
    hasTestResults: false,
    acceptanceCriteriaMet: false,
    testCoveragePct: 10,
    reviewerCredibility: 95,
    completenessScore: 70,
  },
  // --- dismiss_dispute (no evidence) ---
  {
    key: 'dispute-task-05',
    taskKey: 'task-05',
    reviewerType: 'peer',
    disputeReason: 'Tôi không đồng ý với review nhưng tôi không có evidence cụ thể để chứng minh',
    disputedDimensions: ['overall_quality'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'dismiss_dispute',
    finalRationale: 'Reviewee không cung cấp evidence cụ thể. Dispute không có cơ sở để xem xét.',
    overallScore: 3,
    deliveryTimeliness: 'on_time',
    requirementAdherence: 3,
    codeQualityScore: 3,
    hasSubmission: false,
    hasTestResults: false,
    acceptanceCriteriaMet: false,
    testCoveragePct: 0,
    reviewerCredibility: 75,
    completenessScore: 25,
  },
  {
    key: 'dispute-task-06',
    taskKey: 'task-06',
    reviewerType: 'manager',
    disputeReason: 'Review không công bằng vì reviewer không hiểu business context',
    disputedDimensions: ['requirement_adherence'],
    requestedOutcome: 'other',
    finalDecision: 'dismiss_dispute',
    finalRationale: 'Không có evidence cụ thể nào được cung cấp ngoài complaint chung chung.',
    overallScore: 3,
    deliveryTimeliness: 'on_time',
    requirementAdherence: 3,
    codeQualityScore: 3,
    hasSubmission: false,
    hasTestResults: false,
    acceptanceCriteriaMet: false,
    testCoveragePct: 0,
    reviewerCredibility: 80,
    completenessScore: 20,
  },
  // --- request_re_review (missing context) ---
  {
    key: 'dispute-task-07',
    taskKey: 'task-07',
    reviewerType: 'manager',
    disputeReason: 'Cần thêm thông tin về cách acceptance criteria được verify trước khi phán xử',
    disputedDimensions: ['requirement_adherence', 'overall_quality'],
    requestedOutcome: 'request_re_review',
    finalDecision: 'request_re_review',
    finalRationale: 'Thiếu submission và code review. Không đủ cơ sở để phán xử. Cần thu thập thêm evidence.',
    overallScore: 3,
    deliveryTimeliness: 'on_time',
    requirementAdherence: 3,
    codeQualityScore: 3,
    hasSubmission: false,
    hasCodeReview: false,
    hasTestResults: false,
    acceptanceCriteriaMet: false,
    testCoveragePct: 0,
    reviewerCredibility: 70,
    completenessScore: 15,
  },
  {
    key: 'dispute-task-08',
    taskKey: 'task-08',
    reviewerType: 'peer',
    disputeReason: 'Review dựa trên version code cũ, cần xem version mới nhất',
    disputedDimensions: ['code_quality'],
    requestedOutcome: 'request_re_review',
    finalDecision: 'request_re_review',
    finalRationale: 'Reviewee claim đã update code nhưng chưa có test results cho version mới. Cần re-review.',
    overallScore: 2,
    deliveryTimeliness: 'slightly_late',
    requirementAdherence: 3,
    codeQualityScore: 2,
    hasSubmission: true,
    hasTestResults: false,
    acceptanceCriteriaMet: false,
    testCoveragePct: 30,
    reviewerCredibility: 65,
    completenessScore: 45,
  },
  // --- partially_accept (both sides valid) ---
  {
    key: 'dispute-task-09',
    taskKey: 'task-09',
    reviewerType: 'manager',
    disputeReason: 'Task đạt acceptance criteria nhưng code quality cần cải thiện',
    disputedDimensions: ['code_quality', 'overall_quality'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'partially_accept',
    finalRationale: 'Task đạt acceptance criteria (reviewee đúng) nhưng code quality thấp (reviewer đúng). Cả hai bên có điểm hợp lệ.',
    overallScore: 3,
    deliveryTimeliness: 'on_time',
    requirementAdherence: 4,
    codeQualityScore: 2,
    hasSubmission: true,
    hasTestResults: true,
    acceptanceCriteriaMet: true,
    testCoveragePct: 65,
    reviewerCredibility: 80,
    completenessScore: 80,
  },
  {
    key: 'dispute-task-10',
    taskKey: 'task-10',
    reviewerType: 'peer',
    disputeReason: 'Reviewer nói communication quality thấp nhưng tôi đã update đầy đủ mọi feedback',
    disputedDimensions: ['communication_quality', 'proactiveness'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'partially_accept',
    finalRationale: 'Reviewee có cải thiện communication (có evidence) nhưng vẫn cần thêm proactive follow-up.',
    overallScore: 3,
    deliveryTimeliness: 'on_time',
    requirementAdherence: 4,
    codeQualityScore: 3,
    hasSubmission: true,
    hasTestResults: true,
    acceptanceCriteriaMet: true,
    testCoveragePct: 60,
    reviewerCredibility: 70,
    completenessScore: 75,
  },
  // --- More scenarios for diversity ---
  {
    key: 'dispute-task-11',
    taskKey: 'task-11',
    reviewerType: 'manager',
    disputeReason: 'Reviewer cho điểm thấp vì task quá đơn giản so với difficulty level',
    disputedDimensions: ['overall_quality'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'adjust_score',
    finalRationale: 'Task difficulty là easy nhưng reviewer assess như hard task. Score không phù hợp với difficulty level.',
    overallScore: 2,
    deliveryTimeliness: 'early',
    requirementAdherence: 5,
    codeQualityScore: 4,
    hasSubmission: true,
    hasTestResults: true,
    acceptanceCriteriaMet: true,
    testCoveragePct: 90,
    reviewerCredibility: 75,
    completenessScore: 95,
  },
  {
    key: 'dispute-task-12',
    taskKey: 'task-12',
    reviewerType: 'peer',
    disputeReason: 'Task có test coverage cao nhưng reviewer không xem xét tests',
    disputedDimensions: ['code_quality', 'overall_quality'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'partially_accept',
    finalRationale: 'Test coverage cao (reviewee đúng) nhưng code patterns cần improvement (reviewer đúng).',
    overallScore: 3,
    deliveryTimeliness: 'on_time',
    requirementAdherence: 4,
    codeQualityScore: 2,
    hasSubmission: true,
    hasTestResults: true,
    acceptanceCriteriaMet: true,
    testCoveragePct: 92,
    reviewerCredibility: 55,
    completenessScore: 85,
  },
  {
    key: 'dispute-task-13',
    taskKey: 'task-13',
    reviewerType: 'manager',
    disputeReason: 'Reviewer credibility thấp, reviewee có evidence mạnh',
    disputedDimensions: ['overall_quality', 'code_quality', 'requirement_adherence'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'adjust_score',
    finalRationale: 'Reviewer credibility score 25/100, reviewee có submission + tests + acceptance criteria met.',
    overallScore: 2,
    deliveryTimeliness: 'on_time',
    requirementAdherence: 4,
    codeQualityScore: 3,
    hasSubmission: true,
    hasTestResults: true,
    acceptanceCriteriaMet: true,
    testCoveragePct: 80,
    reviewerCredibility: 25,
    completenessScore: 90,
  },
  {
    key: 'dispute-task-14',
    taskKey: 'task-14',
    reviewerType: 'manager',
    disputeReason: 'Task fail hoàn toàn, không có submission',
    disputedDimensions: ['overall_quality', 'delivery_timeliness', 'requirement_adherence'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'uphold_review',
    finalRationale: 'Không có submission, không có tests, không có evidence. Review score 1/5 là chính xác.',
    overallScore: 1,
    deliveryTimeliness: 'significantly_late',
    requirementAdherence: 1,
    codeQualityScore: 1,
    hasSubmission: false,
    hasTestResults: false,
    acceptanceCriteriaMet: false,
    testCoveragePct: 0,
    reviewerCredibility: 90,
    completenessScore: 30,
  },
  {
    key: 'dispute-task-15',
    taskKey: 'task-15',
    reviewerType: 'peer',
    disputeReason: 'Dispute về skill level assessment cho kỹ năng Security',
    disputedDimensions: ['overall_quality'],
    requestedOutcome: 'request_re_review',
    finalDecision: 'request_re_review',
    finalRationale: 'Cần security expert thứ 3 để assess lại skill level. Hiện tại không đủ data.',
    overallScore: 3,
    deliveryTimeliness: 'on_time',
    requirementAdherence: 3,
    codeQualityScore: 3,
    hasSubmission: true,
    hasTestResults: false,
    acceptanceCriteriaMet: false,
    testCoveragePct: 40,
    reviewerCredibility: 45,
    completenessScore: 50,
  },
  {
    key: 'dispute-task-16',
    taskKey: 'task-16',
    reviewerType: 'manager',
    disputeReason: 'Task đạt criteria nhưng reviewer không thích coding style',
    disputedDimensions: ['code_quality'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'partially_accept',
    finalRationale: 'Task đạt acceptance criteria (reviewee đúng) nhưng coding style không follow team conventions (reviewer đúng).',
    overallScore: 3,
    deliveryTimeliness: 'on_time',
    requirementAdherence: 5,
    codeQualityScore: 2,
    hasSubmission: true,
    hasTestResults: true,
    acceptanceCriteriaMet: true,
    testCoveragePct: 70,
    reviewerCredibility: 85,
    completenessScore: 85,
  },
  {
    key: 'dispute-task-17',
    taskKey: 'task-17',
    reviewerType: 'peer',
    disputeReason: 'Reviewer không xem xét acceptance criteria đã được verify bởi QA',
    disputedDimensions: ['requirement_adherence'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'adjust_score',
    finalRationale: 'QA đã verify acceptance criteria met. Reviewer không xem xét evidence này.',
    overallScore: 2,
    deliveryTimeliness: 'on_time',
    requirementAdherence: 4,
    codeQualityScore: 3,
    hasSubmission: true,
    hasTestResults: true,
    acceptanceCriteriaMet: true,
    testCoveragePct: 75,
    reviewerCredibility: 60,
    completenessScore: 80,
  },
  {
    key: 'dispute-task-18',
    taskKey: 'task-18',
    reviewerType: 'manager',
    disputeReason: 'Task miss deadline nhưng reviewer quá khắt khe về quality',
    disputedDimensions: ['delivery_timeliness', 'overall_quality'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'partially_accept',
    finalRationale: 'Task miss deadline (reviewer đúng) nhưng quality không tệ như review nói (reviewee đúng một phần).',
    overallScore: 2,
    deliveryTimeliness: 'significantly_late',
    requirementAdherence: 3,
    codeQualityScore: 3,
    hasSubmission: true,
    hasTestResults: true,
    acceptanceCriteriaMet: true,
    testCoveragePct: 55,
    reviewerCredibility: 80,
    completenessScore: 75,
  },
  {
    key: 'dispute-task-19',
    taskKey: 'task-19',
    reviewerType: 'peer',
    disputeReason: 'Không có evidence, chỉ là không đồng ý với score',
    disputedDimensions: ['overall_quality'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'dismiss_dispute',
    finalRationale: 'Không có evidence cụ thể. Dispute dựa trên cảm xúc chung.',
    overallScore: 3,
    deliveryTimeliness: 'on_time',
    requirementAdherence: 3,
    codeQualityScore: 3,
    hasSubmission: false,
    hasTestResults: false,
    acceptanceCriteriaMet: false,
    testCoveragePct: 0,
    reviewerCredibility: 70,
    completenessScore: 15,
  },
  {
    key: 'dispute-task-20',
    taskKey: 'task-20',
    reviewerType: 'manager',
    disputeReason: 'Task đạt acceptance criteria, có tests, reviewer score thấp vì personal bias',
    disputedDimensions: ['overall_quality', 'code_quality', 'requirement_adherence'],
    requestedOutcome: 'adjust_score',
    finalDecision: 'adjust_score',
    finalRationale: 'Task đạt acceptance criteria với test coverage 85%. Evidence mạnh cho thấy review score không objective.',
    overallScore: 2,
    deliveryTimeliness: 'on_time',
    requirementAdherence: 5,
    codeQualityScore: 3,
    hasSubmission: true,
    hasTestResults: true,
    acceptanceCriteriaMet: true,
    testCoveragePct: 85,
    reviewerCredibility: 50,
    completenessScore: 95,
  },
]

// ============================================================================
// SEEDER FUNCTION
// ============================================================================

export async function seedDisputeData(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<string, SeededUser>,
  _tasks: Record<string, SeededTask>,
  assignments: Record<string, SeededAssignment>,
): Promise<void> {
  for (const spec of DISPUTE_SCENARIOS) {
    // Find the review session for this task
    const assignment = Object.values(assignments).find(a => a.taskId === spec.taskKey)
    if (!assignment) {
      console.log(`  [dispute] Skip ${spec.key}: no assignment found for task ${spec.taskKey}`)
      continue
    }

    // Find existing review session
    const existingSession = await trx
      .from('review_sessions')
      .where('task_assignment_id', assignment.id)
      .where('reviewee_id', assignment.assigneeId)
      .first() as { id: string } | null

    if (!existingSession) {
      console.log(`  [dispute] Skip ${spec.key}: no review session found`)
      continue
    }

    const sessionId = existingSession.id

    // Determine reviewer (use orgAdmin as default reviewer)
    const reviewerId = users.orgAdmin?.id
    if (!reviewerId) {
      console.log(`  [dispute] Skip ${spec.key}: no orgAdmin reviewer found`)
      continue
    }

    // Check if dispute already exists
    const existingDispute = await trx
      .from('review_disputes')
      .where('review_session_id', sessionId)
      .first() as { id: string } | null

    const disputeId = existingDispute?.id ?? runtime.uuid()

    const disputePayload = {
      review_session_id: sessionId,
      task_assignment_id: assignment.id,
      task_id: assignment.taskId,
      reviewee_id: assignment.assigneeId,
      opened_by: assignment.assigneeId,
      status: 'resolved',
      dispute_reason: spec.disputeReason,
      disputed_dimensions: runtime.toJson(spec.disputedDimensions),
      disputed_skill_reviews: runtime.toJson([
        {
          skill_name: 'testing',
          reviewer_said: 'middle',
          reviewee_claims: 'senior',
        },
      ]),
      requested_outcome: spec.requestedOutcome,
      final_decision: spec.finalDecision,
      final_rationale: spec.finalRationale,
      resolved_at: runtime.isoDaysAgo(1),
      resolved_by: reviewerId,
      created_at: runtime.isoDaysAgo(3),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existingDispute) {
      await applyWhere(trx.from('review_disputes'), { id: disputeId }).update(disputePayload)
    } else {
      await trx
        .insertQuery()
        .table('review_disputes')
        .insert({ id: disputeId, ...disputePayload })
    }

    // Create case file
    const existingCaseFile = await trx
      .from('review_dispute_case_files')
      .where('dispute_id', disputeId)
      .first() as { id: string } | null

    const caseFileId = existingCaseFile?.id ?? runtime.uuid()

    const caseFilePayload = {
      dispute_id: disputeId,
      case_version: 1,
      task_snapshot: runtime.toJson({
        title: `Task ${spec.taskKey}`,
        description: `Task description for ${spec.taskKey}`,
        difficulty: 'medium',
        task_type: 'feature_development',
        acceptance_criteria: 'Acceptance criteria met',
        verification_method: 'code_review',
        tech_stack: ['Node.js', 'PostgreSQL'],
        problem_category: 'new_capability',
        business_domain: 'saas',
        impact_scope: 'team',
        environment: 'development',
        estimated_users_affected: 100,
      }),
      required_skills_snapshot: runtime.toJson(['testing', 'postgresql']),
      acceptance_criteria_snapshot: runtime.toJson({
        criteria: 'All tests pass',
        met: spec.acceptanceCriteriaMet,
      }),
      assignment_snapshot: runtime.toJson({
        assignee_id: assignment.assigneeId,
        task_id: assignment.taskId,
      }),
      submission_snapshot: runtime.toJson({
        has_submission: spec.hasSubmission,
        summary: spec.hasSubmission ? 'Code submitted' : 'No submission',
      }),
      review_snapshot: runtime.toJson({
        overall_quality_score: spec.overallScore,
        delivery_timeliness: spec.deliveryTimeliness,
        requirement_adherence: spec.requirementAdherence,
        communication_quality: 3,
        code_quality_score: spec.codeQualityScore,
        proactiveness_score: 3,
        would_work_with_again: spec.overallScore >= 3,
        strengths_observed: 'Good effort',
        areas_for_improvement: 'Needs improvement',
      }),
      skill_reviews_snapshot: runtime.toJson([
        {
          skill_name: 'testing',
          assigned_level_code: 'middle',
          comment: 'Adequate testing',
        },
        {
          skill_name: 'postgresql',
          assigned_level_code: 'junior',
          comment: 'Basic queries OK',
        },
      ]),
      evidences_snapshot: runtime.toJson([
        {
          evidence_type: 'pull_request',
          url: `https://github.com/suar/demo/pull/${spec.key}`,
          title: 'Pull Request',
        },
      ]),
      self_assessment_snapshot: runtime.toJson({
        overall_satisfaction: 4,
        difficulty_felt: 'as_expected',
      }),
      task_comments_snapshot: runtime.toJson([]),
      task_history_snapshot: runtime.toJson([]),
      reviewee_profile_context_snapshot: runtime.toJson({
        credibility_score: 60,
        total_reviews_given: 5,
        is_verified_badge: false,
        freelancer_rating: 3.5,
      }),
      reviewer_context_snapshot: runtime.toJson({
        credibility_score: spec.reviewerCredibility,
        total_reviews_given: 45,
        is_verified_badge: true,
        freelancer_rating: 4.5,
      }),
      dispute_claim_snapshot: runtime.toJson({
        dispute_reason: spec.disputeReason,
        disputed_dimensions: spec.disputedDimensions,
        requested_outcome: spec.requestedOutcome,
      }),
      completeness_score: spec.completenessScore,
      missing_data: runtime.toJson(
        !spec.hasSubmission ? ['task_submission', 'test_results'] : []
      ),
      created_at: runtime.isoDaysAgo(3),
      created_by: assignment.assigneeId,
    }

    if (existingCaseFile) {
      await applyWhere(trx.from('review_dispute_case_files'), { id: caseFileId }).update(caseFilePayload)
    } else {
      await trx
        .insertQuery()
        .table('review_dispute_case_files')
        .insert({ id: caseFileId, ...caseFilePayload })
    }

    // Create AI dispute evaluation record
    const existingEval = await trx
      .from('ai_dispute_evaluations')
      .where('dispute_id', disputeId)
      .first() as { id: string } | null

    const evalId = existingEval?.id ?? runtime.uuid()

    const evalPayload = {
      dispute_id: disputeId,
      case_file_id: caseFileId,
      provider: 'rule_engine_v1',
      external_run_id: null,
      status: 'completed',
      request_payload: runtime.toJson({
        dispute_reason: spec.disputeReason,
        disputed_dimensions: spec.disputedDimensions,
        evidence: {
          has_submission: spec.hasSubmission,
          has_test_results: spec.hasTestResults,
          acceptance_criteria_met: spec.acceptanceCriteriaMet,
          test_coverage_pct: spec.testCoveragePct,
        },
      }),
      response_payload: runtime.toJson({
        final_decision: spec.finalDecision,
        rationale: spec.finalRationale,
        rule_applied: 'rule_engine_v1',
        evidence_summary: `Test coverage: ${spec.testCoveragePct}%, Acceptance met: ${spec.acceptanceCriteriaMet}`,
        claimant_case: 'Reviewee claims review too harsh',
        respondent_case: 'Reviewer defends assessment',
      }),
      recommendation: spec.finalDecision,
      confidence_score: spec.completenessScore / 100,
      summary: spec.finalRationale,
      error_message: null,
      completed_at: runtime.isoDaysAgo(1),
      created_at: runtime.isoDaysAgo(2),
    }

    if (existingEval) {
      await applyWhere(trx.from('ai_dispute_evaluations'), { id: evalId }).update(evalPayload)
    } else {
      await trx
        .insertQuery()
        .table('ai_dispute_evaluations')
        .insert({ id: evalId, ...evalPayload})
    }

    console.log(`  [dispute] ${spec.key}: ${spec.finalDecision} (completeness: ${spec.completenessScore}%)`)
  }
}
