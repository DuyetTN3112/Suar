import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import Task from '#modules/tasks/infra/models/task-authoring/task'
import TaskStatusModel from '#modules/tasks/infra/models/task-status/task_status'
import { TASK_WORK_CONTRACT_V1_FIXTURE } from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import { TaskStatus } from '#modules/tasks/public_contracts/task_constants'
import CreateTaskScenario from '#modules/tasks/tests/backend/support/task-authoring/create_task_scenario'
import {
  cleanupTaskCreationTestData,
  setupTaskCreationTestGroup,
  teardownTaskCreationTestGroup,
} from '#modules/tasks/tests/backend/support/task-authoring/create_task_test_support'

test.group('Integration | Create Task - Draft and Operational Work Contracts', (group) => {
  group.setup(() => setupTaskCreationTestGroup())
  group.teardown(() => teardownTaskCreationTestGroup())
  group.each.teardown(() => cleanupTaskCreationTestData())

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
})
