import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  BusinessPolicyViolationException,
  ForbiddenPolicyViolationException,
} from '#modules/authorization/public_contracts/policy_violation'
import { TASK_WORK_CONTRACT_V1_FIXTURE } from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import Project from '#modules/projects/infra/models/project-context/project'
import type { TaskNotificationStager as NotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import TaskStatusModel from '#modules/tasks/infra/models/task-status/task_status'
import { TaskStatus } from '#modules/tasks/public_contracts/task_constants'
import CreateTaskScenario from '#modules/tasks/tests/backend/support/task-authoring/create_task_scenario'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

class FailingNotificationStager implements NotificationStager {
  public calls = 0
  public taskId: string | null = null

  public stage(command: Parameters<NotificationStager['stage']>[0]): Promise<never> {
    this.calls += 1
    this.taskId = command.subject?.id ?? null
    return Promise.reject(new Error('task creation notification staging failed'))
  }
}

async function checkTaskV5Schema(): Promise<boolean> {
  const rawResult: unknown = await db
    .from('information_schema.columns')
    .where('table_name', 'tasks')
    .whereIn('column_name', ['acceptance_criteria', 'verification_method'])
    .count('* as total')
    .first()

  const result = rawResult as { total?: number | string } | null
  const total = Number(result?.total ?? 0)
  return total >= 2
}

test.group('Integration | Create Task', (group) => {
  group.setup(async () => {
    await setupApp()
    const hasTaskV5Schema = await checkTaskV5Schema()
    if (!hasTaskV5Schema) {
      throw new Error(
        'Task integration tests require the current task schema with acceptance_criteria and verification_method columns'
      )
    }
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('creates task successfully with valid data', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const task = await scenario.create({
      title: 'Test Task Title',
      description: 'Test description',
    })

    assert.isNotNull(task)
    assert.equal(task.title, 'Test Task Title')
    assert.equal(task.status, TaskStatus.TODO)
    assert.equal(task.task_status_id, scenario.todoStatusId)
    assert.equal(task.creator_id, scenario.ownerId)

    const dbTask = await Task.find(task.id)
    assert.isNotNull(dbTask)
    const invalidation = (await db
      .from('search_projection_entity_revisions')
      .where('entity_type', 'task')
      .where('entity_id', task.id)
      .first()) as { operation?: string; source_revision?: string } | undefined
    assert.equal(invalidation?.operation, 'upsert')
    assert.isNotEmpty(invalidation?.source_revision)
  })

  test('creates a title-only Draft with immutable Specification/readiness rows and no fake skill requirement', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const task = await scenario.create({
      title: 'Draft pre-order API brief',
      description: '',
      acceptance_criteria: '',
      required_skill_ids: [],
      authoring: {
        mode: 'evidence_enabled',
        intent: 'save_draft',
        idempotency_key: `draft:pre-order:${crypto.randomUUID()}`,
        expected_head_revision: 0,
        creator_confirmed: false,
      },
    })

    const head = (await db
      .from('task_authoring_heads')
      .where('task_id', task.id)
      .first()) as unknown as
      | { current_specification_version_id: string; current_contract_version_id: string | null }
      | undefined
    const readiness = (await db
      .from('task_readiness_assessments')
      .where('task_id', task.id)
      .first()) as unknown as
      | { work_state: string; assignment_ready: boolean; evidence_ready: boolean }
      | undefined
    const requiredSkills = await db.from('task_required_skills').where('task_id', task.id)

    assert.equal(task.authoring?.intent, 'save_draft')
    assert.equal(task.authoring?.readiness.workState, 'draft')
    assert.isFalse(task.authoring?.readiness.assignmentReady)
    assert.isNotNull(head?.current_specification_version_id)
    assert.isNull(head?.current_contract_version_id)
    assert.equal(readiness?.work_state, 'draft')
    assert.isFalse(readiness?.assignment_ready)
    assert.isFalse(readiness?.evidence_ready)
    assert.lengthOf(requiredSkills, 0)
  })

  test('creates a Docs item without assignee, skills, or review contract', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const docsStatus = await TaskStatusModel.query()
      .where('organization_id', scenario.organizationId)
      .where('project_id', scenario.project.id)
      .where('slug', 'docs')
      .whereNull('deleted_at')
      .firstOrFail()

    const task = await scenario.create({
      title: 'Tài liệu triển khai môi trường kiểm thử',
      description: 'https://example.test/docs/test-environment',
      task_status_id: docsStatus.id,
      acceptance_criteria: '',
      required_skill_ids: [],
      authoring: {
        mode: 'operational_only',
        intent: 'save_draft',
        idempotency_key: `docs:${crypto.randomUUID()}`,
        expected_head_revision: 0,
        creator_confirmed: false,
      },
    })

    assert.equal(task.task_status_id, docsStatus.id)
    assert.isNull(task.assigned_to)
    assert.equal(task.authoring?.intent, 'save_draft')
    assert.isFalse(task.authoring?.readiness.assignmentReady)
    assert.isFalse(task.authoring?.readiness.evidenceReady)
  })

  test('rejects an API request that tries to publish a Docs item as work', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const docsStatus = await TaskStatusModel.query()
      .where('organization_id', scenario.organizationId)
      .where('project_id', scenario.project.id)
      .where('slug', 'docs')
      .whereNull('deleted_at')
      .firstOrFail()
    const title = `Không xuất bản Docs ${crypto.randomUUID()}`

    await assert.rejects(
      () =>
        scenario.create({
          title,
          task_status_id: docsStatus.id,
          authoring: {
            mode: 'evidence_enabled',
            intent: 'publish',
            idempotency_key: `docs:publish:${crypto.randomUUID()}`,
            expected_head_revision: 0,
            creator_confirmed: true,
          },
        }),
      'Mục Docs chỉ để lưu thông tin chung và không thể đi vào quy trình công việc.'
    )

    assert.isNull(
      await Task.query()
        .where('organization_id', scenario.organizationId)
        .where('title', title)
        .first()
    )
  })

  test('deduplicates a browser retry with the same authoring idempotency key and payload', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const idempotencyKey = `draft:retry:${crypto.randomUUID()}`
    const payload = {
      title: 'Retry-safe Draft',
      description: '',
      acceptance_criteria: '',
      required_skill_ids: [],
      authoring: {
        mode: 'operational_only' as const,
        intent: 'save_draft' as const,
        idempotency_key: idempotencyKey,
        expected_head_revision: 0,
        creator_confirmed: false,
      },
    }

    const first = await scenario.create(payload)
    const retry = await scenario.create(payload)

    assert.equal(retry.id, first.id)
    const tasks = await Task.query()
      .where('organization_id', scenario.organizationId)
      .where('title', payload.title)
      .whereNull('deleted_at')
    assert.lengthOf(tasks, 1)
    assert.lengthOf(
      await db
        .from('task_authoring_idempotency_keys')
        .where('organization_id', scenario.organizationId)
        .where('idempotency_key', idempotencyKey),
      1
    )
  })

  test('rolls a link-only Draft assignment back instead of creating unverifiable work', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const assignee = await scenario.createOrgMember()
    const title = `Link-only assignment ${crypto.randomUUID()}`

    await assert.rejects(
      () =>
        scenario.create({
          title,
          description: 'See the external document.',
          assigned_to: assignee.id,
          required_skill_ids: [],
          authoring: {
            mode: 'evidence_enabled',
            intent: 'save_draft',
            idempotency_key: `link-only:${crypto.randomUUID()}`,
            expected_head_revision: 0,
            creator_confirmed: false,
            supporting_references: [
              {
                type: 'document',
                uri: 'https://docs.example.test/private-task',
                title: 'Private task document',
                relevant_section: 'All requirements',
                relation: 'requirement_source',
                access_state: 'authenticated',
                privacy_classification: 'internal',
              },
            ],
          },
        }),
      'Task Draft chưa đủ điều kiện để giao'
    )

    assert.isNull(
      await Task.query()
        .where('organization_id', scenario.organizationId)
        .where('title', title)
        .first()
    )
    assert.lengthOf(await db.from('task_assignments').where('assignee_id', assignee.id), 0)
  })

  test('publishes a confirmed Operational-only Work Contract and returns readiness/version metadata', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const assignee = await scenario.createOrgMember()
    const referenceUri = `https://docs.example.test/pre-order/${crypto.randomUUID()}`
    const task = await scenario.create({
      title: 'Publish pre-order API contract',
      assigned_to: assignee.id,
      authoring: {
        mode: 'operational_only',
        intent: 'publish',
        idempotency_key: `publish:operational:${crypto.randomUUID()}`,
        expected_head_revision: 0,
        creator_confirmed: true,
        constraints_addressed: true,
        dependencies_addressed: true,
        specification: {
          rich_content: {
            type: 'doc',
            content: [{ type: 'paragraph', text: 'Implement the governed pre-order API.' }],
          },
          plain_text:
            'Implement and review the governed pre-order API, lifecycle, error contract, and tests.',
          sections: [
            {
              id: crypto.randomUUID(),
              key: 'execution-brief',
              title: 'Execution brief',
              plainText: 'Implement lifecycle, errors, idempotency, and integration tests.',
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
        supporting_references: [
          {
            type: 'document',
            uri: referenceUri,
            title: 'Original product document',
            relevant_section: 'Pre-order lifecycle',
            relation: 'requirement_source',
            access_state: 'authenticated',
            privacy_classification: 'internal',
          },
        ],
      },
    })

    const contract = (await db
      .from('task_contract_versions')
      .where('task_id', task.id)
      .first()) as unknown as
      | { id: string; readiness_state: string; evidence_contract: { mode?: string } }
      | undefined
    const references = (await db
      .from('task_supporting_references')
      .where('task_id', task.id)) as unknown as Array<{ uri: string }>
    const assignment = (await db
      .from('task_assignments')
      .where('task_id', task.id)
      .where('assignment_status', 'active')
      .first()) as { id: string } | undefined
    const assignmentSnapshot = (await db
      .from('task_assignment_snapshots')
      .where('task_id', task.id)
      .whereNotNull('schema_version')
      .first()) as
      | {
          task_contract_version_id: string
          canonical_snapshot: {
            acknowledgementBasis?: { kind?: string }
            snapshot?: { resolvedContract?: { work?: { action?: string } } }
          }
          acknowledgement_required: boolean
        }
      | undefined
    const assignmentHead = assignment
      ? ((await db
          .from('task_assignment_contract_heads')
          .where('task_assignment_id', assignment.id)
          .first()) as { revision: number; acknowledgement_state: string } | undefined)
      : undefined

    assert.equal(task.authoring?.intent, 'publish')
    assert.isTrue(task.authoring?.readiness.assignmentReady)
    assert.isFalse(task.authoring?.readiness.evidenceReady)
    assert.equal(task.authoring?.readiness.evidenceState, 'not_applicable')
    assert.equal(contract?.id, task.authoring?.contractVersionId)
    assert.equal(contract?.readiness_state, 'ready_to_assign')
    assert.equal(contract?.evidence_contract.mode, 'operational_only')
    assert.lengthOf(references, 1)
    assert.equal(references[0]?.uri, referenceUri)
    assert.isNotNull(assignment)
    assert.equal(assignmentSnapshot?.task_contract_version_id, contract?.id)
    assert.equal(
      assignmentSnapshot?.canonical_snapshot.acknowledgementBasis?.kind,
      'fresh_assignment'
    )
    assert.equal(
      assignmentSnapshot?.canonical_snapshot.snapshot?.resolvedContract?.work?.action,
      TASK_WORK_CONTRACT_V1_FIXTURE.action
    )
    assert.isTrue(assignmentSnapshot?.acknowledgement_required)
    assert.equal(assignmentHead?.revision, 1)
    assert.equal(assignmentHead?.acknowledgement_state, 'pending')
  })

  test('rolls back the Task, audit, and idempotency fence when initial authoring revision is stale', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Stale initial authoring Task'
    const idempotencyKey = `draft:stale:${crypto.randomUUID()}`

    await assert.rejects(
      () =>
        scenario.create({
          title,
          description: '',
          acceptance_criteria: '',
          required_skill_ids: [],
          authoring: {
            mode: 'operational_only',
            intent: 'save_draft',
            idempotency_key: idempotencyKey,
            expected_head_revision: 1,
            creator_confirmed: false,
          },
        }),
      ConflictException
    )

    assert.isNull(
      await Task.query()
        .where('organization_id', scenario.organizationId)
        .where('title', title)
        .first()
    )
    assert.isNull(
      (await db
        .from('task_authoring_idempotency_keys')
        .where('organization_id', scenario.organizationId)
        .where('idempotency_key', idempotencyKey)
        .first()) as unknown
    )
  })

  test('task organization_id stays aligned with the owning project organization as a denormalized invariant', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const task = await scenario.create({
      title: 'Org Task',
    })
    const project = await Project.findOrFail(task.project_id)

    assert.equal(project.organization_id, scenario.organizationId)
    assert.equal(task.organization_id, project.organization_id)
  })

  test('creates audit log after task creation', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const task = await scenario.create({
      title: 'Audited Task',
    })

    const logs = await db
      .from('audit_events')
      .where('entity_type', 'task')
      .where('entity_id', task.id)
      .where('action', 'create')

    assert.isAbove(logs.length, 0)
  })

  test('required assignment notification staging failure rolls task and audit back', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const assignee = await scenario.createOrgMember()
    const notification = new FailingNotificationStager()
    const title = 'Atomic assigned task'

    await assert.rejects(
      () =>
        scenario.createWithNotificationStager(
          {
            title,
            assigned_to: assignee.id,
          },
          notification
        ),
      'task creation notification staging failed'
    )

    const task = await Task.query()
      .where('organization_id', scenario.organizationId)
      .where('title', title)
      .first()
    const audit = notification.taskId
      ? ((await db
          .from('audit_events')
          .where('entity_type', 'task')
          .where('entity_id', notification.taskId)
          .where('action', 'create')
          .first()) as unknown)
      : null

    assert.equal(notification.calls, 1)
    assert.isNotNull(notification.taskId)
    assert.isNull(task)
    assert.isNull(audit)
  })

  test('assigned task and canonical projection intents commit together', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const assignee = await scenario.createOrgMember()

    const task = await scenario.create({
      title: 'Canonical assigned task',
      assigned_to: assignee.id,
    })

    const notification = (await db
      .from('notifications')
      .select('event_id', 'category', 'title', 'message', 'action')
      .where('user_id', assignee.id)
      .where('type', 'task_assigned')
      .where('related_entity_id', task.id)
      .first()) as {
      event_id: string
      category: string
      title: string
      message: string
      action: { routeName?: string } | null
    } | null

    assert.isNotNull(notification)
    if (!notification) return
    assert.equal(
      notification.event_id,
      buildNotificationEventId({
        eventName: 'task.created_assigned',
        businessEventId: task.id,
        recipientId: assignee.id,
      })
    )
    assert.equal(notification.category, 'task')
    assert.equal(notification.title, 'Bạn có nhiệm vụ mới')
    assert.include(notification.message, task.title)
    assert.equal(notification.action?.routeName, 'tasks.show')
    assert.lengthOf(
      await db.from('notification_outbox').where('source_event_id', notification.event_id),
      2
    )
  })

  test('throws when user is not active', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const inactiveUser = await scenario.createInactiveUser()

    await assert.rejects(
      () =>
        scenario.createAs(inactiveUser.id, {
          title: 'Should Fail',
        }),
      NotFoundException
    )
  })

  test('throws when user has no permission to create task', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const outsider = await scenario.createOutsider()

    await assert.rejects(
      () =>
        scenario.createAs(outsider.id, {
          title: 'Should Fail',
        }),
      ForbiddenPolicyViolationException
    )
  })

  test('throws when project does not belong to org', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const project = await scenario.createForeignProject()

    await assert.rejects(
      () =>
        scenario.create({
          title: 'Should Fail',
          project_id: project.id,
        }),
      BusinessLogicException
    )
  })

  test('rejects unknown project id and leaves task table unchanged', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Unknown Project Task'

    await assert.rejects(
      () =>
        scenario.create({
          title,
          project_id: crypto.randomUUID(),
        }),
      NotFoundException
    )

    const persistedTask = await Task.query().where('title', title).whereNull('deleted_at').first()

    assert.isNull(persistedTask)
  })

  test('assignee must be org member', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const outsider = await scenario.createOutsider()

    await assert.rejects(
      () =>
        scenario.create({
          title: 'Invalid Assignee',
          assigned_to: outsider.id,
        }),
      BusinessPolicyViolationException
    )
  })

  test('rejects unknown assignee id and leaves task table unchanged', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Unknown Assignee Task'

    await assert.rejects(
      () =>
        scenario.create({
          title,
          assigned_to: crypto.randomUUID(),
        }),
      BusinessPolicyViolationException
    )

    const persistedTask = await Task.query().where('title', title).whereNull('deleted_at').first()

    assert.isNull(persistedTask)
  })

  test('allows assigning a external_contributor outside the organization', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const externalContributor = await scenario.createExternalContributor()
    const task = await scenario.create({
      title: 'ExternalContributor Assignee Task',
      assigned_to: externalContributor.id,
      task_visibility: 'external',
    })

    assert.equal(task.assigned_to, externalContributor.id)
  })

  test('rolls back task creation if required skill validation fails after task insert', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Rollback Required Skill Task'
    const inactiveSkill = await scenario.createInactiveSkill()

    await assert.rejects(
      () =>
        scenario.create({
          title,
          required_skill_id: inactiveSkill.id,
        }),
      BusinessLogicException
    )

    const rolledBackTask = await Task.query()
      .where('project_id', scenario.project.id)
      .where('title', title)
      .whereNull('deleted_at')
      .first()

    assert.isNull(rolledBackTask)
  })

  test('parent task from another organization is rejected', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const parentTask = await scenario.createForeignParentTask()

    await assert.rejects(
      () =>
        scenario.create({
          title: 'Child Task',
          parent_task_id: parentTask.id,
        }),
      NotFoundException
    )
  })

  test('rejects creating a task with a past due date and leaves task table unchanged', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Past Due Date Task'

    await assert.rejects(
      () =>
        scenario.create({
          title,
          due_date: '2020-01-01',
        }),
      BusinessPolicyViolationException
    )

    const persistedTask = await Task.query().where('title', title).whereNull('deleted_at').first()

    assert.isNull(persistedTask)
  })

  test('rejects overlong descriptions and leaves task table unchanged', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Overlong Description Task'

    await assert.rejects(
      () =>
        scenario.create({
          title,
          description: 'D'.repeat(5001),
        }),
      ValidationException
    )

    const persistedTask = await Task.query().where('title', title).whereNull('deleted_at').first()

    assert.isNull(persistedTask)
  })

  test('rejects invalid create enum values and leaves task table unchanged', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const invalidEnumCases = [
      {
        title: 'Invalid Task Type Task',
        overrides: { task_type: 'fake_task_type' },
      },
      {
        title: 'Invalid Task Visibility Task',
        overrides: { task_visibility: 'fake_visibility' },
      },
    ] as const

    for (const invalidEnumCase of invalidEnumCases) {
      await assert.rejects(
        () =>
          scenario.create({
            title: invalidEnumCase.title,
            ...invalidEnumCase.overrides,
          }),
        ValidationException
      )

      const persistedTask = await Task.query()
        .where('title', invalidEnumCase.title)
        .whereNull('deleted_at')
        .first()

      assert.isNull(persistedTask)
    }
  })

  test('project manager can create task in their project', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const manager = await scenario.createProjectManager()

    const task = await scenario.createAs(manager.id, {
      title: 'Manager Task',
    })

    assert.equal(task.project_id, scenario.project.id)
  }).timeout(10_000)

  test('explicit Sprint assignment at task creation uses the planning boundary', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const sprintId = crypto.randomUUID()
    const now = DateTime.utc()
    await db.table('project_sprints').insert({
      id: sprintId,
      organization_id: scenario.organizationId,
      project_id: scenario.project.id,
      name: 'Creation Sprint',
      status: 'active',
      starts_at: now.minus({ days: 1 }).toSQL(),
      ends_at: now.plus({ days: 13 }).toSQL(),
      created_by: scenario.ownerId,
      created_at: now.toSQL(),
      updated_at: now.toSQL(),
    })

    const task = await scenario.create({ project_sprint_id: sprintId })
    const history = (await db
      .from('project_sprint_task_assignments')
      .where({ project_id: scenario.project.id, task_id: task.id })) as Array<{ sprint_id: string | null; added_after_start: boolean }>

    assert.equal(task.project_sprint_id, sprintId)
    assert.lengthOf(history, 1)
    assert.equal(history[0]?.sprint_id, sprintId)
    assert.isTrue(history[0]?.added_after_start)
  }).timeout(10_000)

  test('superadmin cannot create task without organization or project membership', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const superadmin = await scenario.createSuperadmin()

    await assert.rejects(
      () =>
        scenario.createAs(superadmin.id, {
          title: 'Superadmin Task',
        }),
      ForbiddenPolicyViolationException
    )
  })
})
