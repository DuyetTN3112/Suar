import { test } from '@japa/runner'

import {
  CloseProjectSprintReviewCommand,
  configureCloseProjectSprintReviewTestGroup,
  DateTime,
  db,
  makeContext,
  type NotificationFanoutStagerContract,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  ProjectSprint,
  reviewCryptography,
  sprintPackageMutationUnitOfWork,
  type SprintReviewPackageRow,
  TaskAssignmentFactory,
  TaskFactory,
  testId,
  UserFactory,
} from '../support/close_project_sprint_review_test_support.js'

import LucidReviewSprintPackageMutationUnitOfWork from '#modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_package_mutation_unit_of_work'

test.group('Integration | Close project sprint review command execution', (group) => {
  configureCloseProjectSprintReviewTestGroup(group)

  test('opens sprint review and creates one package per eligible reviewer', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create({ current_organization_id: org.id })
    const member = await UserFactory.create({ current_organization_id: org.id })
    const assignee = await UserFactory.create({ current_organization_id: org.id })
    const creatorOnly = await UserFactory.create({ current_organization_id: org.id })
    const outside = await UserFactory.create({ current_organization_id: org.id })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: manager.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: manager.id,
      project_role: 'project_manager',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: member.id,
      project_role: 'project_member',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: creatorOnly.id,
      assigned_to: assignee.id,
      status: 'in_progress',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: assignee.id,
      assigned_by: manager.id,
      assignment_status: 'active',
    })

    await TaskFactory.create({
      organization_id: org.id,
      creator_id: outside.id,
      assigned_to: outside.id,
    })

    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Close Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    await db.from('tasks').where('id', task.id).update({ project_sprint_id: sprint.id })

    const result = await new CloseProjectSprintReviewCommand(
      makeContext(manager.id, org.id),
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({ sprint_id: sprint.id })

    const packages = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .select('reviewer_id')) as Array<Pick<SprintReviewPackageRow, 'reviewer_id'>>
    const reviewerIds = packages.map((row) => row.reviewer_id).sort()

    assert.equal(result.status, 'review_open')
    assert.equal(result.created_package_count, 3)
    assert.sameMembers(reviewerIds, [assignee.id, creatorOnly.id, manager.id])
    assert.notInclude(reviewerIds, outside.id)

    const reloadedSprint = await ProjectSprint.findOrFail(sprint.id)
    assert.equal(reloadedSprint.status, 'review_open')
    assert.equal(reloadedSprint.closed_by, manager.id)
    assert.exists(reloadedSprint.review_opened_at)
  })

  test('rolls sprint, packages, next sprint, and audit back when fanout fails', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const worker = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: worker.id,
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
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      assigned_to: worker.id,
      status: 'done',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Atomic review sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    await db.from('tasks').where('id', task.id).update({ project_sprint_id: sprint.id })
    const failingFanout: NotificationFanoutStagerContract = {
      stage: () => Promise.reject(new Error('simulated sprint fanout failure')),
    }

    await assert.rejects(
      () =>
        new CloseProjectSprintReviewCommand(
          makeContext(owner.id, org.id),
          reviewCryptography,
          new LucidReviewSprintPackageMutationUnitOfWork(failingFanout)
        ).execute({ sprint_id: sprint.id }),
      /simulated sprint fanout failure/
    )

    const reloadedSprint = await ProjectSprint.findOrFail(sprint.id)
    assert.equal(reloadedSprint.status, 'active')
    assert.lengthOf(await db.from('sprint_review_packages').where('sprint_id', sprint.id), 0)
    assert.equal(
      Number(
        (
          (await db
            .from('project_sprints')
            .where('project_id', project.id)
            .count('* as count')
            .first()) as { count: number | string }
        ).count
      ),
      1
    )
    assert.lengthOf(
      await db
        .from('audit_events')
        .where('entity_type', 'project_sprint')
        .where('entity_id', sprint.id)
        .where('action', 'open_sprint_review'),
      0
    )
  })

  test('rejects non-manager sprint close', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
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
      user_id: member.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Locked Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })

    await assert.rejects(
      () =>
        new CloseProjectSprintReviewCommand(
          makeContext(member.id, org.id),
          reviewCryptography,
          sprintPackageMutationUnitOfWork
        ).execute({
          sprint_id: sprint.id,
        }),
      /Actor cannot manage project sprint/
    )
  })

  test('opens sprint review when one real sprint worker is eligible', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const worker = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: worker.id,
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
      name: 'Single Reviewer Sprint',
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
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: worker.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    await db.table('task_review_workflows').insert({
      id: testId(),
      task_id: task.id,
      project_id: project.id,
      organization_id: org.id,
      reviewee_id: worker.id,
      status: 'done',
      required_review_count: 2,
      completed_review_count: 2,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T01:00:00.000Z',
    })

    const result = await new CloseProjectSprintReviewCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({
      sprint_id: sprint.id,
    })

    assert.sameMembers(result.reviewer_ids, [owner.id, worker.id])
  })
})
