import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import {
  buildTestingBooleanInput,
  buildTestingSeedRequest,
} from '#modules/testing/controllers/mappers/request/testing-auth/testing_route_request_mapper'
import { ensureTestingCanonicalProficiencyLevels } from '#modules/testing/infra/testing_seed_support'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

export default class TestingDisputeSeedController {
  async seedReviewDisputeExchangeFlow({ request, response }: HttpContext): Promise<void> {
    const input = request.all()
    const { timestamp, nonce, seedKey } = buildTestingSeedRequest(input, {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const demoNames = buildTestingBooleanInput(input, 'demoNames', false)
    const ownerEmail = `seed-dispute-owner-${seedKey}@test.com`
    const revieweeEmail = `seed-dispute-reviewee-${seedKey}@test.com`

    const { org, owner } = await OrganizationFactory.createWithOwner(
      {
        name: demoNames ? 'Demo Delivery Org' : `Seed Dispute Org ${seedKey}`,
        slug: `seed-dispute-org-${seedKey}`,
      },
      {
        email: ownerEmail,
        username: demoNames
          ? `demo_owner_${seedKey.replace(/-/g, '_')}`
          : `seed_dispute_owner_${seedKey.replace(/-/g, '_')}`,
      }
    )
    const reviewee = await UserFactory.create({
      email: revieweeEmail,
      username: demoNames
        ? `demo_worker_${seedKey.replace(/-/g, '_')}`
        : `seed_dispute_reviewee_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewee.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
      name: demoNames ? 'Checkout QA' : `Seed Dispute Project ${seedKey}`,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: reviewee.id,
      project_role: 'project_member',
    })
    const sprintId = testId()
    await db.table('project_sprints').insert({
      id: sprintId,
      organization_id: org.id,
      project_id: project.id,
      name: demoNames ? 'Checkout release review sprint' : `Seed Dispute Sprint ${seedKey}`,
      goal: 'Collect checkout release evidence, peer task context, and dispute review history.',
      status: 'active',
      starts_at: DateTime.utc().minus({ days: 14 }).toSQL(),
      ends_at: DateTime.utc().minus({ hours: 3 }).toSQL(),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
      created_at: DateTime.utc().minus({ days: 14 }).toSQL(),
      updated_at: DateTime.utc().minus({ hours: 3 }).toSQL(),
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: reviewee.id,
      project_id: project.id,
      project_sprint_id: sprintId,
      status: 'done',
      title: demoNames ? 'Verify checkout release' : `Seed Dispute Task ${seedKey}`,
      description:
        'Validate checkout release readiness with regression tests, release notes, and rollback notes.',
      priority: 'high',
    })
    task.merge({
      task_type: 'feature_development',
      acceptance_criteria: [
        'Checkout regression suite passes for totals, coupons, and payment failures.',
        'Release notes explain customer-visible checkout behavior changes.',
        'Rollback notes identify owner, trigger, and recovery steps.',
        'Pull request and test output are attached before manager review.',
      ].join('\n'),
      verification_method: 'code_review',
      expected_deliverables: [
        {
          type: 'pull_request',
          label: 'Checkout regression fix',
        },
        {
          type: 'test_report',
          label: 'Passing checkout regression test output',
        },
        {
          type: 'release_notes',
          label: 'Release notes with rollback plan',
        },
      ],
      context_background:
        'Checkout release is blocked until review confirms test coverage and release communication quality.',
      impact_scope: 'end_users',
      tech_stack: ['TypeScript', 'AdonisJS', 'Svelte'],
      environment: 'staging',
      collaboration_type: 'solo',
      complexity_notes:
        'Most implementation evidence is strong, but rollback communication is partially incomplete.',
      measurable_outcomes: [
        {
          metric: 'checkout_regression_tests',
          value: 'passed_18_of_18',
        },
        {
          metric: 'release_note_rollback_detail',
          value: 'partial',
        },
      ],
      learning_objectives: ['evidence-backed release readiness', 'clear rollback communication'],
      domain_tags: ['checkout', 'release-readiness', 'dispute-review'],
      role_in_task: 'sole_contributor',
      autonomy_level: 'autonomous',
      problem_category: 'reliability',
      business_domain: 'ecommerce',
      estimated_users_affected: 1200,
    })
    await task.save()
    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: reviewee.id,
      project_id: project.id,
      project_sprint_id: sprintId,
      status: 'done',
      title: demoNames
        ? 'Verify checkout rollback notes'
        : `Seed Dispute Related Task ${seedKey}`,
      description:
        'Related sprint task used as project-level context for checkout release dispute review.',
      priority: 'medium',
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
      assignment_type: 'member',
    })
    await db.table('user_profile_snapshots').multiInsert([
      {
        id: testId(),
        user_id: owner.id,
        version: 1,
        snapshot_name: 'Seed dispute assigner profile',
        is_current: true,
        is_public: true,
        summary: JSON.stringify({ role: 'task_assigner', domain: 'checkout_release' }),
        skills_verified: JSON.stringify(['release_review', 'risk_triage']),
        work_highlights: JSON.stringify(['reviewed checkout release readiness']),
        performance_metrics: JSON.stringify({ review_turnaround_hours: 2 }),
        trust_metrics: JSON.stringify({ dispute_context_quality: 'high' }),
        scoring_version: 'seed_dispute_v1',
        created_at: DateTime.utc().minus({ days: 10 }).toSQL(),
        updated_at: DateTime.utc().minus({ hours: 3 }).toSQL(),
      },
      {
        id: testId(),
        user_id: reviewee.id,
        version: 1,
        snapshot_name: 'Seed dispute worker profile',
        is_current: true,
        is_public: true,
        summary: JSON.stringify({ role: 'task_worker', domain: 'checkout_release' }),
        skills_verified: JSON.stringify(['checkout_regression', 'release_notes']),
        work_highlights: JSON.stringify(['attached PR, tests, and release notes before review']),
        performance_metrics: JSON.stringify({ completed_checkout_tasks: 1 }),
        trust_metrics: JSON.stringify({ evidence_quality: 'strong' }),
        scoring_version: 'seed_dispute_v1',
        created_at: DateTime.utc().minus({ days: 10 }).toSQL(),
        updated_at: DateTime.utc().minus({ hours: 3 }).toSQL(),
      },
    ])
    await db.table('user_work_history').multiInsert([
      {
        id: testId(),
        user_id: owner.id,
        task_id: task.id,
        task_assignment_id: assignment.id,
        organization_id: org.id,
        project_id: project.id,
        task_title: 'Checkout release review assignment',
        task_type: 'review_dispute_context',
        business_domain: 'ecommerce',
        problem_category: 'release_readiness',
        role_in_task: 'task_assigner',
        autonomy_level: null,
        collaboration_type: 'team',
        tech_stack: JSON.stringify(['TypeScript', 'AdonisJS', 'Svelte']),
        domain_tags: JSON.stringify(['checkout', 'release-readiness']),
        difficulty: 'medium',
        estimated_hours: 3,
        actual_hours: 2,
        was_on_time: true,
        days_early_or_late: 0,
        measurable_outcomes: JSON.stringify([{ metric: 'review_feedback', value: 'submitted' }]),
        estimated_business_value: null,
        knowledge_artifacts: JSON.stringify([]),
        overall_quality_score: 4,
        skill_scores: JSON.stringify([]),
        evidence_links: JSON.stringify([]),
        is_featured: false,
        is_public: true,
        completed_at: DateTime.utc().minus({ hours: 2 }).toSQL(),
      },
      {
        id: testId(),
        user_id: reviewee.id,
        task_id: task.id,
        task_assignment_id: assignment.id,
        organization_id: org.id,
        project_id: project.id,
        task_title: 'Checkout release implementation',
        task_type: 'feature_development',
        business_domain: 'ecommerce',
        problem_category: 'reliability',
        role_in_task: 'task_worker',
        autonomy_level: 'independent',
        collaboration_type: 'solo',
        tech_stack: JSON.stringify(['TypeScript', 'AdonisJS', 'Svelte']),
        domain_tags: JSON.stringify(['checkout', 'release-readiness', 'dispute-review']),
        difficulty: 'medium',
        estimated_hours: 8,
        actual_hours: 7,
        was_on_time: true,
        days_early_or_late: -1,
        measurable_outcomes: JSON.stringify([
          { metric: 'checkout_regression_tests', value: 'passed_18_of_18' },
        ]),
        estimated_business_value: null,
        knowledge_artifacts: JSON.stringify([]),
        overall_quality_score: 4,
        skill_scores: JSON.stringify([]),
        evidence_links: JSON.stringify(['https://example.com/acme/checkout/pull/42']),
        is_featured: false,
        is_public: true,
        completed_at: DateTime.utc().minus({ hours: 5 }).toSQL(),
      },
    ])
    const reviewSession = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: 'disputed',
      creator_reviewer_id: owner.id,
      creator_review_completed: true,
      manager_review_completed: true,
      manager_reviews_count: 1,
      peer_reviews_count: 0,
      required_peer_reviews: 0,
      required_total_reviews: 1,
      minimum_manager_reviews: 1,
      minimum_peer_reviews: 0,
      completed_at: DateTime.utc().minus({ hours: 2 }),
    })

    if (buildTestingBooleanInput(input, 'verifiedWork', false)) {
      await db.table('verified_work_accomplishments').insert({
        id: testId(),
        projection_key: `seed-profile-verified:${seedKey}`,
        contract_version: 1,
        schema_version: 'suar.verified_work_accomplishment.v1',
        policy_version: 'accomplishment-policy-v1',
        user_id: reviewee.id,
        organization_id: org.id,
        project_id: project.id,
        task_id: task.id,
        task_assignment_id: assignment.id,
        title: 'Verified checkout release implementation',
        concise_statement: 'Implemented checkout regression fixes with governed review evidence.',
        detailed_statement:
          'Implemented coupon, payment retry, and checkout total recalculation fixes.',
        action: 'implement',
        object: 'checkout_release',
        task_type: 'feature_development',
        business_domain: 'ecommerce',
        problem_category: 'reliability',
        role: 'task_worker',
        ownership_level: 'primary_owner',
        autonomy_level: 'independent',
        collaboration_type: 'individual',
        environment: 'staging',
        system_area: 'checkout',
        scale_summary: '18 checkout regression scenarios',
        verification_method: 'governed_review',
        confidence_score: 0.92,
        confidence_band: 'high',
        evidence_sufficiency: 'adequate',
        lifecycle_state: 'verified',
        visibility: 'public',
        provenance_class: 'native_prework',
        project_context_version_id: null,
        work_package_version_id: null,
        task_specification_version_id: testId(),
        task_contract_version_id: testId(),
        assignment_snapshot_id: testId(),
        completion_report_id: testId(),
        review_workflow_id: reviewSession.id,
        task_specification_hash: `sha256:${'1'.repeat(64)}`,
        task_contract_hash: `sha256:${'2'.repeat(64)}`,
        assignment_snapshot_hash: `sha256:${'3'.repeat(64)}`,
        completion_report_hash: `sha256:${'4'.repeat(64)}`,
        review_hash: `sha256:${'5'.repeat(64)}`,
        canonical_hash: `sha256:${'6'.repeat(64)}`,
        canonical_payload: {},
        verified_at: DateTime.utc().minus({ hours: 1 }).toSQL(),
      })
    }
    const skill = await SkillFactory.create({
      skill_name: demoNames ? 'Checkout Release QA' : `Seed Dispute Skill ${seedKey}`,
      skill_code: `seed_dispute_checkout_${nonce.replace(/[^a-zA-Z0-9]/g, '_')}`,
      category_code: 'engineering',
    })
    const levelsByCode = await ensureTestingCanonicalProficiencyLevels()
    const taskRequiredSkillId = testId()
    await db.table('task_required_skills').insert({
      id: taskRequiredSkillId,
      task_id: task.id,
      skill_id: skill.id,
      project_skill_id: null,
      minimum_level_id: levelsByCode.get('l6') ?? null,
      target_level_id: levelsByCode.get('l8') ?? null,
      assessment_ceiling_level_id: levelsByCode.get('l10') ?? null,
      proficiency_level_id: levelsByCode.get('l6') ?? null,
      required_public_proficiency_code: 'l6',
      is_mandatory: true,
      importance: 'high',
      weight: 1.25,
      requirement_source: 'manual',
      requirement_notes:
        'Seeded dispute requirement links the task rubric to manager review and evidence.',
      rubric_version_id: null,
      source_project_professional_role_id: null,
      source_role_skill_id: null,
      created_at: DateTime.utc().minus({ hours: 8 }).toSQL(),
    })

    const submissionId = testId()
    const submissionEvidenceIds = [testId(), testId(), testId()]
    await db.table('task_submissions').insert({
      id: submissionId,
      task_assignment_id: assignment.id,
      task_id: task.id,
      submitted_by: reviewee.id,
      summary:
        'Implemented checkout regression fixes, attached passing tests, and drafted release notes.',
      implementation_notes:
        'PR fixes coupon rounding, payment retry messaging, and checkout total recalculation.',
      known_limitations:
        'Release notes include customer impact but rollback trigger detail is still partial.',
      test_notes: '18 checkout regression tests passed in staging before manager review.',
      demo_url: 'https://example.com/seed-dispute/checkout-demo',
      repository_url: 'https://example.com/acme/checkout',
      pull_request_url: 'https://example.com/acme/checkout/pull/42',
      status: 'submitted',
      submitted_at: DateTime.utc().minus({ hours: 6 }).toSQL(),
      locked_at: DateTime.utc().minus({ hours: 5, minutes: 55 }).toSQL(),
      created_at: DateTime.utc().minus({ hours: 6 }).toSQL(),
      updated_at: DateTime.utc().minus({ hours: 5, minutes: 55 }).toSQL(),
    })
    await db.table('task_submission_evidences').multiInsert([
      {
        id: submissionEvidenceIds[0],
        submission_id: submissionId,
        evidence_type: 'pull_request',
        url: 'https://example.com/acme/checkout/pull/42',
        title: 'Checkout regression pull request',
        description: 'Implementation evidence submitted before manager review.',
        uploaded_by: reviewee.id,
        created_at: DateTime.utc().minus({ hours: 5, minutes: 50 }).toSQL(),
      },
      {
        id: submissionEvidenceIds[1],
        submission_id: submissionId,
        evidence_type: 'test_report',
        url: 'https://example.com/acme/checkout/actions/runs/42',
        title: 'Checkout regression test run',
        description: 'Passing test evidence for totals, coupons, and payment failures.',
        uploaded_by: reviewee.id,
        created_at: DateTime.utc().minus({ hours: 5, minutes: 45 }).toSQL(),
      },
      {
        id: submissionEvidenceIds[2],
        submission_id: submissionId,
        evidence_type: 'document_link',
        url: 'https://example.com/acme/checkout/releases/2026-07-16',
        title: 'Checkout release notes draft',
        description:
          'Release notes include customer impact, while rollback trigger detail remains partial.',
        uploaded_by: reviewee.id,
        created_at: DateTime.utc().minus({ hours: 5, minutes: 40 }).toSQL(),
      },
    ])

    await db
      .from('review_sessions')
      .where('id', reviewSession.id)
      .update({
        overall_quality_score: 2,
        delivery_timeliness: 'on_time',
        requirement_adherence: 2,
        communication_quality: 3,
        code_quality_score: 4,
        proactiveness_score: 3,
        would_work_with_again: true,
        strengths_observed:
          'Regression fix and test evidence are strong, specific, and submitted before review.',
        areas_for_improvement:
          'Rollback communication is partial and should have been completed before release review.',
        created_at: DateTime.utc().minus({ hours: 7 }).toSQL(),
        completed_at: DateTime.utc().minus({ hours: 2 }).toSQL(),
        updated_at: DateTime.utc().minus({ hours: 2 }).toSQL(),
      })

    const skillReview = await SkillReviewFactory.create({
      review_session_id: reviewSession.id,
      reviewer_id: owner.id,
      reviewer_type: 'manager',
      skill_id: skill.id,
      assigned_public_proficiency_code: 'l5',
      comment:
        'Manager scored release QA low because rollback notes were incomplete, despite passing regression evidence.',
    })
    await db
      .from('skill_reviews')
      .where('id', skillReview.id)
      .update({
        task_required_skill_id: taskRequiredSkillId,
        proficiency_level_id: levelsByCode.get('l5') ?? null,
        observed_level_id: levelsByCode.get('l7') ?? null,
        confidence: 'medium',
        rationale:
          'Implementation evidence supports L7 technical execution, but release communication evidence is incomplete.',
        observable_behaviors: JSON.stringify([
          'attached passing checkout regression test run',
          'linked pull request before manager review',
          'left rollback trigger detail partial in release notes',
        ]),
        review_status: 'submitted',
        review_weight: 1.25,
        reviewer_skill_relevance: 'direct',
        evidence_ids: JSON.stringify(submissionEvidenceIds),
        flags: JSON.stringify([
          {
            type: 'partial_release_notes',
            severity: 'medium',
          },
        ]),
        submitted_at: DateTime.utc().minus({ hours: 2 }).toSQL(),
        updated_at: DateTime.utc().minus({ hours: 2 }).toSQL(),
      })

    const disputeId = testId()
    await db.table('review_disputes').insert({
      id: disputeId,
      review_session_id: reviewSession.id,
      task_assignment_id: assignment.id,
      task_id: task.id,
      reviewee_id: reviewee.id,
      opened_by: reviewee.id,
      status: 'collecting_evidence',
      dispute_reason:
        'Manager score treated the whole checkout release as weak even though PR and tests were submitted on time. Reviewee accepts rollback notes were partial, but asks admin to adjust score or request a focused re-review.',
      disputed_dimensions: JSON.stringify({
        requirement_adherence: true,
        code_quality_score: true,
        evidence: true,
      }),
      disputed_skill_reviews: JSON.stringify([
        {
          skill_review_id: skillReview.id,
          skill_id: skill.id,
          task_required_skill_id: taskRequiredSkillId,
          claimed_issue:
            'score does not separate strong test evidence from partial release notes',
        },
      ]),
      requested_outcome: 'adjust_score',
      created_at: DateTime.utc().minus({ hours: 1 }).toSQL(),
      updated_at: DateTime.utc().minus({ hours: 1 }).toSQL(),
    })

    await db.table('task_comments').multiInsert([
      {
        id: testId(),
        task_id: task.id,
        author_id: reviewee.id,
        body: 'Submission ready: PR, checkout regression test run, and release notes draft are attached.',
        comment_type: 'status_update',
        visibility: 'internal',
        review_relevance: true,
        created_at: DateTime.utc().minus({ hours: 5 }).toSQL(),
        updated_at: DateTime.utc().minus({ hours: 5 }).toSQL(),
      },
      {
        id: testId(),
        task_id: task.id,
        author_id: owner.id,
        body: 'Please add rollback trigger detail before review closes; tests and PR evidence are visible.',
        comment_type: 'review_note',
        visibility: 'reviewers_only',
        review_relevance: true,
        created_at: DateTime.utc().minus({ hours: 4 }).toSQL(),
        updated_at: DateTime.utc().minus({ hours: 4 }).toSQL(),
      },
    ])

    await db.table('review_dispute_comments').multiInsert([
      {
        id: testId(),
        dispute_id: disputeId,
        author_id: reviewee.id,
        body: 'I dispute the L5 score. The PR and passing regression evidence were attached before the deadline.',
        visibility: 'all_parties',
        created_at: DateTime.utc().minus({ minutes: 55 }).toSQL(),
        updated_at: DateTime.utc().minus({ minutes: 55 }).toSQL(),
      },
      {
        id: testId(),
        dispute_id: disputeId,
        author_id: owner.id,
        body: 'Reviewer side acknowledges the PR and tests, but the rollback section was incomplete at review time.',
        visibility: 'all_parties',
        created_at: DateTime.utc().minus({ minutes: 45 }).toSQL(),
        updated_at: DateTime.utc().minus({ minutes: 45 }).toSQL(),
      },
    ])

    await db.table('review_dispute_evidences').multiInsert([
      {
        id: testId(),
        dispute_id: disputeId,
        uploaded_by: reviewee.id,
        evidence_type: 'pull_request',
        url: 'https://example.com/acme/checkout/pull/42',
        title: 'Checkout regression pull request',
        description: 'Dispute evidence showing implementation was submitted before review.',
        created_at: DateTime.utc().minus({ minutes: 35 }).toSQL(),
      },
      {
        id: testId(),
        dispute_id: disputeId,
        uploaded_by: reviewee.id,
        evidence_type: 'test_report',
        url: 'https://example.com/acme/checkout/actions/runs/42',
        title: 'Checkout regression test run',
        description: 'Dispute evidence showing checkout regression tests passed before review.',
        created_at: DateTime.utc().minus({ minutes: 30 }).toSQL(),
      },
    ])

    response.json(
      wrapApiV1Data({
        organizationId: org.id,
        projectId: project.id,
        sprintId,
        taskId: task.id,
        assignmentId: assignment.id,
        reviewSessionId: reviewSession.id,
        taskRequiredSkillId,
        submissionId,
        submissionEvidenceIds,
        skillReviewId: skillReview.id,
        skillId: skill.id,
        disputeId,
        ownerEmail,
        revieweeEmail,
        ownerId: owner.id,
        revieweeId: reviewee.id,
        timestamp,
      })
    )
  }
}
