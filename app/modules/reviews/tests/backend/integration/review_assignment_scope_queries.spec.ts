import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { TaskReviewReaderAdapter } from '#composition/adapters/task_review_reader_adapter'
import { reviewPublicApi } from '#composition/review_public_api_composition'
import ReviewAssignmentContextV1Query from '#modules/tasks/actions/queries/review_assignment_context_v1_query'
import { LucidTaskFactSourceReader } from '#modules/tasks/infra/adapters/lucid_task_fact_source_reader'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Review assignment scope queries', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('preserves task, project, and task-status predicates through assignment-id facts', async ({
    assert,
  }) => {
    const taskReviewReader = new TaskReviewReaderAdapter()
    const assignmentContexts = new ReviewAssignmentContextV1Query(new LucidTaskFactSourceReader())
    const countPendingForProject = async (projectId: string) => {
      const assignmentIds = await assignmentContexts.listAssignmentIdsByProjectIds([projectId])
      return reviewPublicApi.countPendingForTaskAssignmentIds(assignmentIds)
    }
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const pendingTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      status: 'todo',
    })
    const archivedInProgressTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      status: 'in_progress',
    })
    const completedTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      status: 'done',
    })
    const taskWithoutReviews = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      status: 'cancelled',
    })

    const pendingAssignment = await TaskAssignmentFactory.create({
      task_id: pendingTask.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
    })
    const archivedAssignment = await TaskAssignmentFactory.create({
      task_id: archivedInProgressTask.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
    })
    const completedAssignment = await TaskAssignmentFactory.create({
      task_id: completedTask.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
    })

    await ReviewSessionFactory.create({
      task_assignment_id: pendingAssignment.id,
      reviewee_id: reviewee.id,
      status: 'pending',
    })
    await ReviewSessionFactory.create({
      task_assignment_id: archivedAssignment.id,
      reviewee_id: reviewee.id,
      status: 'in_progress',
    })
    await ReviewSessionFactory.create({
      task_assignment_id: completedAssignment.id,
      reviewee_id: reviewee.id,
      status: 'completed',
    })

    if (
      !pendingTask.task_status_id ||
      !archivedInProgressTask.task_status_id ||
      !completedTask.task_status_id ||
      !taskWithoutReviews.task_status_id
    ) {
      throw new Error('Expected every task fixture to have a task status id')
    }

    assert.isTrue(await taskReviewReader.hasAnyReviewForTask(pendingTask.id))
    assert.isTrue(await taskReviewReader.hasAnyReviewForTask(completedTask.id))
    assert.isFalse(await taskReviewReader.hasAnyReviewForTask(taskWithoutReviews.id))
    assert.equal(await countPendingForProject(project.id), 2)
    assert.isTrue(await taskReviewReader.hasAnyReviewForTasksWithStatus(pendingTask.task_status_id))
    assert.isTrue(
      await taskReviewReader.hasAnyReviewForTasksWithStatus(completedTask.task_status_id)
    )
    assert.isFalse(
      await taskReviewReader.hasAnyReviewForTasksWithStatus(taskWithoutReviews.task_status_id)
    )

    archivedInProgressTask.deleted_at = DateTime.now()
    await archivedInProgressTask.save()

    assert.isTrue(await taskReviewReader.hasAnyReviewForTask(archivedInProgressTask.id))
    assert.equal(await countPendingForProject(project.id), 1)
    assert.isFalse(
      await taskReviewReader.hasAnyReviewForTasksWithStatus(archivedInProgressTask.task_status_id)
    )
    assert.isFalse(await taskReviewReader.hasAnyReviewForTask('not-a-uuid'))
    assert.equal(await countPendingForProject('not-a-uuid'), 0)
    assert.isFalse(await taskReviewReader.hasAnyReviewForTasksWithStatus('not-a-uuid'))
  })
})
