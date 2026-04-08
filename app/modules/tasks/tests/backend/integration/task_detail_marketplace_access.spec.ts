import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { ForbiddenPolicyViolationException } from '#modules/authorization/exceptions/policy_violation_exception'
import GetTaskDetailDTO from '#modules/tasks/actions/dtos/request/get_task_detail_dto'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { makeGetTaskDetailQuery } from '#modules/tasks/bootstrap/task_action_factory'
import { TaskStatus, TaskStatusCategory } from '#modules/tasks/constants/task_constants'
import TaskStatusModel from '#modules/tasks/infra/models/task_status'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskApplicationFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Task detail marketplace access', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('unaffiliated user can open marketplace task detail and apply state follows task_applications', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.createExternalContributor()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'external',
      application_deadline: DateTime.now().plus({ days: 7 }),
    })
    const dto = GetTaskDetailDTO.createFull(task.id)
    const query = makeGetTaskDetailQuery(makeSystemTaskActionContext(applicant.id))

    const openDetail = await query.execute(dto)

    assert.isTrue(openDetail.permissions.canApply)
    assert.isFalse(openDetail.permissions.canEdit)
    assert.isFalse(openDetail.permissions.canAssign)
    assert.isFalse(openDetail.permissions.canChangeStatus)
    assert.isFalse(openDetail.permissions.canReviewApplications)
    assert.isUndefined(openDetail.auditLogs)
    assert.isNull(openDetail.task['review_zone'])

    await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
    })

    const appliedDetail = await query.execute(dto)

    assert.isFalse(appliedDetail.permissions.canApply)
  })

  test('project manager can open marketplace task detail with application review permission', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: manager.id,
      project_role: 'project_manager',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      task_visibility: 'external',
    })

    const detail = await makeGetTaskDetailQuery(
      makeSystemTaskActionContext(manager.id)
    ).execute(GetTaskDetailDTO.createFull(task.id))

    assert.isTrue(detail.permissions.canReviewApplications)
    assert.isFalse(detail.permissions.canApply)
  })

  test('external viewer can open custom done task detail with task review workflow data', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.createExternalContributor()
    const assignee = await UserFactory.create({ current_organization_id: org.id })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const doneStatus = await TaskStatusModel.create({
      organization_id: org.id,
      name: 'QA accepted',
      slug: 'qa_accepted',
      category: TaskStatusCategory.DONE,
      color: '#10b981',
      sort_order: 99,
      is_default: false,
      is_system: false,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      assigned_to: assignee.id,
      status: TaskStatus.IN_PROGRESS,
      task_status_id: doneStatus.id,
      task_visibility: 'external',
    })

    const detail = await makeGetTaskDetailQuery(
      makeSystemTaskActionContext(viewer.id)
    ).execute(GetTaskDetailDTO.createFull(task.id))

    assert.isFalse(detail.permissions.isCreator)
    assert.isFalse(detail.permissions.isAssignee)
    assert.isFalse(detail.permissions.canEdit)
    assert.isNotNull(detail.taskReviewDetail)
    assert.equal(
      (detail.taskReviewDetail?.['task'] as Record<string, unknown>)['id'],
      task.id
    )
    assert.equal(
      (detail.taskReviewDetail?.['task'] as Record<string, unknown>)['status'],
      TaskStatus.DONE
    )
  })

  test('unaffiliated user cannot open foreign internal task detail', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const outsider = await UserFactory.createExternalContributor()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'internal',
    })

    await assert.rejects(
      () =>
        makeGetTaskDetailQuery(makeSystemTaskActionContext(outsider.id)).execute(
          GetTaskDetailDTO.createFull(task.id)
        ),
      ForbiddenPolicyViolationException
    )
  })
})
