import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import {
  BusinessPolicyViolationException,
  ForbiddenPolicyViolationException,
} from '#modules/authorization/public_contracts/policy_violation'
import { TASK_WORK_CONTRACT_V1_FIXTURE } from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import CreateTaskDTO from '#modules/tasks/actions/dtos/request/task-authoring/create_task_dto'
import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import type { TaskNotificationStager as NotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import {
  UpdateTaskScenario,
} from '#modules/tasks/tests/backend/support/update_task_scenario'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, ReviewSessionFactory } from '#tests/helpers/factories'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


interface AuthoringHeadRow {
  revision: number
  current_contract_version_id: string | null
}

interface SpecificationVersionNumberRow {
  version_number: number
}

interface TaskAuditEventRow {
  new_values: Record<string, unknown>
}

interface TaskContractRow {
  id: string
  readiness_state: string
}

class FailingNotificationStager implements NotificationStager {
  public calls = 0

  public stage(): Promise<never> {
    this.calls += 1
    return Promise.reject(new Error('task update notification staging failed'))
  }
}

test.group('Integration | Update Task', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

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
    const occurredAt = persistedTask.updated_at.toUTC().toISO()
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
  })

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

  test('does not send a notification when assigning the task to the updater themself', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const task = await scenario.createTask({ assigned_to: null })
    const notificationSpy = scenario.createNotificationSpy()

    await scenario.executeWithNotification(
      task.id,
      new UpdateTaskDTO({
        assigned_to: scenario.owner.id,
      }),
      scenario.owner.id,
      notificationSpy
    )

    assert.lengthOf(notificationSpy.calls, 0)
  })

  test('notifies the previous assignee when the task is unassigned', async ({ assert }) => {
    const scenario = await UpdateTaskScenario.create()
    const assignee = await scenario.createOrgMember()
    const task = await scenario.createTask({
      assigned_to: assignee.id,
    })
    const notificationSpy = scenario.createNotificationSpy()

    await scenario.executeWithNotification(
      task.id,
      new UpdateTaskDTO({
        assigned_to: null,
      }),
      scenario.owner.id,
      notificationSpy
    )

    assert.lengthOf(notificationSpy.calls, 1)
    assert.equal(notificationSpy.calls[0]?.recipientId, assignee.id)
    assert.equal(notificationSpy.calls[0]?.type, 'task_updated')
  })

  test('required assignee notification staging failure rolls update, version, and audit back', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const assignee = await scenario.createOrgMember()
    const task = await scenario.createTask({
      title: 'Atomic update task',
      assigned_to: null,
    })
    const notification = new FailingNotificationStager()

    await assert.rejects(
      () =>
        scenario.executeWithNotification(
          task.id,
          new UpdateTaskDTO({ assigned_to: assignee.id }),
          scenario.owner.id,
          notification
        ),
      'task update notification staging failed'
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(notification.calls, 1)
    assert.isNull(persistedTask.assigned_to)
    assert.isNull(await scenario.findVersionSnapshot(task.id))
    assert.equal(await scenario.countUpdateAuditLogs(task.id), 0)
  })

  test('rejects invalid assignee updates and leaves task state unchanged', async ({ assert }) => {
    const scenario = await UpdateTaskScenario.create()
    const outsider = await scenario.createForeignOrg()
    const task = await scenario.createTask({
      title: 'Unchanged task title',
      assigned_to: null,
    })

    await assert.rejects(
      () =>
        scenario.execute(
          task.id,
          new UpdateTaskDTO({
            assigned_to: outsider.owner.id,
          })
        ),
      BusinessPolicyViolationException
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.title, 'Unchanged task title')
    assert.isNull(persistedTask.assigned_to)

    const versionSnapshot = await scenario.findVersionSnapshot(task.id)
    assert.isNull(versionSnapshot)
    assert.equal(await scenario.countUpdateAuditLogs(task.id), 0)
  })

  test('rejects updates when actor lacks task field permission and leaves task untouched', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const member = await scenario.createOrgMember()
    const task = await scenario.createTask({
      title: 'Permission Locked Task',
    })

    await assert.rejects(
      () =>
        scenario.execute(
          task.id,
          new UpdateTaskDTO({
            title: 'Should Not Persist',
          }),
          member.id
        ),
      ForbiddenPolicyViolationException
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.title, 'Permission Locked Task')
    assert.isNull(await scenario.findVersionSnapshot(task.id))
    assert.equal(await scenario.countUpdateAuditLogs(task.id), 0)
  })

  test('rejects updates when current organization context does not match the task', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const otherOrg = await scenario.createForeignOrg()
    const task = await scenario.createTask()

    await assert.rejects(
      () =>
        scenario.executeWithNotification(
          task.id,
          new UpdateTaskDTO({
            title: 'Should be rejected',
          }),
          scenario.owner.id,
          scenario.createNotificationSpy(),
          otherOrg.org.id
        ),
      ForbiddenPolicyViolationException
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.notEqual(persistedTask.title, 'Should be rejected')
    assert.isNull(await scenario.findVersionSnapshot(task.id))
    assert.equal(await scenario.countUpdateAuditLogs(task.id), 0)
  })

  test('rejects assigning a task to a sprint from another project', async ({ assert }) => {
    const scenario = await UpdateTaskScenario.create()
    const otherProject = await scenario.createProject()
    const foreignSprintId = crypto.randomUUID()
    const task = await scenario.createTask({ title: 'Backlog task' })

    await db.table('project_sprints').insert({
      id: foreignSprintId,
      organization_id: scenario.org.id,
      project_id: otherProject.id,
      name: 'Foreign sprint',
      status: 'active',
      starts_at: DateTime.utc().minus({ days: 1 }).toSQL(),
      ends_at: DateTime.utc().plus({ days: 13 }).toSQL(),
      created_by: scenario.owner.id,
      created_at: DateTime.utc().toSQL(),
      updated_at: DateTime.utc().toSQL(),
    })

    await assert.rejects(
      () =>
        scenario.execute(
          task.id,
          new UpdateTaskDTO({
            project_sprint_id: foreignSprintId,
          })
        ),
      BusinessPolicyViolationException
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.isNull(persistedTask.project_sprint_id)
    assert.isNull(await scenario.findVersionSnapshot(task.id))
    assert.equal(await scenario.countUpdateAuditLogs(task.id), 0)
  })

  test('routes same-project sprint assignment through planning history', async ({ assert }) => {
    const scenario = await UpdateTaskScenario.create()
    const sprintId = crypto.randomUUID()
    const now = DateTime.utc()
    const task = await scenario.createTask({ title: 'Planning boundary task' })

    await db.table('project_sprints').insert({
      id: sprintId,
      organization_id: scenario.org.id,
      project_id: scenario.project.id,
      name: 'Active planning sprint',
      status: 'active',
      starts_at: now.minus({ days: 1 }).toSQL(),
      ends_at: now.plus({ days: 13 }).toSQL(),
      created_by: scenario.owner.id,
      created_at: now.toSQL(),
      updated_at: now.toSQL(),
    })

    await scenario.execute(
      task.id,
      new UpdateTaskDTO({ project_sprint_id: sprintId })
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.project_sprint_id, sprintId)
    const history = (await db
      .from('project_sprint_task_assignments')
      .where({ project_id: scenario.project.id, task_id: task.id })
      .orderBy('entered_at', 'asc')) as Array<{ sprint_id: string | null; added_after_start: boolean }>

    assert.lengthOf(history, 2)
    assert.isNull(history[0]?.sprint_id)
    assert.equal(history[1]?.sprint_id, sprintId)
    assert.isTrue(history[1]?.added_after_start)
  })

  test('rejects updating a task parent to one of its descendants', async ({ assert }) => {
    const scenario = await UpdateTaskScenario.create()
    const parentTask = await scenario.createTask({
      title: 'Parent Task',
    })
    const childTask = await scenario.createTask({
      title: 'Child Task',
      parent_task_id: parentTask.id,
    })

    await assert.rejects(
      () =>
        scenario.execute(
          parentTask.id,
          new UpdateTaskDTO({
            parent_task_id: childTask.id,
          })
        ),
      BusinessPolicyViolationException
    )

    const persistedParent = await Task.findOrFail(parentTask.id)
    assert.isNull(persistedParent.parent_task_id)
    assert.isNull(await scenario.findVersionSnapshot(parentTask.id))
    assert.equal(await scenario.countUpdateAuditLogs(parentTask.id), 0)
  })

  test('rejects stale version updates and leaves newer task state unchanged', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const task = await scenario.createTask({
      title: 'Original concurrent task',
    })
    const staleUpdatedAt = task.updated_at.toISO()

    await scenario.execute(
      task.id,
      new UpdateTaskDTO({
        title: 'Fresh update wins',
      })
    )

    await assert.rejects(
      () =>
        scenario.execute(
          task.id,
          new UpdateTaskDTO(omitUndefined({
            title: 'Stale update loses',
            expected_updated_at: staleUpdatedAt ?? undefined,
          }))
        ),
      /đã được cập nhật bởi người khác/
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.title, 'Fresh update wins')
  })
})
