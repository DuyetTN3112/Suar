import { test } from '@japa/runner'

import {
  buildDoneTaskBoardScenario,
  completedAssignmentId,
  configureTaskReviewBoardTestGroup,
  db,
  ForbiddenException,
  getTaskReviewDetailByTask,
  GetTaskReviewBoardQuery,
  makeEnsureTaskReviewWorkflowCommand,
  OrganizationUserFactory,
  taskBoardReader,
  TaskStatus,
  UserFactory,
} from '../support/task_review_board_test_support.js'

test.group('Integration | Task Review Board - Access & Visibility', (group) => {
  configureTaskReviewBoardTestGroup(group)

  test('awaiting_review shows all delivery-done project tasks for project review visibility', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const result = await new GetTaskReviewBoardQuery(
      {
        userId: scenario.viewer.id,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: null,
      },
      taskBoardReader
    ).execute({
      projectId: scenario.project.id,
    })

    const awaitingReview = result.columns.find((column) => column.status === 'awaiting_review')
    assert.exists(awaitingReview)

    const taskIds = awaitingReview?.cards.map((card) => card.taskId) ?? []
    assert.include(taskIds, scenario.otherDoneTask.id)
    assert.include(taskIds, scenario.ownDoneTask.id)
    assert.include(taskIds, scenario.viewerCreatedTask.id)
    assert.notInclude(taskIds, scenario.inProgressTask.id)

    assert.equal(scenario.ownDoneTask.status, TaskStatus.DONE)
    assert.equal(scenario.otherDoneTask.status, TaskStatus.DONE)
  })

  test('review detail includes task metadata and the completed assignment timing', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const dueAt = new Date('2026-08-01T00:00:00.000Z')
    const completedAt = new Date('2026-08-03T00:00:00.000Z')

    await db.from('tasks').where('id', scenario.otherDoneTask.id).update({
      label: 'enhancement',
      estimated_time: 8,
      task_visibility: 'internal',
      due_date: dueAt,
    })
    const assignmentId = await completedAssignmentId(scenario.otherDoneTask.id)
    await db.from('task_assignments').where('id', assignmentId).update({
      estimated_hours: 8,
      actual_hours: 10,
      completed_at: completedAt,
    })

    const detail = await getTaskReviewDetailByTask(scenario.otherDoneTask.id)
    const task = detail?.['task'] as Record<string, unknown>
    const assignment = detail?.['assignment'] as Record<string, unknown>

    assert.equal(task['label'], 'enhancement')
    assert.equal(Number(task['estimated_time']), 8)
    assert.equal(task['task_visibility'], 'internal')
    assert.equal(assignment['id'], assignmentId)
    assert.equal(assignment['assignment_status'], 'completed')
    assert.equal(Number(assignment['estimated_hours']), 8)
    assert.equal(Number(assignment['actual_hours']), 10)
    assert.equal(
      new Date(String(assignment['completed_at'])).toISOString(),
      completedAt.toISOString()
    )
  })

  test('board access requires project-scoped visibility before task rows are read', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const outsider = await UserFactory.create({ current_organization_id: scenario.org.id })
    await OrganizationUserFactory.create({
      organization_id: scenario.org.id,
      user_id: outsider.id,
      org_role: 'org_member',
      status: 'approved',
    })

    await assert.rejects(
      () =>
        new GetTaskReviewBoardQuery(
          {
            userId: outsider.id,
            ip: '0.0.0.0',
            userAgent: 'test',
            organizationId: scenario.org.id,
          },
          taskBoardReader
        ).execute({
          projectId: scenario.project.id,
        }),
      ForbiddenException,
      'You do not have permission to view this task review board'
    )

    const ownerBoard = await new GetTaskReviewBoardQuery(
      {
        userId: scenario.owner.id,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: scenario.org.id,
      },
      taskBoardReader
    ).execute({
      projectId: scenario.project.id,
    })
    const ownerTaskIds = ownerBoard.columns.flatMap((column) =>
      column.cards.map((card) => card.taskId)
    )

    assert.include(ownerTaskIds, scenario.otherDoneTask.id)
  })

  test('board cards include persisted workflow id and reviewer progress', async ({ assert }) => {
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

    await db
      .from('task_review_reviewers')
      .where('workflow_id', workflow.workflowId)
      .where('reviewer_id', scenario.projectManager.id)
      .update({ status: 'submitted' })
    await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .update({ status: 'in_review', completed_review_count: 1 })

    const board = await new GetTaskReviewBoardQuery(
      {
        userId: scenario.projectManager.id,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: null,
      },
      taskBoardReader
    ).execute({
      projectId: scenario.project.id,
    })

    const inReview = board.columns.find((column) => column.status === 'in_review')
    const card = inReview?.cards.find((item) => item.taskId === scenario.otherDoneTask.id)

    assert.exists(card)
    assert.equal(card?.workflowId, workflow.workflowId)
    assert.equal(card?.reviewCount, 1)
    assert.equal(card?.requiredReviewCount, 2)
  })

  test('keeps an AI-reviewing workflow in the user-facing reported lane', async ({ assert }) => {
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

    await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .update({ status: 'ai_reviewing' })

    const board = await new GetTaskReviewBoardQuery(
      {
        userId: scenario.projectManager.id,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: null,
      },
      taskBoardReader
    ).execute({ projectId: scenario.project.id })

    const reported = board.columns.find((column) => column.status === 'reported')
    const card = reported?.cards.find((item) => item.taskId === scenario.otherDoneTask.id)

    assert.isUndefined(board.columns.find((column) => column.status === 'ai_reviewing'))
    assert.isUndefined(board.columns.find((column) => column.status === 'ai_failed'))
    assert.exists(card)
    assert.equal(card?.status, 'reported')
    assert.equal(card?.workflowStatus, 'ai_reviewing')
  })
})
