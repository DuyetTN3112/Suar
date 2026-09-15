import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  buildAdminSprintDisputeScenario,
  buildAdminSprintReverseWorkflowScenario,
  insertAiEvaluationForSource,
} from '#modules/reviews/tests/backend/integration/support/review_collection_test_support'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | Review collection API standardization - Sprint and reverse disputes', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('admin disputes API surfaces sprint review disputes with runtime hierarchy context', async ({
    assert,
    client,
  }) => {
    const { superadmin, disputeId, org, project, sprint, task } =
      await buildAdminSprintDisputeScenario()
    await insertAiEvaluationForSource({
      sourceId: disputeId,
      sourceType: 'sprint_review_dispute',
      recommendation: 'partially_accept',
    })
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
        aiEvaluationsCount: number
      }>
    }
    const listItem = listBody.data.find((item) => item.id === disputeId)
    assert.exists(listItem)
    assert.equal(listItem?.sourceType, 'sprint_review_dispute')
    assert.equal(listItem?.disputeReviewType, 'manager_review')
    assert.equal(listItem?.organizationId, org.id)
    assert.equal(listItem?.projectId, project.id)
    assert.equal(listItem?.sprintId, sprint.id)
    assert.equal(listItem?.commentsCount, 1)
    assert.equal(listItem?.aiEvaluationsCount, 1)

    const detailResponse = await client
      .get(`/api/admin/reviews/disputes/${disputeId}`)
      .loginAs(superadmin)
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
        aiEvaluations: Array<{ status: string; recommendation: string }>
      }
    }
    assert.equal(detailBody.data.dispute.id, disputeId)
    assert.equal(detailBody.data.dispute.sourceType, 'sprint_review_dispute')
    assert.equal(detailBody.data.dispute.disputeReviewType, 'manager_review')
    assert.equal(detailBody.data.dispute.organizationId, org.id)
    assert.equal(detailBody.data.dispute.projectId, project.id)
    assert.equal(detailBody.data.dispute.sprintId, sprint.id)
    assert.equal(detailBody.data.dispute.runtimeContext.disputeReviewType, 'manager_review')
    assert.equal(detailBody.data.dispute.runtimeContext.organization.id, org.id)
    assert.equal(detailBody.data.dispute.runtimeContext.project.id, project.id)
    assert.equal(detailBody.data.dispute.runtimeContext.sprint.id, sprint.id)
    assert.include(
      detailBody.data.dispute.runtimeContext.sprintPeerTasks.map((peerTask) => peerTask.id),
      task.id
    )
    assert.equal(detailBody.data.comments[0]?.body, 'Need related sprint context.')
    assert.equal(detailBody.data.aiEvaluations[0]?.status, 'completed')
    assert.equal(detailBody.data.aiEvaluations[0]?.recommendation, 'partially_accept')
  })

  test('admin can resolve sprint review dispute source without classic case file', async ({
    assert,
    client,
  }) => {
    const { superadmin, disputeId } = await buildAdminSprintDisputeScenario()
    await superadmin.refresh()

    const response = await client
      .post(`/api/admin/reviews/disputes/${disputeId}/resolve`)
      .loginAs(superadmin)
      .json({
        sourceType: 'sprint_review_dispute',
        finalDecision: 'partially_accept',
        finalRationale: 'Manager review missed related sprint task context.',
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
    const dispute = (await db
      .from('sprint_review_disputes')
      .where('id', disputeId)
      .select('status', 'final_decision', 'final_rationale', 'resolved_at', 'resolved_by')
      .firstOrFail()) as Record<string, unknown>

    assert.equal(body.data.id, disputeId)
    assert.equal(body.data.sourceType, 'sprint_review_dispute')
    assert.equal(body.data.status, 'resolved')
    assert.equal(body.data.finalDecision, 'partially_accept')
    assert.equal(body.data.finalRationale, 'Manager review missed related sprint task context.')
    assert.equal(dispute['status'], 'resolved')
    assert.equal(dispute['final_decision'], 'partially_accept')
    assert.equal(dispute['final_rationale'], 'Manager review missed related sprint task context.')
    assert.exists(dispute['resolved_at'])
    assert.equal(dispute['resolved_by'], superadmin.id)
  })

  test('admin disputes API surfaces reported sprint reverse review workflows', async ({
    assert,
    client,
  }) => {
    const { superadmin, workflowId, org, project, sprint, task } =
      await buildAdminSprintReverseWorkflowScenario()
    await insertAiEvaluationForSource({
      sourceId: workflowId,
      sourceType: 'sprint_reverse_review_workflow',
      recommendation: 'dismiss_dispute',
    })
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
        aiEvaluationsCount: number
      }>
    }
    const listItem = listBody.data.find((item) => item.id === workflowId)
    assert.exists(listItem)
    assert.equal(listItem?.sourceType, 'sprint_reverse_review_workflow')
    assert.equal(listItem?.disputeReviewType, 'environment_review')
    assert.equal(listItem?.organizationId, org.id)
    assert.equal(listItem?.projectId, project.id)
    assert.equal(listItem?.sprintId, sprint.id)
    assert.equal(listItem?.commentsCount, 1)
    assert.equal(listItem?.aiEvaluationsCount, 1)

    const detailResponse = await client
      .get(`/api/admin/reviews/disputes/${workflowId}`)
      .loginAs(superadmin)
    detailResponse.assertStatus(200)
    const detailBody = detailResponse.body() as {
      data: {
        dispute: {
          id: string
          sourceType: string
          disputeReviewType: string
          runtimeContext: {
            disputeReviewType: string
            sprintPeerTasks: Array<{ id: string }>
          }
        }
        comments: Array<{ body: string }>
        aiEvaluations: Array<{ status: string; recommendation: string }>
      }
    }
    assert.equal(detailBody.data.dispute.id, workflowId)
    assert.equal(detailBody.data.dispute.sourceType, 'sprint_reverse_review_workflow')
    assert.equal(detailBody.data.dispute.disputeReviewType, 'environment_review')
    assert.equal(detailBody.data.dispute.runtimeContext.disputeReviewType, 'environment_review')
    assert.include(
      detailBody.data.dispute.runtimeContext.sprintPeerTasks.map((peerTask) => peerTask.id),
      task.id
    )
    assert.equal(detailBody.data.comments[0]?.body, 'Escalate unresolved environment review.')
    assert.equal(detailBody.data.aiEvaluations[0]?.status, 'completed')
    assert.equal(detailBody.data.aiEvaluations[0]?.recommendation, 'dismiss_dispute')
  })

  test('admin can resolve sprint reverse workflow source without classic case file', async ({
    assert,
    client,
  }) => {
    const { superadmin, workflowId } = await buildAdminSprintReverseWorkflowScenario()
    await superadmin.refresh()

    const response = await client
      .post(`/api/admin/reviews/disputes/${workflowId}/resolve`)
      .loginAs(superadmin)
      .json({
        sourceType: 'sprint_reverse_review_workflow',
        finalDecision: 'dismiss_dispute',
        finalRationale: 'Environment review report lacks enough support for admin change.',
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
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .select('status', 'final_decision', 'final_rationale', 'resolved_at', 'resolved_by')
      .firstOrFail()) as Record<string, unknown>

    assert.equal(body.data.id, workflowId)
    assert.equal(body.data.sourceType, 'sprint_reverse_review_workflow')
    assert.equal(body.data.status, 'resolved')
    assert.equal(body.data.finalDecision, 'dismiss_dispute')
    assert.equal(
      body.data.finalRationale,
      'Environment review report lacks enough support for admin change.'
    )
    assert.equal(workflow['status'], 'resolved')
    assert.equal(workflow['final_decision'], 'dismiss_dispute')
    assert.equal(
      workflow['final_rationale'],
      'Environment review report lacks enough support for admin change.'
    )
    assert.exists(workflow['resolved_at'])
    assert.equal(workflow['resolved_by'], superadmin.id)

    const detailResponse = await client
      .get(`/api/admin/reviews/disputes/${workflowId}`)
      .loginAs(superadmin)
    detailResponse.assertStatus(200)
    const detailBody = detailResponse.body() as {
      data: {
        dispute: {
          id: string
          sourceType: string
          status: string
          finalDecision: string
          finalRationale: string
          resolvedAt: string | null
        }
      }
    }
    assert.equal(detailBody.data.dispute.id, workflowId)
    assert.equal(detailBody.data.dispute.sourceType, 'sprint_reverse_review_workflow')
    assert.equal(detailBody.data.dispute.status, 'resolved')
    assert.equal(detailBody.data.dispute.finalDecision, 'dismiss_dispute')
    assert.equal(
      detailBody.data.dispute.finalRationale,
      'Environment review report lacks enough support for admin change.'
    )
    assert.exists(detailBody.data.dispute.resolvedAt)
  })
})
