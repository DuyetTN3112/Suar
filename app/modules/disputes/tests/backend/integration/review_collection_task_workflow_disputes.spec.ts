import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { buildAdminTaskReviewWorkflowScenario } from '#modules/reviews/tests/backend/integration/support/review_collection_test_support'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | Review collection API standardization - Task review workflow disputes', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('admin disputes API surfaces reported task review workflows with runtime hierarchy context', async ({
    assert,
    client,
  }) => {
    const { superadmin, workflowId, org, project, sprint, task } =
      await buildAdminTaskReviewWorkflowScenario()
    await superadmin.refresh()

    const listResponse = await client.get('/api/admin/reviews/disputes').loginAs(superadmin)
    listResponse.assertStatus(200)
    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        sourceType: string
        disputeReviewType: string
        organizationId: string
        projectId: string
        sprintId: string
        commentsCount: number
      }>
    }
    const listItem = listBody.data.find((item) => item.id === workflowId)
    assert.exists(listItem)
    assert.equal(listItem?.sourceType, 'task_review_workflow')
    assert.equal(listItem?.disputeReviewType, 'task_review')
    assert.equal(listItem?.organizationId, org.id)
    assert.equal(listItem?.projectId, project.id)
    assert.equal(listItem?.sprintId, sprint.id)
    assert.equal(listItem?.commentsCount, 1)

    const detailResponse = await client
      .get(`/api/admin/reviews/disputes/${workflowId}`)
      .loginAs(superadmin)
    console.log('DETAIL RESPONSE BODY:', detailResponse.body())
    detailResponse.assertStatus(200)
    const detailBody = detailResponse.body() as {
      data: {
        dispute: {
          id: string
          sourceType: string
          disputeReviewType: string
          organizationId: string
          projectId: string
          sprintId: string
          runtimeContext: {
            disputeReviewType: string
            organization: { id: string }
            project: { id: string }
            sprint: { id: string }
            sprintPeerTasks: Array<{ id: string }>
          }
        }
        comments: Array<{ body: string }>
      }
    }
    assert.equal(detailBody.data.dispute.id, workflowId)
    assert.equal(detailBody.data.dispute.sourceType, 'task_review_workflow')
    assert.equal(detailBody.data.dispute.disputeReviewType, 'task_review')
    assert.equal(detailBody.data.dispute.organizationId, org.id)
    assert.equal(detailBody.data.dispute.projectId, project.id)
    assert.equal(detailBody.data.dispute.sprintId, sprint.id)
    assert.equal(detailBody.data.dispute.runtimeContext.disputeReviewType, 'task_review')
    assert.equal(detailBody.data.dispute.runtimeContext.organization.id, org.id)
    assert.equal(detailBody.data.dispute.runtimeContext.project.id, project.id)
    assert.equal(detailBody.data.dispute.runtimeContext.sprint.id, sprint.id)
    assert.include(
      detailBody.data.dispute.runtimeContext.sprintPeerTasks.map((peerTask) => peerTask.id),
      task.id
    )
    assert.include(detailBody.data.comments[0]?.body, 'Task review dispute reported')
  })

  test('admin can resolve task review workflow source without classic case file', async ({
    assert,
    client,
  }) => {
    const { superadmin, workflowId, reviewee, reviewer } = await buildAdminTaskReviewWorkflowScenario()
    await superadmin.refresh()

    const response = await client
      .post(`/api/admin/reviews/disputes/${workflowId}/resolve`)
      .loginAs(superadmin)
      .json({
        sourceType: 'task_review_workflow',
        finalDecision: 'request_re_review',
        finalRationale: 'Task review workflow needs a fresh review with full context.',
      })

    response.assertStatus(201)
    const body = response.body() as {
      data: {
        id: string
        sourceType: string
        status: string
        finalDecision: string
        finalRationale: string
      }
    }
    const workflow = (await db
      .from('task_review_workflows')
      .where('id', workflowId)
      .select('status', 'final_decision', 'final_rationale', 'resolved_at', 'resolved_by')
      .firstOrFail()) as Record<string, unknown>

    assert.equal(body.data.id, workflowId)
    assert.equal(body.data.sourceType, 'task_review_workflow')
    assert.equal(body.data.status, 'resolved')
    assert.equal(body.data.finalDecision, 'request_re_review')
    assert.equal(body.data.finalRationale, 'Task review workflow needs a fresh review with full context.')
    assert.equal(workflow['status'], 'resolved')
    assert.equal(workflow['final_decision'], 'request_re_review')
    assert.equal(
      workflow['final_rationale'],
      'Task review workflow needs a fresh review with full context.'
    )
    assert.exists(workflow['resolved_at'])
    assert.equal(workflow['resolved_by'], superadmin.id)
    const recipients = (await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('job.source_event_name', 'task_review.resolved')
      .where('job.business_event_id', `${workflowId}:resolved`)
      .select('target.recipient_id')) as Array<{ recipient_id: string }>
    assert.sameMembers(
      recipients.map((row) => row.recipient_id),
      [reviewee.id, reviewer.id]
    )

    // Final board completion must preserve the administrative case history.
    // The workflow becomes `done`, but it must remain listable and readable
    // under the board's resolved lane.
    await db.from('task_review_workflows').where('id', workflowId).update({
      status: 'done',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const completedListResponse = await client.get('/api/admin/reviews/disputes').loginAs(superadmin)
    completedListResponse.assertStatus(200)
    const completedListBody = completedListResponse.body() as {
      data: Array<{ id: string; sourceType: string; status: string }>
    }
    const completedListItem = completedListBody.data.find((item) => item.id === workflowId)
    assert.exists(completedListItem)
    assert.equal(completedListItem?.sourceType, 'task_review_workflow')
    assert.equal(completedListItem?.status, 'done')

    const completedDetailResponse = await client
      .get(`/api/admin/reviews/disputes/${workflowId}`)
      .loginAs(superadmin)
    completedDetailResponse.assertStatus(200)
    const completedDetailBody = completedDetailResponse.body() as {
      data: { dispute: { id: string; sourceType: string; status: string } }
    }
    assert.equal(completedDetailBody.data.dispute.id, workflowId)
    assert.equal(completedDetailBody.data.dispute.sourceType, 'task_review_workflow')
    assert.equal(completedDetailBody.data.dispute.status, 'done')
  })
})
