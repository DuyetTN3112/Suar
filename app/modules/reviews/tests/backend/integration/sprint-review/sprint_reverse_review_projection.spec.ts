import { test } from '@japa/runner'

import {
  CloseProjectSprintReviewCommand,
  configureSprintReverseReviewTestGroup,
  DateTime,
  db,
  GetSprintReverseReviewBoardQuery,
  insertWorkHistory,
  LucidReviewSprintReverseBoardReader,
  makeContext,
  makeGetOrganizationShowPageQuery,
  OrganizationFactory,
  OrganizationUserFactory,
  parseMetadata,
  ProjectFactory,
  ProjectMemberFactory,
  ProjectSprint,
  recordArray,
  ReportSprintReverseReviewWorkflowCommand,
  requireTestValue,
  reviewCryptography,
  sprintPackageMutationUnitOfWork,
  type SprintReverseMessageRow,
  sprintReverseWorkflowUnitOfWork,
  type SprintReverseWorkflowStateRow,
  SubmitSprintReverseReviewWorkflowCommand,
  TaskAssignmentFactory,
  TaskFactory,
  testId,
  UserFactory,
} from '../support/sprint_reverse_review_test_support.js'

test.group('Integration | Sprint reverse review board projections', (group) => {
  configureSprintReverseReviewTestGroup(group)

  test('persists sprint reverse review workflow and messages', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    const assigner = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assigner.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: reviewer.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Reverse Board Schema Sprint',
      status: 'review_open',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z'),
      review_closed_at: null,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: assigner.id,
      assigned_to: reviewer.id,
      status: 'done',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewer.id,
      assigned_by: assigner.id,
      assignment_status: 'completed',
    })
    const packageId = testId()
    await db.table('sprint_review_packages').insert({
      id: packageId,
      sprint_id: sprint.id,
      reviewer_id: reviewer.id,
      status: 'pending',
      submitted_at: null,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T01:00:00.000Z',
    })

    const workflowId = testId()
    await db.table('sprint_reverse_review_workflows').insert({
      id: workflowId,
      sprint_id: sprint.id,
      project_id: project.id,
      organization_id: org.id,
      reviewer_id: reviewer.id,
      target_type: 'assigner',
      target_user_id: assigner.id,
      target_entity_id: null,
      responder_id: assigner.id,
      status: 'awaiting_review',
      rating: null,
      comment: null,
      package_id: packageId,
      submitted_at: null,
      accepted_at: null,
      reported_at: null,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T01:00:00.000Z',
    })
    await db.table('sprint_reverse_review_messages').insert({
      id: testId(),
      workflow_id: workflowId,
      author_id: reviewer.id,
      message_type: 'review',
      body: 'Task assignment was clear.',
      created_at: '2026-07-14T02:00:00.000Z',
    })
    const outOfScopeProject = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const outOfScopeTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: outOfScopeProject.id,
      project_sprint_id: null,
      creator_id: assigner.id,
      assigned_to: reviewer.id,
      title: 'Out of scope reverse review schedule',
      status: 'todo',
      due_date: DateTime.fromISO('2026-07-10T00:00:00.000Z'),
    })
    await insertWorkHistory({
      userId: reviewer.id,
      taskId: outOfScopeTask.id,
      organizationId: org.id,
      projectId: outOfScopeProject.id,
      taskTitle: 'Out of scope reverse review history',
      completedAt: '2026-07-20T00:00:00.000Z',
    })

    const workflow = (await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .firstOrFail()) as SprintReverseWorkflowStateRow
    const message = (await db
      .from('sprint_reverse_review_messages')
      .where('workflow_id', workflowId)
      .firstOrFail()) as SprintReverseMessageRow

    assert.equal(workflow.status, 'awaiting_review')
    assert.equal(workflow.target_type, 'assigner')
    assert.equal(message.message_type, 'review')

    await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .update({ status: 'disputed' })
    await new ReportSprintReverseReviewWorkflowCommand(
      makeContext(assigner.id, org.id),
      reviewCryptography,
      sprintReverseWorkflowUnitOfWork
    ).execute({
      workflow_id: workflowId,
      body: 'Escalate unresolved assigner review.',
    })
    const reportMessage = (await db
      .from('sprint_reverse_review_messages')
      .where('workflow_id', workflowId)
      .where('message_type', 'report')
      .firstOrFail()) as SprintReverseMessageRow
    const reportContext = parseMetadata(reportMessage.metadata)['runtime_context'] as Record<
      string,
      unknown
    >
    assert.equal(reportContext['dispute_review_type'], 'manager_review')
    assert.equal((reportContext['organization'] as Record<string, unknown>)['id'], org.id)
    assert.equal((reportContext['project'] as Record<string, unknown>)['id'], project.id)
    assert.include(
      recordArray(reportContext['sprint_peer_tasks']).map((peerTask) => peerTask['id']),
      task.id
    )
    assert.include(
      recordArray(reportContext['manager_assigned_tasks']).map(
        (assignedTask) => assignedTask['id']
      ),
      task.id
    )
    const reviewerContext = reportContext['reviewer_context'] as Record<string, unknown>
    assert.notInclude(
      recordArray(reviewerContext['work_schedule']).map((scheduleTask) => scheduleTask['id']),
      outOfScopeTask.id
    )
    assert.notInclude(
      recordArray(reviewerContext['task_history']).map((history) => history['task_id']),
      outOfScopeTask.id
    )
  })

  test('projects assigner and shared environment workflows into review boards', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assigner = await UserFactory.create({ current_organization_id: org.id })
    const worker = await UserFactory.create({ current_organization_id: org.id })
    const otherWorker = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assigner.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: worker.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: otherWorker.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Board Projection Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    const tasks = [
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: sprint.id,
        creator_id: assigner.id,
        assigned_to: worker.id,
        status: 'done',
      }),
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: sprint.id,
        creator_id: assigner.id,
        assigned_to: worker.id,
        status: 'done',
      }),
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: sprint.id,
        creator_id: owner.id,
        assigned_to: otherWorker.id,
        status: 'done',
      }),
    ]
    for (const task of tasks) {
      const assigneeId = requireTestValue(task.assigned_to, 'task assignee')
      await TaskAssignmentFactory.create({
        task_id: task.id,
        assignee_id: assigneeId,
        assigned_by: task.creator_id,
        assignment_status: 'completed',
      })
      await db.table('task_review_workflows').insert({
        id: testId(),
        task_id: task.id,
        project_id: project.id,
        organization_id: org.id,
        reviewee_id: task.assigned_to,
        status: 'done',
        required_review_count: 2,
        completed_review_count: 2,
        created_at: '2026-07-14T01:00:00.000Z',
        updated_at: '2026-07-14T01:00:00.000Z',
      })
    }
    await new CloseProjectSprintReviewCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({
      sprint_id: sprint.id,
    })

    const board = await new GetSprintReverseReviewBoardQuery(
      makeContext(worker.id, org.id),
      new LucidReviewSprintReverseBoardReader()
    ).handle({ sprint_id: sprint.id })
    assert.property(board.assigner.columns, 'in_review')
    assert.property(board.environment.columns, 'in_review')

    const assignerCards = board.assigner.columns.awaiting_review.cards
    const environmentCards = board.environment.columns.awaiting_review.cards

    assert.lengthOf(assignerCards, 1)
    const assignerCard = requireTestValue(assignerCards[0], 'assigner card')
    const environmentCard = requireTestValue(environmentCards[0], 'environment card')
    const firstRelatedTask = requireTestValue(tasks[0], 'first related task')
    const secondRelatedTask = requireTestValue(tasks[1], 'second related task')
    assert.equal(assignerCard.target_user_id, assigner.id)
    assert.equal(assignerCard.related_task_count, 2)
    assert.lengthOf(assignerCard.related_tasks, 2)
    assert.sameMembers(
      assignerCard.related_tasks.map((task) => task.id),
      [firstRelatedTask.id, secondRelatedTask.id]
    )
    assert.equal(assignerCard.target_user?.id, assigner.id)
    assert.equal(assignerCard.target_user?.username, assigner.username)
    assert.lengthOf(environmentCards, 1)
    assert.equal(environmentCard.target_type, 'environment')
    assert.equal(environmentCard.target_entity_id, org.id)
    assert.equal(environmentCard.responder_id, owner.id)
    assert.equal(environmentCard.responder?.id, owner.id)
  })

  test('submitted environment review appears on organization detail summary', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Org Surface Sprint',
      status: 'review_open',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z'),
      review_closed_at: null,
    })
    const packageId = testId()
    await db.table('sprint_review_packages').insert({
      id: packageId,
      sprint_id: sprint.id,
      reviewer_id: reviewer.id,
      status: 'pending',
      submitted_at: null,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T01:00:00.000Z',
    })
    const workflowId = testId()
    await db.table('sprint_reverse_review_workflows').insert({
      id: workflowId,
      sprint_id: sprint.id,
      project_id: project.id,
      organization_id: org.id,
      reviewer_id: reviewer.id,
      target_type: 'environment',
      target_user_id: null,
      target_entity_id: org.id,
      responder_id: owner.id,
      status: 'awaiting_review',
      rating: null,
      comment: null,
      package_id: packageId,
      submitted_at: null,
      accepted_at: null,
      reported_at: null,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T01:00:00.000Z',
    })

    await new SubmitSprintReverseReviewWorkflowCommand(
      makeContext(reviewer.id, org.id),
      reviewCryptography,
      sprintReverseWorkflowUnitOfWork
    ).execute({
      workflow_id: workflowId,
      rating: 5,
      comment: 'Shared environment felt clear and supportive.',
    })

    const result = await makeGetOrganizationShowPageQuery({
      userId: reviewer.id,
      organizationId: org.id,
      ip: '127.0.0.1',
      userAgent: 'test',
      requestId: null,
      traceId: null,
      workflowId: null,
    }).execute(org.id, reviewer.id)

    assert.isAtLeast(result.organizationReviews.total, 1)
    assert.include(
      result.organizationReviews.recent.map((review) => review.comment),
      'Shared environment felt clear and supportive.'
    )
  })
})
