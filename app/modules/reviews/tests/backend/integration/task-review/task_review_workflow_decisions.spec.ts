import { test } from '@japa/runner'

import {
  AcceptTaskReviewCommand,
  buildDoneTaskBoardScenario,
  completedAssignmentId,
  confirmationDisputes,
  configureTaskReviewBoardTestGroup,
  db,
  listAssignmentDeliverySourceRows,
  makeEnsureTaskReviewWorkflowCommand,
  makeRespondToTaskReviewCommand,
  makeSubmitTaskReviewCommand,
  parseJsonValue,
  requireFixtureRow,
  type ReviewConfirmationEntry,
  ReviewSessionFactory,
  SkillFactory,
  type TaskReviewWorkflowFixtureRow,
} from '../support/task_review_board_test_support.js'

test.group('Integration | Task Review Board - Workflow Decisions & Consensus', (group) => {
  configureTaskReviewBoardTestGroup(group)

  test('two submitted reviews move workflow to awaiting response and acceptance completes it', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const workflow = await makeEnsureTaskReviewWorkflowCommand({
      userId: scenario.viewer.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      taskId: scenario.otherDoneTask.id,
      taskAssignmentId: await completedAssignmentId(scenario.otherDoneTask.id),
    })

    await makeSubmitTaskReviewCommand({
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      body: 'Task giver review: accepted with notes',
    })

    let row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(row.status, 'in_review')
    assert.equal(Number(row.completed_review_count), 1)
    const revieweeId = scenario.otherDoneTask.assigned_to
    if (!revieweeId) throw new Error('Expected review task assignee')
    const firstReviewNotification = (await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('job.source_event_name', 'task_review.review_submitted')
      .where('target.recipient_id', revieweeId)
      .select('job.parameters')
      .firstOrFail()) as { parameters: unknown }
    assert.equal(
      parseJsonValue(firstReviewNotification.parameters)['reviewEvent'],
      'review_submitted'
    )

    await makeSubmitTaskReviewCommand({
      userId: scenario.projectManager.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      body: 'Project member review: accepted with notes',
    })

    row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(row.status, 'awaiting_response')
    assert.equal(Number(row.completed_review_count), 2)
    assert.lengthOf(
      await listAssignmentDeliverySourceRows(scenario.otherAssignee.id),
      0,
      'review progress must not affect delivery metrics before the workflow is Done'
    )

    const reviewMessages = (await db
      .from('task_review_messages')
      .where('workflow_id', workflow.workflowId)
      .where('message_type', 'review')
      .select('id', 'author_id')) as Array<{ id: string; author_id: string }>
    const revieweeContext = {
      userId: scenario.otherDoneTask.assigned_to,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }
    const firstReview = requireFixtureRow(reviewMessages[0], 'first submitted review')
    const secondReview = requireFixtureRow(
      reviewMessages.find((message) => message.author_id === scenario.projectManager.id),
      'project member review'
    )
    const completionFanout = (await db
      .from('notification_fanout_jobs')
      .where('source_event_name', 'task_review.reviews_complete')
      .where('business_event_id', `${workflow.workflowId}:reviews-complete:${secondReview.id}`)
      .select('id', 'parameters')
      .firstOrFail()) as { id: string; parameters: unknown }
    assert.exists(completionFanout.id)
    assert.equal(parseJsonValue(completionFanout.parameters)['reviewMessageId'], secondReview.id)
    await makeRespondToTaskReviewCommand(revieweeContext).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: firstReview.id,
      body: 'Response to this review.',
    })
    const firstResponse = (await db
      .from('task_review_messages')
      .where('workflow_id', workflow.workflowId)
      .where('parent_review_message_id', firstReview.id)
      .where('message_type', 'reviewee_response')
      .select('id', 'body')
      .firstOrFail()) as { id: string; body: string }
    await makeRespondToTaskReviewCommand(revieweeContext).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: firstReview.id,
      responseMessageId: firstResponse.id,
      body: 'Updated response to this review.',
    })
    const responseRevisions = (await db
      .from('task_review_message_revisions')
      .where('message_id', firstResponse.id)
      .orderBy('revision_number', 'asc')
      .select('body')) as Array<{ body: string }>
    assert.deepEqual(
      responseRevisions.map((revision) => revision.body),
      ['Response to this review.', 'Updated response to this review.']
    )
    await new AcceptTaskReviewCommand(
      {
        ...revieweeContext,
        userId: firstReview.author_id,
      },
      confirmationDisputes
    ).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: firstReview.id,
      decision: 'accepted',
    })
    let firstReviewAfterReviewerAgreement = (await db
      .from('task_review_messages')
      .where('id', firstReview.id)
      .select('reviewee_decision', 'reviewer_agreed_at')
      .firstOrFail()) as { reviewee_decision: string | null; reviewer_agreed_at: Date | null }
    assert.isNull(firstReviewAfterReviewerAgreement.reviewee_decision)
    assert.isNotNull(firstReviewAfterReviewerAgreement.reviewer_agreed_at)
    await new AcceptTaskReviewCommand(revieweeContext, confirmationDisputes).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: firstReview.id,
      decision: 'accepted',
    })
    firstReviewAfterReviewerAgreement = (await db
      .from('task_review_messages')
      .where('id', firstReview.id)
      .select('reviewee_decision', 'reviewer_agreed_at')
      .firstOrFail()) as { reviewee_decision: string | null; reviewer_agreed_at: Date | null }
    assert.equal(firstReviewAfterReviewerAgreement.reviewee_decision, 'accepted')
    assert.isNotNull(firstReviewAfterReviewerAgreement.reviewer_agreed_at)
    row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(row.status, 'awaiting_response')
    await makeRespondToTaskReviewCommand(revieweeContext).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: secondReview.id,
      body: 'Response to this review.',
    })
    await new AcceptTaskReviewCommand(revieweeContext, confirmationDisputes).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: secondReview.id,
      decision: 'accepted',
    })
    await new AcceptTaskReviewCommand(
      {
        ...revieweeContext,
        userId: secondReview.author_id,
      },
      confirmationDisputes
    ).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: secondReview.id,
      decision: 'accepted',
    })
    row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(row.status, 'done')
    assert.isNotNull(row.accepted_by_reviewee_at)
    assert.isNotNull(row.completed_at)

    const finalizationOutbox = (await db
      .from('domain_event_outbox')
      .where('event_name', 'task-review:finalized')
      .where('aggregate_id', workflow.workflowId)
      .firstOrFail()) as {
      aggregate_type: string
      payload: {
        workflowId: string
        taskId: string
        revieweeId: string
        finalizationSource: string
      }
    }
    assert.equal(finalizationOutbox.aggregate_type, 'task_review_workflow')
    assert.equal(finalizationOutbox.payload.workflowId, workflow.workflowId)
    assert.equal(finalizationOutbox.payload.taskId, scenario.otherDoneTask.id)
    assert.equal(finalizationOutbox.payload.revieweeId, scenario.otherDoneTask.assigned_to)
    assert.equal(finalizationOutbox.payload.finalizationSource, 'consensus')
    const profileEligibleAssignments = await listAssignmentDeliverySourceRows(
      scenario.otherAssignee.id
    )
    assert.deepEqual(
      profileEligibleAssignments.map((assignment) => assignment.assignment_id),
      [await completedAssignmentId(scenario.otherDoneTask.id)]
    )
  })

  test('reviewee acceptance stages review-confirmed scoring event for completed legacy session', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const assignment = (await db
      .from('task_assignments')
      .where('task_id', scenario.otherDoneTask.id)
      .where('assignee_id', scenario.otherAssignee.id)
      .firstOrFail()) as { id: string }
    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: scenario.otherAssignee.id,
      status: 'completed',
      manager_review_completed: true,
      creator_reviewer_id: scenario.owner.id,
      creator_review_completed: true,
      manager_reviews_count: 1,
      peer_reviews_count: 1,
      required_peer_reviews: 1,
      required_total_reviews: 2,
      minimum_manager_reviews: 1,
      minimum_peer_reviews: 1,
    })
    const skill = await SkillFactory.create({ skill_name: 'Task review scoring skill' })
    const [skillReview] = (await db
      .table('skill_reviews')
      .insert({
        review_session_id: session.id,
        reviewer_id: scenario.owner.id,
        reviewer_type: 'manager',
        skill_id: skill.id,
        assigned_public_proficiency_code: 'l7',
        review_status: 'submitted',
        is_fraud: false,
      })
      .returning('id')) as Array<{ id: string }>
    const [evidence] = (await db
      .table('review_evidences')
      .insert({
        review_session_id: session.id,
        evidence_type: 'pull_request',
        url: 'https://example.test/task-review-scoring',
        title: 'Task review scoring evidence',
        uploaded_by: scenario.owner.id,
        verification_status: 'pending',
        is_sensitive: false,
      })
      .returning('id')) as Array<{ id: string }>
    if (!skillReview || !evidence) {
      throw new Error('Expected review scoring fixtures')
    }
    await db.table('skill_review_evidence_links').insert({
      skill_review_id: skillReview.id,
      review_evidence_id: evidence.id,
      relevance_type: 'direct_observation',
      reviewer_note: 'Accepted workflow should publish this evidence',
    })

    const workflow = await makeEnsureTaskReviewWorkflowCommand({
      userId: scenario.viewer.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      taskId: scenario.otherDoneTask.id,
      taskAssignmentId: await completedAssignmentId(scenario.otherDoneTask.id),
    })
    await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .update({ status: 'awaiting_response', completed_review_count: workflow.requiredReviewCount })
    const [insertedReviewMessage] = (await db
      .table('task_review_messages')
      .insert({
        workflow_id: workflow.workflowId,
        author_id: scenario.owner.id,
        message_type: 'review',
        body: 'Review accepted by reviewee.',
      })
      .returning('id')) as Array<{ id: string }>
    const reviewMessage = requireFixtureRow(insertedReviewMessage, 'review message')
    await db.table('task_review_messages').insert({
      workflow_id: workflow.workflowId,
      author_id: scenario.otherAssignee.id,
      parent_review_message_id: reviewMessage.id,
      message_type: 'reviewee_response',
      body: 'Acknowledged.',
    })

    await new AcceptTaskReviewCommand(
      {
        userId: scenario.otherAssignee.id,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: null,
      },
      confirmationDisputes
    ).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: reviewMessage.id,
      decision: 'rejected',
    })
    const disputedWorkflow = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .select('status')
      .firstOrFail()) as { status: string }
    assert.equal(disputedWorkflow.status, 'disputed')

    await new AcceptTaskReviewCommand(
      {
        userId: scenario.otherAssignee.id,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: null,
      },
      confirmationDisputes
    ).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: reviewMessage.id,
      decision: 'accepted',
    })
    const awaitingReviewerConfirmation = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .select('status')
      .firstOrFail()) as { status: string }
    assert.equal(awaitingReviewerConfirmation.status, 'disputed')

    await new AcceptTaskReviewCommand(
      {
        userId: scenario.owner.id,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: null,
      },
      confirmationDisputes
    ).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: reviewMessage.id,
      decision: 'accepted',
    })

    const outbox = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .firstOrFail()) as {
      payload: {
        confirmationId: string
        reviewSessionId: string
        revieweeId: string
        reviewerIds: string[]
        confirmedBy: string
        action: string
      }
    }
    const updatedSession = (await db
      .from('review_sessions')
      .where('id', session.id)
      .select('confirmations')
      .firstOrFail()) as { confirmations: ReviewConfirmationEntry[] | string | null }
    const evidenceRow = (await db
      .from('review_evidences')
      .where('id', evidence.id)
      .select('verification_status')
      .firstOrFail()) as { verification_status: string | null }
    const confirmations =
      typeof updatedSession.confirmations === 'string'
        ? (JSON.parse(updatedSession.confirmations) as ReviewConfirmationEntry[])
        : (updatedSession.confirmations ?? [])

    assert.equal(outbox.payload.reviewSessionId, session.id)
    assert.equal(outbox.payload.revieweeId, scenario.otherAssignee.id)
    assert.deepEqual(outbox.payload.reviewerIds, [scenario.owner.id])
    assert.equal(outbox.payload.confirmedBy, scenario.otherAssignee.id)
    assert.equal(outbox.payload.action, 'confirmed')
    assert.isTrue(
      confirmations.some(
        (confirmation) =>
          confirmation.user_id === scenario.otherAssignee.id && confirmation.action === 'confirmed'
      )
    )
    assert.equal(evidenceRow.verification_status, 'verified')
  })
})
