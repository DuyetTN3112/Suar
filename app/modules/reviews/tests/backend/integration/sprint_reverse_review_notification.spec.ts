import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import RespondSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/respond_sprint_reverse_review_workflow_command'
import SubmitSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/submit_sprint_reverse_review_workflow_command'
import LucidReviewSprintReverseWorkflowUnitOfWork from '#modules/reviews/infra/adapters/lucid_review_sprint_reverse_workflow_unit_of_work'
import { NodeReviewCryptography } from '#modules/reviews/infra/adapters/node_review_cryptography'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

function makeContext(userId: string, organizationId: string) {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'test',
  }
}

const reviewCryptography = new NodeReviewCryptography()

class NotificationSpy implements NotificationFanoutStagerContract {
  public calls: Array<{ recipientIds: readonly string[]; type: string; subjectId: string }> = []

  public stage(
    template: Parameters<NotificationFanoutStagerContract['stage']>[0],
    recipientIds: readonly string[],
    _options: Parameters<NotificationFanoutStagerContract['stage']>[2]
  ) {
    this.calls.push({
      recipientIds,
      type: template.type,
      subjectId: template.subject?.id ?? '',
    })
    return Promise.resolve({
      status: 'staged' as const,
      jobId: testId(),
      targetCount: recipientIds.length,
    })
  }
}

test.group('Integration | Sprint reverse review notifications', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('submission notifies the reviewed party', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    const target = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: target.id,
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
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: target.id,
      assigned_to: reviewer.id,
      status: 'done',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewer.id,
      assigned_by: target.id,
      assignment_status: 'completed',
    })
    const sprintId = testId()
    const packageId = testId()
    const workflowId = testId()
    await db.table('project_sprints').insert({
      id: sprintId,
      organization_id: org.id,
      project_id: project.id,
      name: 'Reverse review sprint',
      status: 'review_open',
      starts_at: '2026-07-01T00:00:00.000Z',
      ends_at: '2026-07-14T00:00:00.000Z',
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: '2026-07-14T01:00:00.000Z',
      review_closed_at: null,
      created_at: '2026-07-14T00:00:00.000Z',
      updated_at: '2026-07-14T00:00:00.000Z',
    })
    await db.table('sprint_review_packages').insert({
      id: packageId,
      sprint_id: sprintId,
      reviewer_id: reviewer.id,
      status: 'pending',
      submitted_at: null,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T01:00:00.000Z',
    })
    await db.table('sprint_reverse_review_workflows').insert({
      id: workflowId,
      sprint_id: sprintId,
      project_id: project.id,
      organization_id: org.id,
      reviewer_id: reviewer.id,
      target_type: 'assigner',
      target_user_id: target.id,
      target_entity_id: null,
      responder_id: target.id,
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

    const fanout = new NotificationSpy()
    await new SubmitSprintReverseReviewWorkflowCommand(
      makeContext(reviewer.id, org.id),
      reviewCryptography,
      new LucidReviewSprintReverseWorkflowUnitOfWork(fanout)
    ).execute({
      workflow_id: workflowId,
      rating: 4,
      comment: 'Looks good overall.',
    })

    assert.deepEqual(fanout.calls, [
      {
        recipientIds: [target.id],
        type: 'reverse_review_received',
        subjectId: sprintId,
      },
    ])
  })

  test('dispute notifies the opposite participant', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    const target = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: target.id,
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
    const packageId = testId()
    const sprintId = testId()
    const workflowId = testId()
    await db.table('sprint_review_packages').insert({
      id: packageId,
      sprint_id: sprintId,
      reviewer_id: reviewer.id,
      status: 'pending',
      submitted_at: null,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T01:00:00.000Z',
    })
    await db.table('project_sprints').insert({
      id: sprintId,
      organization_id: org.id,
      project_id: project.id,
      name: 'Reverse review sprint',
      status: 'review_open',
      starts_at: '2026-07-01T00:00:00.000Z',
      ends_at: '2026-07-14T00:00:00.000Z',
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: '2026-07-14T01:00:00.000Z',
      review_closed_at: null,
      created_at: '2026-07-14T00:00:00.000Z',
      updated_at: '2026-07-14T00:00:00.000Z',
    })
    await db.table('sprint_reverse_review_workflows').insert({
      id: workflowId,
      sprint_id: sprintId,
      project_id: project.id,
      organization_id: org.id,
      reviewer_id: reviewer.id,
      target_type: 'assigner',
      target_user_id: target.id,
      target_entity_id: null,
      responder_id: target.id,
      status: 'awaiting_response',
      rating: 4,
      comment: 'Looks good overall.',
      package_id: packageId,
      submitted_at: '2026-07-14T02:00:00.000Z',
      accepted_at: null,
      reported_at: null,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T02:00:00.000Z',
    })

    const fanout = new NotificationSpy()
    await new RespondSprintReverseReviewWorkflowCommand(
      makeContext(target.id, org.id),
      reviewCryptography,
      new LucidReviewSprintReverseWorkflowUnitOfWork(fanout)
    ).execute({
      workflow_id: workflowId,
      body: 'I disagree with the rating.',
    })

    assert.deepEqual(fanout.calls, [
      {
        recipientIds: [reviewer.id],
        type: 'reverse_review_received',
        subjectId: sprintId,
      },
    ])
  })
})
