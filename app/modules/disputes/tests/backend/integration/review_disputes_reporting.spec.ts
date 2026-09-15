import { test } from '@japa/runner'

import {
  BACKEND_NOTIFICATION_TYPES,
  configureReviewDisputesTestGroup,
  createDisputeScenario,
  createUserProfileAndHistory,
  db,
  LucidReviewDisputeCaseFileUnitOfWork,
  type NotificationFanoutStagerContract,
  parseSnapshot,
  recordArray,
  ReportReviewDisputeCommand,
  TaskFactory,
  testId,
} from './support/review_disputes_test_support.js'

test.group('Integration | Review disputes reporting workflows and escalation', (group) => {
  configureReviewDisputesTestGroup(group)

  test('reviewee can report dispute to admin and admin receives escalation notification', async ({
    client,
  }) => {
    const { reviewee, disputeId } = await createDisputeScenario()
    await reviewee.refresh()

    const response = await client
      .post(`/api/reviews/disputes/${disputeId}/report`)
      .loginAs(reviewee)
      .json({
        escalationReason: 'Need system admin decision',
      })

    response.assertStatus(409)
  })

  test('reviewee can report dispute to admin after real two-side exchange and admin receives escalation notification', async ({
    assert,
    client,
  }) => {
    const { superadmin, org, owner, reviewee, disputeId, task, assignment, sprintId } =
      await createDisputeScenario()
    if (!task.project_id) {
      throw new Error('Dispute scenario task must belong to a project')
    }
    const projectId = task.project_id

    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: reviewee.id,
      project_id: projectId,
      project_sprint_id: sprintId,
      title: 'Related task in same sprint',
    })
    await createUserProfileAndHistory({
      userId: owner.id,
      taskId: task.id,
      assignmentId: assignment.id,
      organizationId: org.id,
      projectId,
      role: 'task_assigner',
    })
    await createUserProfileAndHistory({
      userId: reviewee.id,
      taskId: task.id,
      assignmentId: assignment.id,
      organizationId: org.id,
      projectId,
      role: 'task_worker',
    })

    const taskCommentResponse = await client
      .post(`/api/tasks/${task.id}/comments`)
      .loginAs(reviewee)
      .json({
        body: 'Task comment should travel with admin dossier.',
        commentType: 'review_note',
        visibility: 'internal',
        reviewRelevance: true,
      })

    taskCommentResponse.assertStatus(201)

    const submissionId = testId()
    await db.table('task_submissions').insert({
      id: submissionId,
      task_assignment_id: assignment.id,
      task_id: task.id,
      submitted_by: reviewee.id,
      summary: 'Submission before admin escalation',
      status: 'submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await db.table('task_submission_evidences').insert({
      id: testId(),
      submission_id: submissionId,
      evidence_type: 'pull_request',
      url: 'https://example.com/dispute-dossier-proof',
      title: 'Submission-only proof',
      description: 'Submission evidence that is not the dispute-room evidence',
      uploaded_by: reviewee.id,
      created_at: new Date().toISOString(),
    })

    const commentResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(reviewee)
      .json({
        body: 'I disagree with this review because evidence was missed.',
        visibility: 'all_parties',
      })

    commentResponse.assertStatus(201)

    const respondResponse = await client
      .post(`/api/v1/me/organizations/current/reviews/disputes/${disputeId}/respond`)
      .loginAs(owner)
      .json({
        body: 'Organization reviewer side responds with additional context.',
        visibility: 'all_parties',
      })

    respondResponse.assertStatus(201)

    const evidenceResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/evidences`)
      .loginAs(reviewee)
      .json({
        evidenceType: 'pull_request',
        url: 'https://example.com/dispute-room-proof?token=should-not-leak',
        title: 'Dispute room proof',
        description: 'Evidence uploaded directly to the review dispute.',
      })

    evidenceResponse.assertStatus(201)

    const response = await client
      .post(`/api/reviews/disputes/${disputeId}/report`)
      .loginAs(reviewee)
      .json({
        escalationReason: 'Need system admin decision',
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        id: string
        status: string
      }
    }

    const refreshed = (await db.from('review_disputes').where('id', disputeId).first()) as {
      status: string
      escalation_reason: string | null
    } | null
    const caseFiles = (await db
      .from('review_dispute_case_files')
      .where('dispute_id', disputeId)
      .orderBy('case_version', 'desc')
      .select(
        'id',
        'case_version',
        'completeness_score',
        'task_snapshot',
        'task_comments_snapshot',
        'evidences_snapshot',
        'reviewer_context_snapshot',
        'reviewee_profile_context_snapshot',
        'dispute_claim_snapshot'
      )) as Array<{
      id: string
      case_version: number
      completeness_score: number
      task_snapshot: unknown
      task_comments_snapshot: unknown
      evidences_snapshot: unknown
      reviewer_context_snapshot: unknown
      reviewee_profile_context_snapshot: unknown
      dispute_claim_snapshot: unknown
    }>
    const adminNotifications = (await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('target.recipient_id', superadmin.id)
      .where('job.notification_type', BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED)
      .select('target.id')) as Array<{ id: string }>

    assert.equal(body.data.id, disputeId)
    assert.equal(body.data.status, 'admin_reviewing')
    assert.equal(refreshed?.status, 'admin_reviewing')
    assert.equal(refreshed?.escalation_reason, 'Need system admin decision')
    assert.lengthOf(caseFiles, 1)
    assert.equal(caseFiles[0]?.case_version, 1)
    assert.isAtLeast(caseFiles[0]?.completeness_score ?? 0, 0)
    const aiEvaluation = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', 'review_dispute')
      .where('source_id', disputeId)
      .firstOrFail()) as Record<string, unknown>
    const aiPayload = parseSnapshot(aiEvaluation['request_payload'])
    assert.equal(aiEvaluation['provider'], 'clawagent')
    assert.equal(aiEvaluation['status'], 'queued')
    assert.equal(aiEvaluation['case_file_id'], caseFiles[0]?.id)
    assert.equal(aiPayload['schema_version'], 'suar_ai_dispute_package_v1')
    const disputeClaimSnapshot = caseFiles[0]?.dispute_claim_snapshot
    const disputeClaimText =
      typeof disputeClaimSnapshot === 'string'
        ? disputeClaimSnapshot
        : JSON.stringify(disputeClaimSnapshot ?? {})
    const taskCommentsText =
      typeof caseFiles[0]?.task_comments_snapshot === 'string'
        ? caseFiles[0].task_comments_snapshot
        : JSON.stringify(caseFiles[0]?.task_comments_snapshot ?? {})
    const evidencesText =
      typeof caseFiles[0]?.evidences_snapshot === 'string'
        ? caseFiles[0].evidences_snapshot
        : JSON.stringify(caseFiles[0]?.evidences_snapshot ?? {})
    assert.include(disputeClaimText, 'adjust_score')
    assert.include(disputeClaimText, 'I disagree with this review because evidence was missed.')
    assert.include(taskCommentsText, 'Task comment should travel with admin dossier.')
    assert.include(evidencesText, 'Dispute room proof')
    const taskSnapshot = parseSnapshot(caseFiles[0]?.task_snapshot)
    const reviewerContext = parseSnapshot(caseFiles[0]?.reviewer_context_snapshot)
    const revieweeContext = parseSnapshot(caseFiles[0]?.reviewee_profile_context_snapshot)
    assert.equal((taskSnapshot['organization'] as Record<string, unknown>)['id'], org.id)
    assert.equal((taskSnapshot['project'] as Record<string, unknown>)['id'], projectId)
    assert.include(
      recordArray(taskSnapshot['related_project_tasks']).map(
        (relatedTask: Record<string, unknown>) => relatedTask['title']
      ),
      'Related task in same sprint'
    )
    assert.include(
      recordArray(taskSnapshot['sprint_peer_tasks']).map(
        (peerTask: Record<string, unknown>) => peerTask['title']
      ),
      'Related task in same sprint'
    )
    assert.equal(
      ((reviewerContext['profile'] as Record<string, unknown>)['summary'] as Record<
        string,
        unknown
      >)['role'],
      'task_assigner'
    )
    assert.equal(
      ((revieweeContext['profile'] as Record<string, unknown>)['summary'] as Record<
        string,
        unknown
      >)['role'],
      'task_worker'
    )
    assert.include(
      recordArray(reviewerContext['task_history']).map(
        (history: Record<string, unknown>) => history['role_in_task']
      ),
      'task_assigner'
    )
    assert.include(
      recordArray(revieweeContext['task_history']).map(
        (history: Record<string, unknown>) => history['role_in_task']
      ),
      'task_worker'
    )
    assert.lengthOf(adminNotifications, 1)
  })

  test('duplicate dispute report is rejected without duplicating case files or notifications', async ({
    assert,
    client,
  }) => {
    const { superadmin, owner, reviewee, disputeId } = await createDisputeScenario()

    const commentResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(reviewee)
      .json({
        body: 'Reviewee side has already made a report-ready claim.',
        visibility: 'all_parties',
      })

    commentResponse.assertStatus(201)

    const respondResponse = await client
      .post(`/api/v1/me/organizations/current/reviews/disputes/${disputeId}/respond`)
      .loginAs(owner)
      .json({
        body: 'Counterparty side has already responded before escalation.',
        visibility: 'all_parties',
      })

    respondResponse.assertStatus(201)

    const firstResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/report`)
      .loginAs(reviewee)
      .json({
        escalationReason: 'Need admin decision once',
      })

    firstResponse.assertStatus(200)

    const beforeDuplicateDispute = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .select('status', 'reported_to_admin_at', 'reported_to_admin_by', 'escalation_reason')
      .firstOrFail()) as {
      status: string
      reported_to_admin_at: string
      reported_to_admin_by: string
      escalation_reason: string
    }
    const beforeDuplicateCaseFiles = await db
      .from('review_dispute_case_files')
      .where('dispute_id', disputeId)
    const beforeDuplicateAdminNotifications = await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('target.recipient_id', superadmin.id)
      .where('job.notification_type', BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED)
    const beforeDuplicateRevieweeNotifications = await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('target.recipient_id', reviewee.id)
      .where('job.notification_type', BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED)

    const duplicateResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/report`)
      .loginAs(reviewee)
      .json({
        escalationReason: 'Need admin decision twice',
      })

    duplicateResponse.assertStatus(409)
    assert.notInclude(duplicateResponse.text(), 'E_INTERNAL_ERROR')

    const afterDuplicateDispute = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .select('status', 'reported_to_admin_at', 'reported_to_admin_by', 'escalation_reason')
      .firstOrFail()) as {
      status: string
      reported_to_admin_at: string
      reported_to_admin_by: string
      escalation_reason: string
    }
    const afterDuplicateCaseFiles = await db
      .from('review_dispute_case_files')
      .where('dispute_id', disputeId)
    const afterDuplicateAdminNotifications = await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('target.recipient_id', superadmin.id)
      .where('job.notification_type', BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED)
    const afterDuplicateRevieweeNotifications = await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('target.recipient_id', reviewee.id)
      .where('job.notification_type', BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED)

    assert.deepEqual(afterDuplicateDispute, beforeDuplicateDispute)
    assert.lengthOf(afterDuplicateCaseFiles, beforeDuplicateCaseFiles.length)
    assert.lengthOf(afterDuplicateAdminNotifications, beforeDuplicateAdminNotifications.length)
    assert.lengthOf(
      afterDuplicateRevieweeNotifications,
      beforeDuplicateRevieweeNotifications.length
    )
    assert.lengthOf(afterDuplicateCaseFiles, 1)
    assert.lengthOf(afterDuplicateAdminNotifications, 1)
    assert.lengthOf(afterDuplicateRevieweeNotifications, 1)
  })

  test('report rollback removes dispute, case-file, and audit mutations when fanout fails', async ({
    assert,
    client,
  }) => {
    const { org, owner, reviewee, disputeId } = await createDisputeScenario()
    const revieweeComment = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(reviewee)
      .json({
        body: 'Reviewee has a report-ready claim.',
        visibility: 'all_parties',
      })
    revieweeComment.assertStatus(201)
    const counterpartyComment = await client
      .post(`/api/v1/me/organizations/current/reviews/disputes/${disputeId}/respond`)
      .loginAs(owner)
      .json({
        body: 'Counterparty has replied before escalation.',
        visibility: 'all_parties',
      })
    counterpartyComment.assertStatus(201)
    const failingFanout: NotificationFanoutStagerContract = {
      stage: () => Promise.reject(new Error('simulated dispute fanout failure')),
    }
    const statusBeforeReport = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .select('status')
      .first()) as { status: string }

    await assert.rejects(
      () =>
        new ReportReviewDisputeCommand(
          {
            userId: reviewee.id,
            organizationId: org.id,
            ip: '127.0.0.1',
            userAgent: 'dispute-atomicity-test',
          },
          new LucidReviewDisputeCaseFileUnitOfWork(failingFanout)
        ).execute({
          dispute_id: disputeId,
          escalation_reason: 'This transaction must roll back',
        }),
      /simulated dispute fanout failure/
    )

    const dispute = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .select('status', 'reported_to_admin_at')
      .first()) as { status: string; reported_to_admin_at: Date | null }
    assert.equal(dispute.status, statusBeforeReport.status)
    assert.isNull(dispute.reported_to_admin_at)
    assert.lengthOf(
      await db.from('review_dispute_case_files').where('dispute_id', disputeId),
      0
    )
    assert.lengthOf(
      await db
        .from('audit_events')
        .where('entity_type', 'review_dispute')
        .where('entity_id', disputeId)
        .whereIn('action', [
          'report_review_dispute',
          'build_review_dispute_case_file',
        ]),
      0
    )
  })
})
