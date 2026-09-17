import { test } from '@japa/runner'

import {
  buildDoneTaskBoardScenario,
  BusinessLogicException,
  completedAssignmentId,
  configureTaskReviewBoardTestGroup,
  db,
  getTaskReviewDetailByTask,
  makeEnsureTaskReviewWorkflowCommand,
  makeRespondToTaskReviewCommand,
  makeSubmitTaskReviewCommand,
  requireFixtureRow,
} from '../support/task_review_board_test_support.js'

test.group('Integration | Task Review Board - Review Submissions & Revisions', (group) => {
  configureTaskReviewBoardTestGroup(group)

  test('preserves every submitted review revision when the reviewer edits', async ({ assert }) => {
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
    }).execute({ workflowId: workflow.workflowId, body: 'Initial review.' })

    await makeSubmitTaskReviewCommand({
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({ workflowId: workflow.workflowId, body: 'Corrected review.' })

    assert.isTrue(
      await db.connection().schema.hasTable('task_review_message_revisions'),
      'task review revisions table must exist'
    )

    const messages = (await db
      .from('task_review_messages')
      .where('workflow_id', workflow.workflowId)
      .where('author_id', scenario.owner.id)
      .where('message_type', 'review')
      .select('id', 'body', 'updated_at')) as Array<{
      id: string
      body: string
      updated_at: Date | string | null
    }>

    assert.lengthOf(messages, 1)
    const message = requireFixtureRow(messages[0], 'edited review message')
    assert.equal(message.body, 'Corrected review.')
    assert.isNotNull(message.updated_at)

    const revisions = (await db
      .from('task_review_message_revisions')
      .where('message_id', message.id)
      .orderBy('revision_number', 'asc')
      .select('revision_number', 'body', 'editor_id', 'created_at')) as Array<{
      revision_number: number | string
      body: string
      editor_id: string
      created_at: Date | string
    }>

    assert.deepEqual(
      revisions.map((revision) => ({
        revisionNumber: Number(revision.revision_number),
        body: revision.body,
        editorId: revision.editor_id,
      })),
      [
        { revisionNumber: 1, body: 'Initial review.', editorId: scenario.owner.id },
        { revisionNumber: 2, body: 'Corrected review.', editorId: scenario.owner.id },
      ]
    )
    assert.isNotNull(revisions[0]?.created_at)
    assert.isNotNull(revisions[1]?.created_at)

    const detail = await getTaskReviewDetailByTask(scenario.otherDoneTask.id)
    const detailMessage = (detail?.['reviewMessages'] as Array<Record<string, unknown>>).find(
      (candidate) => candidate['id'] === message.id
    )
    const detailRevisions = detailMessage?.['revisions'] as Array<Record<string, unknown>>

    assert.equal(Number(detailMessage?.['revision_count']), 2)
    assert.equal(detailRevisions[0]?.['body'], 'Initial review.')
    assert.equal(detailRevisions[1]?.['body'], 'Corrected review.')
  })

  test('submit allows task giver reviewer and rejects task assignee even if reviewer rows are bad data', async ({
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

    await db.table('task_review_reviewers').insert([
      {
        workflow_id: workflow.workflowId,
        reviewer_id: scenario.otherDoneTask.assigned_to,
        reviewer_role: 'bad_assignee_reviewer',
        is_required: true,
        status: 'pending',
        priority_rank: 91,
      },
    ])

    await makeSubmitTaskReviewCommand({
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      body: 'Task giver review: accepted with ownership context',
    })

    await assert.rejects(
      () =>
        makeSubmitTaskReviewCommand({
          userId: scenario.otherDoneTask.assigned_to,
          ip: '0.0.0.0',
          userAgent: 'test',
          organizationId: null,
        }).execute({
          workflowId: workflow.workflowId,
          body: 'Assignee should not review own assigned task',
        }),
      BusinessLogicException,
      'Bạn không thể review task được giao cho chính mình'
    )
  })

  test('withdrawing a review hides its thread and reopens the required review slot', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const ownerContext = {
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }
    const workflow = await makeEnsureTaskReviewWorkflowCommand(ownerContext).execute({
      taskId: scenario.otherDoneTask.id,
      taskAssignmentId: await completedAssignmentId(scenario.otherDoneTask.id),
    })
    await makeSubmitTaskReviewCommand(ownerContext).execute({
      workflowId: workflow.workflowId,
      body: 'Review that will be withdrawn.',
    })
    const review = (await db
      .from('task_review_messages')
      .where('workflow_id', workflow.workflowId)
      .where('author_id', scenario.owner.id)
      .where('message_type', 'review')
      .select('id')
      .firstOrFail()) as { id: string }

    await makeRespondToTaskReviewCommand(ownerContext).execute({
      workflowId: workflow.workflowId,
      reviewMessageId: '',
      withdrawMessageId: review.id,
      body: '',
    })

    const withdrawn = (await db
      .from('task_review_messages')
      .where('id', review.id)
      .select('deleted_at', 'deleted_by')
      .firstOrFail()) as { deleted_at: Date | null; deleted_by: string | null }
    assert.isNotNull(withdrawn.deleted_at)
    assert.equal(withdrawn.deleted_by, scenario.owner.id)

    const reviewer = (await db
      .from('task_review_reviewers')
      .where('workflow_id', workflow.workflowId)
      .where('reviewer_id', scenario.owner.id)
      .select('status')
      .firstOrFail()) as { status: string }
    assert.equal(reviewer.status, 'pending')

    const row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .select('status', 'completed_review_count')
      .firstOrFail()) as { status: string; completed_review_count: number | string }
    assert.equal(row.status, 'awaiting_review')
    assert.equal(Number(row.completed_review_count), 0)
  })
})
