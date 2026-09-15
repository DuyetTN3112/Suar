import { test } from '@japa/runner'

import {
  AcceptTaskReviewCommand,
  aiDisputeUnitOfWork,
  buildDoneTaskBoardScenario,
  BusinessLogicException,
  completedAssignmentId,
  confirmationDisputes,
  configureTaskReviewBoardTestGroup,
  db,
  GetAdminReviewDisputeDetailQuery,
  insertProfileAndHistory,
  LucidAiDisputeEvaluationSourceReader,
  LucidReviewAdminDisputeReadModel,
  LucidReviewDisputeArtifactReader,
  makeEnsureTaskReviewWorkflowCommand,
  makeOpenTaskReviewDisputeCommand,
  makeReportTaskReviewDisputeCommand,
  makeRespondToTaskReviewCommand,
  makeSubmitTaskReviewCommand,
  parseJsonValue,
  ProcessAiDisputeCallbackCommand,
  recordArray,
  requireFixtureRow,
  reviewCryptography,
  signAiCallback,
  TaskFactory,
  TaskStatus,
  type TaskReviewMessageFixtureRow,
  type TaskReviewWorkflowFixtureRow,
  UserFactory,
} from '#modules/reviews/tests/backend/integration/support/task_review_board_test_support'

test.group('Integration | Task Review Board - Disputes & AI Arbitration', (group) => {
  configureTaskReviewBoardTestGroup(group)

  test('a disputed review permits two-way discussion but blocks new reviews', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const peerTask = await TaskFactory.create({
      organization_id: scenario.org.id,
      project_id: scenario.project.id,
      project_sprint_id: scenario.sprintId,
      creator_id: scenario.owner.id,
      assigned_to: scenario.otherDoneTask.assigned_to,
      status: TaskStatus.DONE,
      title: 'Related peer task for task review dispute',
    })
    const assignment = (await db
      .from('task_assignments')
      .where('task_id', scenario.otherDoneTask.id)
      .firstOrFail()) as { id: string }
    await insertProfileAndHistory({
      userId: scenario.owner.id,
      taskId: scenario.otherDoneTask.id,
      assignmentId: assignment.id,
      organizationId: scenario.org.id,
      projectId: scenario.project.id,
      role: 'task_giver',
    })
    await insertProfileAndHistory({
      userId: scenario.otherAssignee.id,
      taskId: scenario.otherDoneTask.id,
      assignmentId: assignment.id,
      organizationId: scenario.org.id,
      projectId: scenario.project.id,
      role: 'reviewee',
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
      .update({ status: 'awaiting_response', completed_review_count: 2 })
    const [insertedReviewMessage] = (await db
      .table('task_review_messages')
      .insert({
        workflow_id: workflow.workflowId,
        author_id: scenario.owner.id,
        message_type: 'review',
        body: 'Review needing a response.',
      })
      .returning('id')) as Array<{ id: string }>
    const reviewMessage = requireFixtureRow(insertedReviewMessage, 'review message')
    await db
      .from('task_review_reviewers')
      .where('workflow_id', workflow.workflowId)
      .where('reviewer_id', scenario.owner.id)
      .update({ status: 'submitted', reviewed_at: new Date() })

    await makeRespondToTaskReviewCommand({
      userId: scenario.otherDoneTask.assigned_to,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: reviewMessage.id,
      body: 'I disagree with this review because evidence is missing.',
    })

    let row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(row.status, 'awaiting_response')

    await makeOpenTaskReviewDisputeCommand({
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: reviewMessage.id,
    })

    row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(row.status, 'disputed')

    await new AcceptTaskReviewCommand(
      {
        userId: scenario.otherDoneTask.assigned_to,
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

    row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(row.status, 'disputed')

    await makeRespondToTaskReviewCommand({
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: reviewMessage.id,
      body: 'The review is based on the deadline and scope stated in the task package.',
    })
    await makeRespondToTaskReviewCommand({
      userId: scenario.otherDoneTask.assigned_to,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: reviewMessage.id,
      body: 'The task package did not include the required access or the revised scope.',
    })
    const disputeReplies = (await db
      .from('task_review_messages')
      .where('workflow_id', workflow.workflowId)
      .where('parent_review_message_id', reviewMessage.id)
      .where('message_type', 'dispute_reply')
      .select('author_id')) as Array<{ author_id: string }>
    assert.deepEqual(
      disputeReplies.map((reply) => reply.author_id).sort(),
      [scenario.owner.id, scenario.otherDoneTask.assigned_to].sort()
    )

    await makeSubmitTaskReviewCommand({
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      body: 'The review was updated after the dispute discussion clarified the scope.',
    })
    const updatedReview = (await db
      .from('task_review_messages')
      .where('id', reviewMessage.id)
      .select('body')
      .firstOrFail()) as { body: string }
    assert.equal(
      updatedReview.body,
      'The review was updated after the dispute discussion clarified the scope.'
    )

    await assert.rejects(
      () =>
        makeSubmitTaskReviewCommand({
          userId: scenario.viewer.id,
          ip: '0.0.0.0',
          userAgent: 'test',
          organizationId: null,
        }).execute({
          workflowId: workflow.workflowId,
          body: 'A project colleague cannot add a review during dispute.',
        }),
      BusinessLogicException,
      'Đang có tranh chấp, chỉ reviewer đã gửi review mới được chỉnh sửa review của mình'
    )

    const superadmin = await UserFactory.createSuperadmin()

    await makeReportTaskReviewDisputeCommand({
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: reviewMessage.id,
      disputeType: 'review_fairness',
      claim: 'Cannot resolve dispute in thread because the review does not cite the task rubric.',
      evidence:
        'Review message and task-review workflow history do not identify a rubric criterion.',
      requestedOutcome: 'independent_re_review',
    })

    row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(row.status, 'reported')
    assert.equal(row.reported_by, scenario.owner.id)
    assert.isNotNull(row.reported_at)
    const runtimeContext = parseJsonValue(row.runtime_context)
    assert.equal(runtimeContext['schema_version'], 'suar_task_review_workflow_runtime_context_v2')
    assert.equal(runtimeContext['source_type'], 'task_review_workflow')
    assert.equal(runtimeContext['dispute_review_type'], 'task_review')
    assert.equal(parseJsonValue(runtimeContext['organization'])['id'], scenario.org.id)
    assert.equal(parseJsonValue(runtimeContext['project'])['id'], scenario.project.id)
    assert.equal(parseJsonValue(runtimeContext['sprint'])['id'], scenario.sprintId)
    assert.equal(parseJsonValue(runtimeContext['task'])['id'], scenario.otherDoneTask.id)
    const profileAssessmentContract = parseJsonValue(runtimeContext['profile_assessment_contract'])
    assert.equal(
      profileAssessmentContract['schema_version'],
      'suar.profile_assessment_contract.v2'
    )
    assert.equal(profileAssessmentContract['profile_mutation_permitted'], false)

    const taskGiverContext = parseJsonValue(runtimeContext['task_giver_context'])
    const revieweeContext = parseJsonValue(runtimeContext['reviewee_context'])
    const reporterContext = parseJsonValue(runtimeContext['reporter_context'])
    assert.equal(taskGiverContext['user_id'], scenario.owner.id)
    assert.equal(
      parseJsonValue(parseJsonValue(taskGiverContext['profile'])['summary'])['role'],
      'task_giver'
    )
    assert.include(
      recordArray(taskGiverContext['task_history']).map(
        (item: Record<string, unknown>) => item['task_id']
      ),
      scenario.otherDoneTask.id
    )
    assert.equal(revieweeContext['user_id'], scenario.otherAssignee.id)
    assert.equal(
      parseJsonValue(parseJsonValue(revieweeContext['profile'])['summary'])['role'],
      'reviewee'
    )
    assert.include(
      recordArray(revieweeContext['work_schedule']).map(
        (item: Record<string, unknown>) => item['id']
      ),
      scenario.otherDoneTask.id
    )
    assert.equal(reporterContext['user_id'], scenario.owner.id)
    assert.include(
      recordArray(runtimeContext['related_project_tasks']).map(
        (item: Record<string, unknown>) => item['id']
      ),
      peerTask.id
    )
    assert.include(
      recordArray(runtimeContext['sprint_peer_tasks']).map(
        (item: Record<string, unknown>) => item['id']
      ),
      scenario.otherDoneTask.id
    )

    const reportMessage = (await db
      .from('task_review_messages')
      .where('workflow_id', workflow.workflowId)
      .where('message_type', 'system')
      .firstOrFail()) as TaskReviewMessageFixtureRow
    assert.include(reportMessage.body, 'Cannot resolve dispute')
    const metadata = parseJsonValue(reportMessage.metadata)
    assert.deepEqual(parseJsonValue(metadata['dispute_report']), {
      disputeType: 'review_fairness',
      claim: 'Cannot resolve dispute in thread because the review does not cite the task rubric.',
      evidence:
        'Review message and task-review workflow history do not identify a rubric criterion.',
      requestedOutcome: 'independent_re_review',
    })
    assert.equal(
      parseJsonValue(metadata['runtime_context'])['schema_version'],
      'suar_task_review_workflow_runtime_context_v2'
    )

    const aiResult = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', 'task_review_workflow')
      .where('source_id', workflow.workflowId)
      .firstOrFail()) as Record<string, unknown>
    const requestPayload = parseJsonValue(aiResult['request_payload'])

    assert.equal(aiResult['provider'], 'clawagent')
    assert.equal(aiResult['status'], 'queued')
    assert.equal(aiResult['source_type'], 'task_review_workflow')
    assert.isNull(aiResult['case_file_id'])
    assert.equal(requestPayload['dispute_review_type'], 'task_review')
    assert.equal((requestPayload['organization'] as Record<string, unknown>)['id'], scenario.org.id)
    assert.include(
      recordArray(requestPayload['sprint_peer_tasks']).map(
        (item: Record<string, unknown>) => item['id']
      ),
      scenario.otherDoneTask.id
    )

    const previousSecret = process.env['AI_CALLBACK_SECRET']
    const callbackSecret = 'task-review-report-ai-callback-secret'
    const timestamp = Math.floor(Date.now() / 1000)
    process.env['AI_CALLBACK_SECRET'] = callbackSecret
    try {
      await new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork).execute({
        evaluation_id: aiResult['id'] as string,
        source_id: workflow.workflowId,
        status: 'completed',
        recommendation: 'request_re_review',
        confidence_score: 0.82,
        summary: 'AI recommends another task review before admin resolution.',
        response_payload: {
          verdict: {
            recommendation: 'request_re_review',
            action_items: ['Admin should approve a re-review.'],
            profile_assessment: {
              schema_version: 'suar.ai.profile_assessment.v1',
              status: 'not_eligible_by_contract',
              capability_proposals: [],
              work_claim: null,
              requires_human_approval: true,
              profile_mutation_permitted: false,
              profile_effect: 'no_change',
              blockers: ['This callback is a dispute-resolution fixture.'],
            },
          },
        },
        timestamp,
        signature: signAiCallback(timestamp, aiResult['id'] as string, 'completed', callbackSecret),
      })
    } finally {
      if (previousSecret === undefined) {
        delete process.env['AI_CALLBACK_SECRET']
      } else {
        process.env['AI_CALLBACK_SECRET'] = previousSecret
      }
    }

    const adminDetail = await new GetAdminReviewDisputeDetailQuery(
      {
        userId: superadmin.id,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: null,
      },
      new LucidReviewDisputeArtifactReader(),
      new LucidAiDisputeEvaluationSourceReader(),
      new LucidReviewAdminDisputeReadModel()
    ).execute({ disputeId: workflow.workflowId })
    assert.lengthOf(adminDetail.ai_evaluations, 1)
    assert.equal(adminDetail.ai_evaluations[0]?.['status'], 'completed')
    assert.equal(adminDetail.ai_evaluations[0]?.['recommendation'], 'request_re_review')
    assert.include(
      adminDetail.timeline.map((entry: { kind: string }) => entry.kind),
      'ai_evaluation'
    )
  })

  test('report stages the canonical Clawagent arbitration contract', async ({ assert }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const assignment = (await db
      .from('task_assignments')
      .where('task_id', scenario.otherDoneTask.id)
      .firstOrFail()) as { id: string }
    await insertProfileAndHistory({
      userId: scenario.owner.id,
      taskId: scenario.otherDoneTask.id,
      assignmentId: assignment.id,
      organizationId: scenario.org.id,
      projectId: scenario.project.id,
      role: 'task_giver',
    })
    await insertProfileAndHistory({
      userId: scenario.otherAssignee.id,
      taskId: scenario.otherDoneTask.id,
      assignmentId: assignment.id,
      organizationId: scenario.org.id,
      projectId: scenario.project.id,
      role: 'reviewee',
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
      .update({ status: 'awaiting_response', completed_review_count: 2 })
    await db.table('task_comments').insert({
      task_id: scenario.otherDoneTask.id,
      author_id: scenario.owner.id,
      body: 'Task-level evidence and context for arbitration.',
      comment_type: 'review_note',
      visibility: 'reviewers_only',
      review_relevance: true,
    })
    const [insertedReviewMessage] = (await db
      .table('task_review_messages')
      .insert({
        workflow_id: workflow.workflowId,
        author_id: scenario.owner.id,
        message_type: 'review',
        body: 'Review requiring AI dispute handling.',
      })
      .returning('id')) as Array<{ id: string }>
    const reviewMessage = requireFixtureRow(insertedReviewMessage, 'review message')
    await makeRespondToTaskReviewCommand({
      userId: scenario.otherDoneTask.assigned_to,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: reviewMessage.id,
      body: 'I need AI arbitration because the review missed evidence.',
    })
    await UserFactory.createSuperadmin()

    await makeReportTaskReviewDisputeCommand({
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: reviewMessage.id,
      disputeType: 'review_score',
      claim:
        'Cannot resolve task review dispute because the current score is inconsistent with the rubric.',
      evidence: 'The reported review message does not cite the required task review criteria.',
      requestedOutcome: 'adjust_score',
    })

    const aiResult = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', 'task_review_workflow')
      .where('source_id', workflow.workflowId)
      .firstOrFail()) as Record<string, unknown>
    const triggerPayload = parseJsonValue(aiResult['trigger_payload']) as {
      evaluation_id: string
      source_type: string
      source_id: string
      callbackUrl: string
      context: {
        source_type: string
        source_id: string
        dispute_review_type: string
        organization: { id: string }
        project: { id: string }
        sprint: { id: string }
        workflow: {
          organization_id: string
          project_id: string
          sprint_id: string
          task_id: string
        }
        task_comments: Array<Record<string, unknown>>
        review_messages: Array<Record<string, unknown>>
      }
    }
    assert.equal(triggerPayload.source_type, 'task_review_workflow')
    assert.equal(triggerPayload.source_id, workflow.workflowId)
    assert.match(triggerPayload.callbackUrl, /\/api\/public\/ai-disputes\/callback$/u)
    assert.equal(triggerPayload.context.source_type, 'task_review_workflow')
    assert.equal(triggerPayload.context.source_id, workflow.workflowId)
    assert.equal(triggerPayload.context.dispute_review_type, 'task_review')
    assert.equal(triggerPayload.context.organization.id, scenario.org.id)
    assert.equal(triggerPayload.context.project.id, scenario.project.id)
    assert.equal(triggerPayload.context.sprint.id, scenario.sprintId)
    assert.equal(triggerPayload.context.workflow.organization_id, scenario.org.id)
    assert.equal(triggerPayload.context.workflow.project_id, scenario.project.id)
    assert.equal(triggerPayload.context.workflow.sprint_id, scenario.sprintId)
    assert.equal(triggerPayload.context.workflow.task_id, scenario.otherDoneTask.id)
    assert.include(
      recordArray(triggerPayload.context.task_comments).map(
        (comment: Record<string, unknown>) => comment['body']
      ),
      'Task-level evidence and context for arbitration.'
    )
    assert.include(
      recordArray(triggerPayload.context.review_messages).map(
        (message: Record<string, unknown>) => message['body']
      ),
      'Review requiring AI dispute handling.'
    )

    const row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow

    assert.equal(aiResult['status'], 'queued')
    assert.isNull(aiResult['external_run_id'])
    assert.equal(row.status, 'reported')
  })
})
