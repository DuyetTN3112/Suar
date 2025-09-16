import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { SEED_REVIEW_SESSION_SPECS } from './review_specs.js'
import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere, findRow } from './seed_utils.js'
import type {
  OrgKey,
  SeededAssignment,
  SeededOrg,
  SeededTask,
  SeededUser,
  UserKey,
} from './types.js'

export async function seedReviewData(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  tasks: Record<string, SeededTask>,
  assignments: Record<string, SeededAssignment>,
  skills: Record<string, string>,
  organizations: Record<OrgKey, SeededOrg>
): Promise<void> {
  const sessionSpecs = SEED_REVIEW_SESSION_SPECS
  const flaggedReviewTargets: string[] = []

  for (const spec of sessionSpecs) {
    const assignment = runtime.requireValue(assignments[spec.key], `assignment:${spec.key}`)
    const task = runtime.requireValue(tasks[spec.key], `task-review:${spec.key}`)
    const existing = await trx
      .from('review_sessions')
      .where('task_assignment_id', assignment.id)
      .where('reviewee_id', assignment.assigneeId)
      .first() as { id: string } | null
    const sessionId = existing?.id ?? runtime.uuid()
    const payload = {
      task_assignment_id: assignment.id,
      reviewee_id: assignment.assigneeId,
      status: spec.sessionStatus,
      manager_review_completed: true,
      peer_reviews_count: spec.skills.filter((item) => item.reviewerType === 'peer').length,
      required_peer_reviews: 1,
      completed_at: spec.sessionStatus === 'completed' ? runtime.isoDaysAgo(2) : null,
      deadline: runtime.isoDaysAgo(1),
      confirmations: runtime.toJson([
        {
          user_id: assignment.assigneeId,
          action: spec.confirmationAction,
          dispute_reason: spec.confirmationAction === 'disputed' ? spec.disputeReason : null,
          created_at: runtime.isoDaysAgo(2),
        },
      ]),
      overall_quality_score: spec.overall,
      delivery_timeliness: spec.delivery,
      requirement_adherence: spec.requirement,
      communication_quality: spec.communication,
      code_quality_score: spec.codeQuality,
      proactiveness_score: spec.proactive,
      would_work_with_again: true,
      strengths_observed: spec.strengths,
      areas_for_improvement: spec.improvements,
      created_at: runtime.isoDaysAgo(3),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await trx.from('review_sessions').where('id', sessionId).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('review_sessions')
        .insert({ id: sessionId, ...payload })
    }

    for (const skillReview of spec.skills) {
      const skillId = runtime.requireValue(
        skills[skillReview.skill],
        `review-skill:${skillReview.skill}`
      )
      const where = {
        review_session_id: sessionId,
        reviewer_id: users[skillReview.reviewer].id,
        skill_id: skillId,
      }
      const existingSkillReview = await findRow(trx, 'skill_reviews', where)
      const existingSkillReviewId = existingSkillReview?.id
      const skillReviewId =
        typeof existingSkillReviewId === 'string' ? existingSkillReviewId : runtime.uuid()
      const skillPayload = {
        reviewer_type: skillReview.reviewerType,
        assigned_level_code: skillReview.level,
        comment: skillReview.comment,
        created_at: runtime.isoDaysAgo(2),
        updated_at: runtime.isoDaysAgo(1),
      }

      if (existingSkillReview) {
        await applyWhere(trx.from('skill_reviews'), where).update(skillPayload)
      } else {
        await trx
          .insertQuery()
          .table('skill_reviews')
          .insert({ id: skillReviewId, ...where, ...skillPayload })
      }

      if (
        (spec.key === 'member-profile-proof' && skillReview.skill === 'testing') ||
        (spec.key === 'orgc-marketplace-ranking' && skillReview.skill === 'postgresql')
      ) {
        flaggedReviewTargets.push(skillReviewId)
      }
    }

    const assessmentWhere = {
      task_assignment_id: assignment.id,
      user_id: assignment.assigneeId,
    }
    const existingAssessment = await findRow(trx, 'task_self_assessments', assessmentWhere)
    const assessmentPayload = {
      overall_satisfaction: spec.selfSatisfaction,
      difficulty_felt: 'as_expected',
      confidence_level: 4,
      what_went_well: spec.strengths,
      what_would_do_different: spec.improvements,
      blockers_encountered: runtime.toJson([
        'Không có blocker nghiêm trọng trong môi trường seed local',
      ]),
      skills_felt_lacking: runtime.toJson(['automation']),
      skills_felt_strong: runtime.toJson(['communication', 'problem solving']),
      submitted_at: runtime.isoDaysAgo(2),
      created_at: runtime.isoDaysAgo(2),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existingAssessment) {
      await applyWhere(trx.from('task_self_assessments'), assessmentWhere).update(
        assessmentPayload
      )
    } else {
      await trx
        .insertQuery()
        .table('task_self_assessments')
        .insert({ id: runtime.uuid(), ...assessmentWhere, ...assessmentPayload })
    }

    const evidenceRows = [
      {
        evidence_type: 'pull_request',
        url: runtime.seedPullRequestUrl(spec.key),
        title: `${task.title} - Pull Request`,
      },
      {
        evidence_type: 'demo_recording',
        url: `https://demo.local/${spec.key}`,
        title: `${task.title} - Demo`,
      },
    ] as const

    for (const evidence of evidenceRows) {
      const where = {
        review_session_id: sessionId,
        title: evidence.title,
      }
      const existingEvidence = await findRow(trx, 'review_evidences', where)
      const payloadEvidence = {
        evidence_type: evidence.evidence_type,
        url: evidence.url,
        description: `Seeded ${evidence.evidence_type} for ${task.title}`,
        uploaded_by: users.orgAdmin.id,
        created_at: runtime.isoDaysAgo(2),
        updated_at: runtime.isoDaysAgo(1),
      }

      if (existingEvidence) {
        await applyWhere(trx.from('review_evidences'), where).update(payloadEvidence)
      } else {
        await trx
          .insertQuery()
          .table('review_evidences')
          .insert({
            id: runtime.uuid(),
            review_session_id: sessionId,
            ...payloadEvidence,
            title: evidence.title,
          })
      }
    }

    if (spec.key.startsWith('member-')) {
      const reverseWhere = {
        review_session_id: sessionId,
        reviewer_id: assignment.assigneeId,
        target_type: 'organization',
        target_id: organizations.orgA.id,
      }
      const existingReverse = await findRow(trx, 'reverse_reviews', reverseWhere)
      const reversePayload = {
        rating: 4,
        comment: 'Tổ chức hỗ trợ tốt, quy trình review rõ ràng và phản hồi nhanh.',
        is_anonymous: false,
        created_at: runtime.isoDaysAgo(1),
      }

      if (existingReverse) {
        await applyWhere(trx.from('reverse_reviews'), reverseWhere).update(reversePayload)
      } else {
        await trx
          .insertQuery()
          .table('reverse_reviews')
          .insert({ id: runtime.uuid(), ...reverseWhere, ...reversePayload })
      }
    }
  }

  for (const [index, skillReviewId] of flaggedReviewTargets.entries()) {
    const where = {
      skill_review_id: skillReviewId,
      flag_type: 'frequency_anomaly',
    }
    const existing = await findRow(trx, 'flagged_reviews', where)
    const isReviewedScenario = index === 1
    const payload = {
      severity: 'high',
      detected_at: runtime.isoDaysAgo(1),
      status: isReviewedScenario ? 'dismissed' : 'pending',
      reviewed_by: isReviewedScenario ? users.superadmin.id : null,
      reviewed_at: isReviewedScenario ? runtime.isoDaysAgo(0) : null,
      notes: isReviewedScenario
        ? 'Seeded moderated review case already resolved by superadmin.'
        : 'Seeded flagged review for admin moderation page.',
      created_at: runtime.isoDaysAgo(1),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await applyWhere(trx.from('flagged_reviews'), where).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('flagged_reviews')
        .insert({ id: runtime.uuid(), ...where, ...payload })
    }
  }
}
