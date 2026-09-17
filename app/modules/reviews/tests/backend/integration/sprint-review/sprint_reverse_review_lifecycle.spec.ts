import { test } from '@japa/runner'

import {
  CloseProjectSprintReviewCommand,
  configureSprintReverseReviewTestGroup,
  DateTime,
  db,
  makeContext,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  ProjectSprint,
  requireTestValue,
  reviewCryptography,
  sprintPackageMutationUnitOfWork,
  type SprintReviewPackageRow,
  type SprintReverseWorkflowRow,
  TaskAssignmentFactory,
  TaskFactory,
  testId,
  UserFactory,
} from '../support/sprint_reverse_review_test_support.js'

test.group('Integration | Sprint reverse review lifecycle and gating', (group) => {
  configureSprintReverseReviewTestGroup(group)

  test('blocks sprint close while task review workflows are not done', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const worker = await UserFactory.create({ current_organization_id: org.id })
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
      name: 'Blocked Task Review Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: worker.id,
      status: 'done',
    })
    await db.table('task_review_workflows').insert({
      id: testId(),
      task_id: task.id,
      project_id: project.id,
      organization_id: org.id,
      reviewee_id: worker.id,
      status: 'awaiting_response',
      required_review_count: 2,
      completed_review_count: 2,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T01:00:00.000Z',
    })

    await assert.rejects(
      () =>
        new CloseProjectSprintReviewCommand(
          makeContext(owner.id, org.id),
          reviewCryptography,
          sprintPackageMutationUnitOfWork
        ).execute({
          sprint_id: sprint.id,
        }),
      /Cannot close sprint while task reviews are not done/
    )
  })

  test('opens reverse review workflows for eligible reviewers and creates next sprint', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignerA = await UserFactory.create({ current_organization_id: org.id })
    const assignerB = await UserFactory.create({ current_organization_id: org.id })
    const worker = await UserFactory.create({ current_organization_id: org.id })
    const memberOnly = await UserFactory.create({ current_organization_id: org.id })
    const outsideWorker = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assignerA.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assignerB.id,
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
      user_id: memberOnly.id,
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
      user_id: worker.id,
      project_role: 'project_member',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: memberOnly.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Reverse Review Sprint 1',
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
        creator_id: assignerA.id,
        assigned_to: worker.id,
        status: 'done',
      }),
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: sprint.id,
        creator_id: assignerA.id,
        assigned_to: worker.id,
        status: 'done',
      }),
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: sprint.id,
        creator_id: assignerB.id,
        assigned_to: outsideWorker.id,
        status: 'done',
      }),
    ]
    const firstTask = requireTestValue(tasks[0], 'first task fixture')
    const secondTask = requireTestValue(tasks[1], 'second task fixture')
    const thirdTask = requireTestValue(tasks[2], 'third task fixture')
    await TaskAssignmentFactory.create({
      task_id: firstTask.id,
      assignee_id: worker.id,
      assigned_by: assignerA.id,
      assignment_status: 'completed',
    })
    await TaskAssignmentFactory.create({
      task_id: secondTask.id,
      assignee_id: worker.id,
      assigned_by: assignerA.id,
      assignment_status: 'completed',
    })
    await TaskAssignmentFactory.create({
      task_id: thirdTask.id,
      assignee_id: outsideWorker.id,
      assigned_by: assignerB.id,
      assignment_status: 'completed',
    })
    for (const task of tasks) {
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

    const result = await new CloseProjectSprintReviewCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({ sprint_id: sprint.id })

    const packages = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .select('reviewer_id')) as SprintReviewPackageRow[]
    const workflows = (await db
      .from('sprint_reverse_review_workflows')
      .where('sprint_id', sprint.id)
      .orderBy('reviewer_id', 'asc')
      .orderBy('target_type', 'asc')
      .select(
        'reviewer_id',
        'target_type',
        'target_user_id',
        'target_entity_id',
        'responder_id'
      )) as SprintReverseWorkflowRow[]
    const nextSprint = (await db
      .from('project_sprints')
      .where('project_id', project.id)
      .whereNot('id', sprint.id)
      .first()) as { status: string } | undefined

    assert.equal(result.status, 'review_open')
    assert.sameMembers(
      packages.map((row) => row.reviewer_id),
      [assignerA.id, assignerB.id, worker.id, outsideWorker.id]
    )
    assert.exists(
      workflows.find(
        (row) =>
          row.reviewer_id === worker.id &&
          row.target_type === 'assigner' &&
          row.target_user_id === assignerA.id
      )
    )
    assert.exists(
      workflows.find(
        (row) =>
          row.reviewer_id === outsideWorker.id &&
          row.target_type === 'assigner' &&
          row.target_user_id === assignerB.id
      )
    )
    const environmentWorkflow = workflows.find(
      (row) => row.reviewer_id === worker.id && row.target_type === 'environment'
    )
    const requiredEnvironmentWorkflow = requireTestValue(
      environmentWorkflow,
      'environment workflow'
    )
    assert.exists(environmentWorkflow)
    assert.equal(requiredEnvironmentWorkflow.target_entity_id, org.id)
    assert.equal(requiredEnvironmentWorkflow.responder_id, owner.id)
    assert.exists(nextSprint)
    assert.equal(requireTestValue(nextSprint, 'next sprint').status, 'active')
  })

  test('blocks next sprint close while previous sprint reverse reviews are not done', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const worker = await UserFactory.create({ current_organization_id: org.id })
    const otherWorker = await UserFactory.create({ current_organization_id: org.id })
    const assigner = await UserFactory.create({ current_organization_id: org.id })
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
    const previousSprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Previous Sprint',
      status: 'review_open',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z'),
      review_closed_at: null,
    })
    await db.table('sprint_reverse_review_workflows').insert({
      id: testId(),
      sprint_id: previousSprint.id,
      project_id: project.id,
      organization_id: org.id,
      reviewer_id: worker.id,
      target_type: 'environment',
      target_user_id: null,
      target_entity_id: org.id,
      responder_id: owner.id,
      status: 'awaiting_response',
      rating: 4,
      comment: 'Need clearer coordination.',
      package_id: null,
      submitted_at: '2026-07-14T02:00:00.000Z',
      accepted_at: null,
      reported_at: null,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T02:00:00.000Z',
    })
    const currentSprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Current Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-28T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    const tasks = [
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: currentSprint.id,
        creator_id: assigner.id,
        assigned_to: worker.id,
        status: 'done',
      }),
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: currentSprint.id,
        creator_id: assigner.id,
        assigned_to: otherWorker.id,
        status: 'done',
      }),
    ]
    for (const task of tasks) {
      const assigneeId = requireTestValue(task.assigned_to, 'task assignee')
      await TaskAssignmentFactory.create({
        task_id: task.id,
        assignee_id: assigneeId,
        assigned_by: assigner.id,
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
        created_at: '2026-07-28T01:00:00.000Z',
        updated_at: '2026-07-28T01:00:00.000Z',
      })
    }

    await assert.rejects(
      () =>
        new CloseProjectSprintReviewCommand(
          makeContext(owner.id, org.id),
          reviewCryptography,
          sprintPackageMutationUnitOfWork
        ).execute({
          sprint_id: currentSprint.id,
        }),
      /Cannot close sprint while previous review sau sprint workflows are not done/
    )
  })
})
