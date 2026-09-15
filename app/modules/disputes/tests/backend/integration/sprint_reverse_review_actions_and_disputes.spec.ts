import { test } from '@japa/runner'

import {
  AcceptSprintReverseReviewWorkflowCommand,
  configureSprintReverseReviewTestGroup,
  DateTime,
  db,
  ForbiddenException,
  makeContext,
  makeStartAiDisputeEvaluationCommand,
  OrganizationFactory,
  OrganizationUserFactory,
  parseMetadata,
  ProjectFactory,
  ProjectSprint,
  recordArray,
  ReportSprintReverseReviewWorkflowCommand,
  RespondSprintReverseReviewWorkflowCommand,
  reviewCryptography,
  type SprintReverseMessageRow,
  sprintReverseWorkflowUnitOfWork,
  type SprintReverseWorkflowStateRow,
  SubmitSprintReverseReviewWorkflowCommand,
  TaskFactory,
  testId,
  UserFactory,
} from '#modules/reviews/tests/backend/integration/support/sprint_reverse_review_test_support'

test.group('Integration | Sprint reverse review actions, disputes and AI evaluation', (group) => {
  configureSprintReverseReviewTestGroup(group)

  test('supports submit, dispute, accept, and report workflow actions', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const worker = await UserFactory.create({ current_organization_id: org.id })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Action Sprint',
      status: 'review_open',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z'),
      review_closed_at: null,
    })
    const sprintTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: worker.id,
      status: 'done',
    })
    const packageId = testId()
    await db.table('sprint_review_packages').insert({
      id: packageId,
      sprint_id: sprint.id,
      reviewer_id: worker.id,
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
      reviewer_id: worker.id,
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
      makeContext(worker.id, org.id),
      reviewCryptography,
      sprintReverseWorkflowUnitOfWork
    ).execute({
      workflow_id: workflowId,
      rating: 4,
      comment: 'Good environment, but planning could be clearer.',
    })
    let workflow = (await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .firstOrFail()) as SprintReverseWorkflowStateRow
    assert.equal(workflow.status, 'awaiting_response')
    assert.equal(workflow.rating, 4)
    assert.exists(
      await db.from('sprint_environment_reviews').where('package_id', packageId).first()
    )

    await assert.rejects(
      () =>
        new RespondSprintReverseReviewWorkflowCommand(
          makeContext(worker.id, org.id),
          reviewCryptography,
          sprintReverseWorkflowUnitOfWork
        ).execute({
          workflow_id: workflowId,
          body: 'I should not be able to dispute my own submitted review.',
        }),
      ForbiddenException,
      'Only workflow responder can dispute review sau sprint'
    )

    await new RespondSprintReverseReviewWorkflowCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintReverseWorkflowUnitOfWork
    ).execute({
      workflow_id: workflowId,
      body: 'We need more context before accepting this.',
    })
    workflow = (await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .firstOrFail()) as SprintReverseWorkflowStateRow
    assert.equal(workflow.status, 'disputed')

    await assert.rejects(
      () =>
        new RespondSprintReverseReviewWorkflowCommand(
          makeContext(owner.id, org.id),
          reviewCryptography,
          sprintReverseWorkflowUnitOfWork
        ).execute({
          workflow_id: workflowId,
          body: 'A second dispute action should not re-open the dispute path.',
        }),
      /Review sau sprint workflow can only be disputed while awaiting response/
    )

    await assert.rejects(
      () =>
        new AcceptSprintReverseReviewWorkflowCommand(
          makeContext(worker.id, org.id),
          reviewCryptography,
          sprintReverseWorkflowUnitOfWork
        ).execute({
          workflow_id: workflowId,
        }),
      ForbiddenException,
      'Only workflow responder can accept review sau sprint'
    )
    await new AcceptSprintReverseReviewWorkflowCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintReverseWorkflowUnitOfWork
    ).execute({
      workflow_id: workflowId,
    })
    workflow = (await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .firstOrFail()) as SprintReverseWorkflowStateRow
    assert.equal(workflow.status, 'done')
    assert.exists(workflow.accepted_at)

    await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .update({ status: 'disputed', accepted_at: null })
    await UserFactory.createSuperadmin()
    await new ReportSprintReverseReviewWorkflowCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintReverseWorkflowUnitOfWork
    ).execute({
      workflow_id: workflowId,
      body: 'Escalate unresolved environment review.',
    })
    workflow = (await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .firstOrFail()) as SprintReverseWorkflowStateRow
    assert.equal(workflow.status, 'reported')
    assert.exists(workflow.reported_at)
    const reportMessage = (await db
      .from('sprint_reverse_review_messages')
      .where('workflow_id', workflowId)
      .where('message_type', 'report')
      .firstOrFail()) as SprintReverseMessageRow
    const reportContext = parseMetadata(reportMessage.metadata)['runtime_context'] as Record<
      string,
      unknown
    >
    assert.equal(reportContext['dispute_review_type'], 'environment_review')
    assert.equal((reportContext['organization'] as Record<string, unknown>)['id'], org.id)
    assert.equal((reportContext['project'] as Record<string, unknown>)['id'], project.id)
    assert.include(
      recordArray(reportContext['sprint_peer_tasks']).map(
        (task: Record<string, unknown>) => task['id']
      ),
      sprintTask.id
    )
    const aiEvaluation = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', 'sprint_reverse_review_workflow')
      .where('source_id', workflowId)
      .firstOrFail()) as Record<string, unknown>
    const aiPayload = parseMetadata(aiEvaluation['request_payload'])
    assert.equal(aiEvaluation['provider'], 'clawagent')
    assert.equal(aiEvaluation['status'], 'queued')
    assert.equal(aiPayload['dispute_review_type'], 'environment_review')
  })

  test('report stages the canonical Clawagent contract for reverse workflows', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const worker = await UserFactory.create({ current_organization_id: org.id })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Reverse Production Arbitration',
      status: 'review_open',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z'),
      review_closed_at: null,
    })
    await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: worker.id,
      status: 'done',
    })
    const packageId = testId()
    await db.table('sprint_review_packages').insert({
      id: packageId,
      sprint_id: sprint.id,
      reviewer_id: worker.id,
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
      reviewer_id: worker.id,
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
      makeContext(worker.id, org.id),
      reviewCryptography,
      sprintReverseWorkflowUnitOfWork
    ).execute({
      workflow_id: workflowId,
      rating: 3,
      comment: 'Environment review needs production arbitration context.',
    })
    await new RespondSprintReverseReviewWorkflowCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintReverseWorkflowUnitOfWork
    ).execute({
      workflow_id: workflowId,
      body: 'Owner disputes the reverse review and requests arbitration.',
    })
    await UserFactory.createSuperadmin()

    await new ReportSprintReverseReviewWorkflowCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintReverseWorkflowUnitOfWork
    ).execute({
      workflow_id: workflowId,
      body: 'Escalate reverse review to Clawagent arbitration.',
    })

    const aiResult = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', 'sprint_reverse_review_workflow')
      .where('source_id', workflowId)
      .firstOrFail()) as Record<string, unknown>
    const triggerPayload = parseMetadata(aiResult['trigger_payload']) as {
      evaluation_id: string
      source_type: string
      source_id: string
      case_file_id: string | null
      callbackUrl: string
      context: {
        source_type: string
        source_id: string
        dispute_review_type: string
        organization: { id: string }
      }
    }
    assert.equal(triggerPayload.source_type, 'sprint_reverse_review_workflow')
    assert.equal(triggerPayload.source_id, workflowId)
    assert.isNull(triggerPayload.case_file_id)
    assert.match(triggerPayload.callbackUrl, /\/api\/public\/ai-disputes\/callback$/u)
    assert.equal(triggerPayload.context.source_type, 'sprint_reverse_review_workflow')
    assert.equal(triggerPayload.context.source_id, workflowId)
    assert.equal(triggerPayload.context.dispute_review_type, 'environment_review')
    assert.equal(triggerPayload.context.organization.id, org.id)

    const workflow = (await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .select('status')
      .firstOrFail()) as Record<string, unknown>

    assert.equal(aiResult['status'], 'queued')
    assert.isNull(aiResult['external_run_id'])
    assert.equal(workflow['status'], 'reported')
  })

  test('admin can queue AI evaluation from reported reverse workflow runtime context', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
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
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Reverse AI Runtime Context',
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
      creator_id: owner.id,
      assigned_to: reviewer.id,
      title: 'Environment review context task',
      status: 'done',
    })
    const workflowId = testId()
    const runtimeContext = {
      schema_version: 'suar_sprint_reverse_review_report_context_v1',
      dispute_review_type: 'environment_review',
      workflow_id: workflowId,
      organization: { id: org.id, name: org.name },
      project: { id: project.id, name: project.name },
      sprint: { id: sprint.id, name: sprint.name },
      target: {
        type: 'environment',
        user_id: null,
        entity_id: org.id,
        responder_id: owner.id,
      },
      sprint_peer_tasks: [{ id: task.id, project_sprint_id: sprint.id, title: task.title }],
      related_project_tasks: [{ id: task.id, project_id: project.id, title: task.title }],
      manager_assigned_tasks: [],
    }

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
      status: 'reported',
      rating: 2,
      comment: 'Environment review needs arbitration.',
      package_id: null,
      submitted_at: '2026-07-14T02:00:00.000Z',
      accepted_at: null,
      reported_at: '2026-07-14T03:00:00.000Z',
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T03:00:00.000Z',
    })
    await db.table('sprint_reverse_review_messages').insert({
      id: testId(),
      workflow_id: workflowId,
      author_id: owner.id,
      message_type: 'report',
      body: 'Shared environment feedback missed sprint delivery context.',
      metadata: JSON.stringify({ runtime_context: runtimeContext }),
      created_at: '2026-07-14T03:00:00.000Z',
    })

    const result = (await makeStartAiDisputeEvaluationCommand(
      makeContext(superadmin.id, org.id)
    ).execute({
      dispute_id: workflowId,
      provider: 'ai_council',
      source_type: 'sprint_reverse_review_workflow',
    })) as unknown as Record<string, unknown>
    const requestPayload = result['request_payload'] as Record<string, unknown>
    const row = (await db
      .from('ai_dispute_evaluations')
      .where('id', result['id'] as string)
      .select('source_type', 'source_id', 'case_file_id')
      .firstOrFail()) as Record<string, unknown>

    assert.equal(result['source_type'], 'sprint_reverse_review_workflow')
    assert.isNull(result['case_file_id'])
    assert.equal(requestPayload['dispute_review_type'], 'environment_review')
    assert.equal((requestPayload['organization'] as Record<string, unknown>)['id'], org.id)
    assert.include(
      recordArray(requestPayload['sprint_peer_tasks']).map(
        (peerTask: Record<string, unknown>) => peerTask['id']
      ),
      task.id
    )
    assert.equal(row['source_type'], 'sprint_reverse_review_workflow')
    assert.equal(row['source_id'], workflowId)
    assert.isNull(row['case_file_id'])
  })
})
