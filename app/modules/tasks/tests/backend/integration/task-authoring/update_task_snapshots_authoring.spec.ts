import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import CreateTaskDTO from '#modules/tasks/actions/dtos/request/task-authoring/create_task_dto'
import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import { TASK_WORK_CONTRACT_V1_FIXTURE } from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import { UpdateTaskScenario } from '#modules/tasks/tests/backend/support/update_task_scenario'
import {
  type AuthoringHeadRow,
  cleanupUpdateTaskData,
  setupUpdateTaskGroup,
  type SpecificationVersionNumberRow,
  type TaskAuditEventRow,
  type TaskContractRow,
  teardownUpdateTaskGroup,
} from '#modules/tasks/tests/backend/support/update_task_test_support'
import { ReviewSessionFactory } from '#tests/helpers/factories'

test.group('Integration | Update Task - Snapshots and Authoring v2', (group) => {
  group.setup(() => setupUpdateTaskGroup())
  group.teardown(() => teardownUpdateTaskGroup())
  group.each.teardown(() => cleanupUpdateTaskData())

  test('updates task fields, creates a version snapshot, and writes audit trail', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const assignee = await scenario.createOrgMember()
    const task = await scenario.createTask({
      title: 'Original task title',
      description: 'Original task description',
      assigned_to: null,
      estimated_time: 2,
    })

    const updatedTask = await scenario.execute(
      task.id,
      new UpdateTaskDTO({
        title: 'Updated task title',
        assigned_to: assignee.id,
        estimated_time: 5,
      })
    )

    assert.equal(updatedTask.title, 'Updated task title')
    assert.equal(updatedTask.assigned_to, assignee.id)
    assert.equal(updatedTask.estimated_time, 5)

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.title, 'Updated task title')
    assert.equal(persistedTask.assigned_to, assignee.id)
    assert.equal(persistedTask.estimated_time, 5)

    const invalidation = (await db
      .from('search_projection_entity_revisions')
      .where('entity_type', 'task')
      .where('entity_id', task.id)
      .orderBy('created_at', 'desc')
      .first()) as { operation?: string; source_revision?: string; changed_fields?: string[] } | undefined
    assert.equal(invalidation?.operation, 'upsert')
    assert.include(invalidation?.changed_fields ?? [], 'title')
    assert.include(invalidation?.changed_fields ?? [], 'assigned_to')

    const versionSnapshot = await scenario.findVersionSnapshot(task.id)
    assert.isNotNull(versionSnapshot)
    assert.equal(versionSnapshot?.title, 'Original task title')
    assert.isNull(versionSnapshot?.assigned_to)

    assert.isAbove(await scenario.countUpdateAuditLogs(task.id), 0)

    const notification = (await db
      .from('notifications')
      .select('event_id', 'category', 'action')
      .where('user_id', assignee.id)
      .where('type', 'task_assigned')
      .where('related_entity_id', task.id)
      .first()) as
      | {
          event_id: string
          category: string
          action: { routeName?: string } | null
        }
      | null
    assert.isNotNull(notification)
    const occurredAt = updatedTask.updated_at ?? persistedTask.updated_at.toUTC().toISO()
    assert.isNotNull(occurredAt)
    if (!notification || !occurredAt) return
    assert.equal(
      notification.event_id,
      buildNotificationEventId({
        eventName: 'task.updated_assigned',
        businessEventId: `${task.id}:none:${assignee.id}:${occurredAt}`,
        recipientId: assignee.id,
      })
    )
    assert.equal(notification.category, 'task')
    assert.equal(notification.action?.routeName, 'tasks.show')
    assert.lengthOf(
      await db.from('notification_outbox').where('source_event_id', notification.event_id),
      2
    )
  })

  test('saves immutable authoring v2 and rejects a stale writer atomically', async ({ assert }) => {
    const scenario = await UpdateTaskScenario.create()
    const task = await scenario.createTask({
      title: 'Draft pre-order API',
      description: 'Initial API brief',
      assigned_to: null,
    })
    const authoring = taskExternalDeps.authoring
    if (!authoring) throw new Error('Production Task authoring composition is unavailable')
    const initialKey = `task-authoring-initial:${crypto.randomUUID()}`
    await db.transaction((trx) =>
      authoring.persistInitial({
        taskId: task.id,
        actorId: scenario.owner.id,
        dto: new CreateTaskDTO({
          title: task.title,
          description: task.description,
          task_status_id: crypto.randomUUID(),
          organization_id: scenario.org.id,
          project_id: scenario.project.id,
          required_skills: [],
          authoring: {
            mode: 'evidence_enabled',
            intent: 'save_draft',
            idempotency_key: initialKey,
            expected_head_revision: 0,
            creator_confirmed: false,
            specification: { plain_text: 'Initial local API execution brief.' },
          },
        }),
        trx,
      })
    )
    const originalUpdatedAt = task.updated_at.toISO()
    const versionKey = `task-authoring-version:${crypto.randomUUID()}`
    const updated = await scenario.execute(
      task.id,
      new UpdateTaskDTO({
        authoring: {
          mode: 'evidence_enabled',
          intent: 'save_draft',
          idempotency_key: versionKey,
          expected_head_revision: 1,
          creator_confirmed: false,
          specification: {
            plain_text: 'SECRET v2 retry and backward-compatibility details.',
          },
        },
      })
    )

    assert.equal(updated.authoring?.headRevision, 2)
    const head = (await db
      .from('task_authoring_heads')
      .where('task_id', task.id)
      .first()) as unknown as AuthoringHeadRow | undefined
    const specifications = (await db
      .from('task_specification_versions')
      .where('task_id', task.id)
      .orderBy('version_number', 'asc')) as unknown as SpecificationVersionNumberRow[]
    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(head?.revision, 2)
    assert.deepEqual(
      specifications.map((row) => row.version_number),
      [1, 2]
    )
    assert.equal(persistedTask.updated_at.toISO(), originalUpdatedAt)

    const staleKey = `task-authoring-stale:${crypto.randomUUID()}`
    await assert.rejects(
      () =>
        scenario.execute(
          task.id,
          new UpdateTaskDTO({
            authoring: {
              mode: 'evidence_enabled',
              intent: 'save_draft',
              idempotency_key: staleKey,
              expected_head_revision: 1,
              creator_confirmed: false,
              specification: { plain_text: 'Stale writer must roll back.' },
            },
          })
        ),
      ConflictException
    )

    assert.lengthOf(
      await db.from('task_specification_versions').where('task_id', task.id),
      2
    )
    assert.isNull(
      await db
        .from('task_authoring_idempotency_keys')
        .where('idempotency_key', staleKey)
        .first()
    )
    const audit = (await db
      .from('audit_events')
      .where('entity_type', 'task')
      .where('entity_id', task.id)
      .where('action', 'update')
      .first()) as unknown as TaskAuditEventRow | undefined
    assert.include(JSON.stringify(audit?.new_values), 'head_revision')
    assert.notInclude(JSON.stringify(audit?.new_values), 'SECRET')

    const published = await scenario.execute(
      task.id,
      new UpdateTaskDTO({
        assigned_to: scenario.owner.id,
        authoring: {
          mode: 'operational_only',
          intent: 'publish',
          idempotency_key: `task-authoring-publish:${crypto.randomUUID()}`,
          expected_head_revision: 2,
          creator_confirmed: true,
          constraints_addressed: true,
          dependencies_addressed: true,
          specification: {
            plain_text: 'Publish the self-contained pre-order API execution contract.',
            sections: [
              {
                id: crypto.randomUUID(),
                key: 'execution-brief',
                title: 'Execution brief',
                plainText: 'Implement lifecycle, retry behavior, compatibility, and tests.',
                critical: true,
                hasTextEquivalent: true,
              },
            ],
          },
          work_contract: TASK_WORK_CONTRACT_V1_FIXTURE,
          evidence_contract: {
            mode: 'operational_only',
            requirements: [],
            verificationMethods: [],
            verifierPolicy: {
              reviewerIds: [],
              reviewerRoleCodes: [],
              minimumReviewers: 0,
              disallowSelfReview: true,
            },
            capabilities: [],
            profileEligibility: false,
            privacyClassification: 'internal',
          },
        },
      })
    )
    const publishedHead = (await db
      .from('task_authoring_heads')
      .where('task_id', task.id)
      .first()) as unknown as AuthoringHeadRow | undefined
    const contract = (await db
      .from('task_contract_versions')
      .where('task_id', task.id)
      .where('version_number', 3)
      .first()) as unknown as TaskContractRow | undefined

    assert.equal(published.authoring?.headRevision, 3)
    assert.isTrue(published.authoring?.readiness.assignmentReady)
    assert.equal(publishedHead?.current_contract_version_id, contract?.id)
    assert.equal(contract?.readiness_state, 'ready_to_assign')

    const activeAssignment = (await db
      .from('task_assignments')
      .where('task_id', task.id)
      .where('assignment_status', 'active')
      .select('id')
      .first()) as { id: string } | undefined
    if (!activeAssignment) throw new Error('Expected the published Task to have an assignment')
    const reviewSession = await ReviewSessionFactory.create({
      task_assignment_id: activeAssignment.id,
      reviewee_id: scenario.owner.id,
      status: 'pending',
    })
    const materialUpdate = new UpdateTaskDTO({
      authoring: {
        mode: 'operational_only',
        intent: 'publish',
        idempotency_key: `task-authoring-material:${crypto.randomUUID()}`,
        expected_head_revision: 3,
        creator_confirmed: true,
        constraints_addressed: true,
        dependencies_addressed: true,
        specification: {
          plain_text: 'Publish the expanded pre-order API implementation contract.',
          sections: [
            {
              id: crypto.randomUUID(),
              key: 'execution-brief',
              title: 'Execution brief',
              plainText: 'Design and implement lifecycle, retry behavior, compatibility, and tests.',
              critical: true,
              hasTextEquivalent: true,
            },
          ],
        },
        work_contract: {
          ...TASK_WORK_CONTRACT_V1_FIXTURE,
          scope: [
            ...TASK_WORK_CONTRACT_V1_FIXTURE.scope,
            {
              id: crypto.randomUUID(),
              title: 'Production implementation',
              description: 'Implement the API rather than delivering design only.',
            },
          ],
        },
        evidence_contract: {
          mode: 'operational_only',
          requirements: [],
          verificationMethods: [],
          verifierPolicy: {
            reviewerIds: [],
            reviewerRoleCodes: [],
            minimumReviewers: 0,
            disallowSelfReview: true,
          },
          capabilities: [],
          profileEligibility: false,
          privacyClassification: 'internal',
        },
      },
    })

    await assert.rejects(
      () => scenario.execute(task.id, materialUpdate),
      'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED'
    )
    const headAfterReviewRejection = (await db
      .from('task_authoring_heads')
      .where('task_id', task.id)
      .first()) as unknown as AuthoringHeadRow | undefined
    assert.equal(headAfterReviewRejection?.revision, 3)
    assert.lengthOf(
      await db
        .from('task_assignment_snapshots')
        .where('task_id', task.id)
        .whereNotNull('schema_version'),
      1
    )

    reviewSession.status = 'disputed'
    await reviewSession.save()
    const disputeId = crypto.randomUUID()
    await db.table('review_disputes').insert({
      id: disputeId,
      review_session_id: reviewSession.id,
      task_assignment_id: activeAssignment.id,
      task_id: task.id,
      reviewee_id: scenario.owner.id,
      opened_by: scenario.owner.id,
      status: 'admin_reviewing',
      dispute_reason: 'The evidence basis requires an authoritative decision.',
      requested_outcome: 'request_re_review',
    })
    await assert.rejects(
      () => scenario.execute(task.id, materialUpdate),
      'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED'
    )

    await db.from('review_disputes').where('id', disputeId).update({ status: 'resolved' })
    reviewSession.status = 'completed'
    await reviewSession.save()
    const materiallyUpdated = await scenario.execute(task.id, materialUpdate)
    const assignmentSnapshots = (await db
      .from('task_assignment_snapshots')
      .select('id', 'snapshot_sequence', 'previous_snapshot_id', 'canonical_snapshot')
      .where('task_id', task.id)
      .whereNotNull('schema_version')
      .orderBy('snapshot_sequence', 'asc')) as Array<{
      id: string
      snapshot_sequence: number
      previous_snapshot_id: string | null
      canonical_snapshot: { acknowledgementBasis?: { kind?: string } }
    }>

    assert.equal(materiallyUpdated.authoring?.headRevision, 4)
    assert.lengthOf(assignmentSnapshots, 2)
    assert.equal(assignmentSnapshots[1]?.previous_snapshot_id, assignmentSnapshots[0]?.id)
    assert.equal(
      assignmentSnapshots[1]?.canonical_snapshot.acknowledgementBasis?.kind,
      'reacknowledgement_required'
    )
  }).timeout(10_000)

  test('does not create a version snapshot when only project_id changes', async ({ assert }) => {
    const scenario = await UpdateTaskScenario.create()
    const replacementProject = await scenario.createProject()
    const task = await scenario.createTask()

    const updatedTask = await scenario.execute(
      task.id,
      new UpdateTaskDTO({
        project_id: replacementProject.id,
      })
    )

    assert.equal(updatedTask.project_id, replacementProject.id)

    const versionSnapshot = await scenario.findVersionSnapshot(task.id)
    assert.isNull(versionSnapshot)
  })
})
