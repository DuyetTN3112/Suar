import { test } from '@japa/runner'

import {
  buildDoneTaskBoardScenario,
  buildSingleReviewerTaskReviewScenario,
  completedAssignmentId,
  configureTaskReviewBoardTestGroup,
  db,
  makeEnsureTaskReviewWorkflowCommand,
  makeSubmitTaskReviewCommand,
  requireFixtureRow,
  type TaskReviewReviewerFixtureRow,
  type TaskReviewWorkflowFixtureRow,
} from '../support/task_review_board_test_support.js'

import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'


test.group('Integration | Task Review Board - Workflow Initialization & Sync', (group) => {
  configureTaskReviewBoardTestGroup(group)

  test('requires two reviews while only task giver is pre-assigned', async ({ assert }) => {
    const scenario = await buildDoneTaskBoardScenario()

    const result = await makeEnsureTaskReviewWorkflowCommand({
      userId: scenario.viewer.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      taskId: scenario.otherDoneTask.id,
      taskAssignmentId: await completedAssignmentId(scenario.otherDoneTask.id),
    })

    assert.equal(result.status, 'awaiting_review')
    assert.equal(result.requiredReviewCount, 2)

    const workflow = (await db
      .from('task_review_workflows')
      .where('id', result.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow

    assert.equal(workflow.task_id, scenario.otherDoneTask.id)
    assert.equal(workflow.reviewee_id, scenario.otherDoneTask.assigned_to)
    assert.equal(workflow.required_review_count, 2)

    const reviewers = (await db
      .from('task_review_reviewers')
      .where('workflow_id', result.workflowId)
      .orderBy('priority_rank', 'asc')) as TaskReviewReviewerFixtureRow[]
    const firstReviewer = requireFixtureRow(reviewers[0], 'first reviewer row')
    assert.lengthOf(reviewers, 1)
    assert.equal(firstReviewer.reviewer_id, scenario.owner.id)
    assert.equal(firstReviewer.reviewer_role, 'task_giver_required')
    assert.notEqual(firstReviewer.reviewer_id, scenario.otherDoneTask.assigned_to)
  })

  test('notifies the task giver as required and only relevant people as suggested reviewers', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()

    const result = await makeEnsureTaskReviewWorkflowCommand({
      userId: scenario.viewer.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: scenario.org.id,
    }).execute({
      taskId: scenario.otherDoneTask.id,
      taskAssignmentId: await completedAssignmentId(scenario.otherDoneTask.id),
    })

    const requiredRecipients = (await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('job.source_event_name', 'task_review.opened')
      .where('job.business_event_id', result.workflowId)
      .select('target.recipient_id')) as Array<{ recipient_id: string }>
    const suggestedRecipients = (await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('job.source_event_name', 'task_review.suggested_reviewer')
      .where(
        'job.business_event_id',
        `${result.workflowId}:suggested-reviewer:${scenario.projectManager.id}`
      )
      .select('target.recipient_id')) as Array<{ recipient_id: string }>
    const allSuggestedRecipients = (await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('job.source_event_name', 'task_review.suggested_reviewer')
      .select('target.recipient_id')) as Array<{ recipient_id: string }>

    assert.deepEqual(
      requiredRecipients.map((row) => row.recipient_id),
      [scenario.owner.id]
    )
    assert.deepEqual(
      suggestedRecipients.map((row) => row.recipient_id),
      [scenario.projectManager.id]
    )
    assert.notInclude(
      allSuggestedRecipients.map((row) => row.recipient_id),
      scenario.peerReviewer.id
    )
  })

  test('serializes concurrent workflow creation on the exact assignment', async ({ assert }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const taskAssignmentId = await completedAssignmentId(scenario.otherDoneTask.id)
    const execCtx: ReviewActionContext = {
      userId: scenario.viewer.id,
      ip: '0.0.0.0',
      userAgent: 'concurrent-test',
      organizationId: scenario.org.id,
    }

    const [first, second] = await Promise.all([
      makeEnsureTaskReviewWorkflowCommand(execCtx).execute({
        taskId: scenario.otherDoneTask.id,
        taskAssignmentId,
      }),
      makeEnsureTaskReviewWorkflowCommand(execCtx).execute({
        taskId: scenario.otherDoneTask.id,
        taskAssignmentId,
      }),
    ])

    assert.equal(first.workflowId, second.workflowId)
    assert.lengthOf(
      await db.from('task_review_workflows').where('task_assignment_id', taskAssignmentId),
      1
    )
    assert.lengthOf(
      await db.from('task_review_reviewers').where('workflow_id', first.workflowId),
      1
    )
  })

  test('waits for a project reviewer after the required task giver submits a review', async ({
    assert,
  }) => {
    const scenario = await buildSingleReviewerTaskReviewScenario()

    const result = await makeEnsureTaskReviewWorkflowCommand({
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: scenario.org.id,
    }).execute({
      taskId: scenario.task.id,
      taskAssignmentId: await completedAssignmentId(scenario.task.id),
    })

    assert.equal(result.status, 'awaiting_review')
    assert.equal(result.requiredReviewCount, 2)

    const reviewers = (await db
      .from('task_review_reviewers')
      .where('workflow_id', result.workflowId)
      .orderBy('priority_rank', 'asc')) as TaskReviewReviewerFixtureRow[]
    const onlyReviewer = requireFixtureRow(reviewers[0], 'single reviewer row')

    assert.lengthOf(reviewers, 1)
    assert.equal(onlyReviewer.reviewer_id, scenario.owner.id)
    assert.equal(onlyReviewer.reviewer_role, 'task_giver_required')

    await makeSubmitTaskReviewCommand({
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: scenario.org.id,
    }).execute({
      workflowId: result.workflowId,
      body: 'Task giver review is complete.',
    })

    const workflow = (await db
      .from('task_review_workflows')
      .where('id', result.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(workflow.status, 'in_review')
    assert.equal(Number(workflow.completed_review_count), 1)
  })
})
