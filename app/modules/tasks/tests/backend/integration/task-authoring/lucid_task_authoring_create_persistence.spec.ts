import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { TASK_SPECIFICATION_VERSION_V1_FIXTURE } from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  TaskReadinessResultV1,
  TaskSpecificationVersionV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import type { PersistInitialTaskSpecificationInput } from '#modules/tasks/actions/ports/outbound/task-authoring/task_authoring_create_persistence'
import { TaskAuthoringIdempotentReplay } from '#modules/tasks/domain/task-authoring/task_authoring_idempotency'
import { LucidTaskAuthoringCreatePersistence } from '#modules/tasks/infra/adapters/task-authoring/lucid_task_authoring_create_persistence'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const AT = '2026-08-01T10:00:00.000Z'
const hash = (character: string): TvaSha256 => `sha256:${character.repeat(64)}`
const cleanupTaskIds = new Set<string>()
const cleanupKeys = new Set<string>()

interface IdempotencyFenceRow {
  task_id: string
  request_hash: string
}

interface AuthoringHeadRow {
  revision: number
  current_contract_version_id: string | null
}

interface ReadinessRow {
  work_state: string
  assignment_ready: boolean
}

function draftInput(
  overrides: {
    organizationId?: string
    actorId?: string
    idempotencyKey?: string
    requestHash?: TvaSha256
    taskId?: string
    specificationId?: string
    expectedHeadRevision?: number
    versionNumber?: number
  } = {}
): PersistInitialTaskSpecificationInput {
  const taskId = overrides.taskId ?? randomUUID()
  const specificationId = overrides.specificationId ?? randomUUID()
  const actorId = overrides.actorId ?? randomUUID()
  const organizationId = overrides.organizationId ?? randomUUID()
  const idempotencyKey = overrides.idempotencyKey ?? `create-task:${randomUUID()}`
  cleanupTaskIds.add(taskId)
  cleanupKeys.add(idempotencyKey)

  const specification: TaskSpecificationVersionV1 = {
    ...TASK_SPECIFICATION_VERSION_V1_FIXTURE,
    id: specificationId,
    taskId,
    versionNumber: overrides.versionNumber ?? 1,
    plainTextProjection: '',
    sectionIndex: [],
    projectContextVersionId: null,
    workPackageVersionId: null,
    authorId: actorId,
    confirmationState: 'draft',
    contentHash: hash('a'),
    sourceProvenance: {
      class: 'native_prework',
      sourceType: 'authored',
      sourceReferenceIds: [],
      confirmedBy: null,
      confirmedAt: null,
    },
    createdAt: AT,
  }
  const readiness: TaskReadinessResultV1 = {
    policyVersion: 'suar.task-readiness.v1',
    workState: 'draft',
    evidenceState: 'needs_clarification',
    assignmentReady: false,
    evidenceReady: false,
    blockers: [
      {
        code: 'TVA.WORK.SPECIFICATION_MISSING',
        severity: 'blocker',
        fieldPath: 'specification.plainText',
        sourcePath: null,
        message: 'The local specification is incomplete.',
        remediationHint: 'Add local execution-critical content.',
      },
    ],
    warnings: [],
    assessedAt: AT,
  }

  return {
    organizationId,
    actorId,
    authoringMode: 'evidence_enabled',
    authoringIntent: 'save_draft',
    idempotencyKey,
    requestHash: overrides.requestHash ?? hash('b'),
    expectedHeadRevision: overrides.expectedHeadRevision ?? 0,
    specification,
    supportingReferences: [],
    readinessAudit: {
      assessmentInput: { taskId, specificationVersionId: specificationId },
      inputHash: hash('c'),
      resultHash: hash('d'),
      result: readiness,
    },
  }
}

async function cleanup(): Promise<void> {
  if (cleanupKeys.size > 0) {
    await db
      .from('task_authoring_idempotency_keys')
      .whereIn('idempotency_key', [...cleanupKeys])
      .delete()
  }
  if (cleanupTaskIds.size > 0) {
    const taskIds = [...cleanupTaskIds]
    for (const table of [
      'task_authoring_heads',
      'task_readiness_assessments',
      'task_supporting_references',
      'task_contract_versions',
      'task_specification_versions',
    ]) {
      await db.from(table).whereIn('task_id', taskIds).delete()
    }
  }
  cleanupKeys.clear()
  cleanupTaskIds.clear()
}

test.group('Lucid Task authoring create persistence', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.each.teardown(() => cleanup())
  group.teardown(() => teardownApp())

  test('atomically persists the idempotency fence, Draft version, readiness audit, and head', async ({
    assert,
  }) => {
    const input = draftInput()
    const adapter = new LucidTaskAuthoringCreatePersistence()

    await db.transaction((trx) => adapter.persistInitialDraft(input, trx))

    const fence = (await db
      .from('task_authoring_idempotency_keys')
      .where('organization_id', input.organizationId)
      .where('actor_id', input.actorId)
      .where('idempotency_key', input.idempotencyKey)
      .first()) as unknown as IdempotencyFenceRow | undefined
    const head = (await db
      .from('task_authoring_heads')
      .where('task_id', input.specification.taskId)
      .first()) as unknown as AuthoringHeadRow | undefined
    const readiness = (await db
      .from('task_readiness_assessments')
      .where('task_id', input.specification.taskId)
      .first()) as unknown as ReadinessRow | undefined

    assert.equal(fence?.task_id, input.specification.taskId)
    assert.equal(fence?.request_hash, input.requestHash)
    assert.equal(head?.revision, 1)
    assert.equal(head?.current_contract_version_id, null)
    assert.equal(readiness?.work_state, 'draft')
    assert.isFalse(readiness?.assignment_ready)
  })

  test('turns a same-payload browser retry into an idempotent replay for the original Task', async ({
    assert,
  }) => {
    const first = draftInput()
    const retry = draftInput({
      organizationId: first.organizationId,
      actorId: first.actorId,
      idempotencyKey: first.idempotencyKey,
      requestHash: first.requestHash,
    })
    const adapter = new LucidTaskAuthoringCreatePersistence()
    await db.transaction((trx) => adapter.persistInitialDraft(first, trx))

    let replay: TaskAuthoringIdempotentReplay | null = null
    try {
      await db.transaction((trx) => adapter.persistInitialDraft(retry, trx))
    } catch (error) {
      if (error instanceof TaskAuthoringIdempotentReplay) replay = error
      else throw error
    }

    assert.equal(replay?.taskId, first.specification.taskId)
    assert.equal(replay?.specificationVersionId, first.specification.id)
    assert.deepInclude(
      (replay as unknown as { summary?: Record<string, unknown> } | null)?.summary ?? {},
      {
        mode: 'evidence_enabled',
        intent: 'save_draft',
        specificationVersionId: first.specification.id,
        contractVersionId: null,
        headRevision: 1,
        idempotencyKey: first.idempotencyKey,
        requestHash: first.requestHash,
      }
    )
    const retrySpecifications = await db
      .from('task_specification_versions')
      .where('task_id', retry.specification.taskId)
    assert.lengthOf(retrySpecifications, 0)
  })

  test('rejects key reuse with a changed payload and rolls back a stale initial revision fence', async ({
    assert,
  }) => {
    const first = draftInput()
    const collision = draftInput({
      organizationId: first.organizationId,
      actorId: first.actorId,
      idempotencyKey: first.idempotencyKey,
      requestHash: hash('e'),
    })
    const stale = draftInput({ expectedHeadRevision: 1 })
    const adapter = new LucidTaskAuthoringCreatePersistence()
    await db.transaction((trx) => adapter.persistInitialDraft(first, trx))

    await assert.rejects(
      () => db.transaction((trx) => adapter.persistInitialDraft(collision, trx)),
      ConflictException
    )
    await assert.rejects(
      () => db.transaction((trx) => adapter.persistInitialDraft(stale, trx)),
      ConflictException
    )

    const staleFence = (await db
      .from('task_authoring_idempotency_keys')
      .where('idempotency_key', stale.idempotencyKey)
      .first()) as unknown as IdempotencyFenceRow | undefined
    assert.isNull(staleFence)
  })

  test('advances an existing head and rejects a stale competing writer without leaking rows', async ({
    assert,
  }) => {
    const initial = draftInput()
    const version = draftInput({
      organizationId: initial.organizationId,
      actorId: initial.actorId,
      taskId: initial.specification.taskId,
      expectedHeadRevision: 1,
      versionNumber: 2,
    })
    const stale = draftInput({
      organizationId: initial.organizationId,
      actorId: initial.actorId,
      taskId: initial.specification.taskId,
      expectedHeadRevision: 1,
      versionNumber: 2,
    })
    const adapter = new LucidTaskAuthoringCreatePersistence()

    await db.transaction((trx) => adapter.persistInitialDraft(initial, trx))
    await db.transaction((trx) => adapter.persistVersionDraft(version, trx))
    await assert.rejects(
      () => db.transaction((trx) => adapter.persistVersionDraft(stale, trx)),
      ConflictException
    )

    const head = (await db
      .from('task_authoring_heads')
      .where('task_id', initial.specification.taskId)
      .first()) as unknown as AuthoringHeadRow | undefined
    const specifications = (await db
      .from('task_specification_versions')
      .where('task_id', initial.specification.taskId)
      .orderBy('version_number', 'asc')) as unknown as Array<{ version_number: number }>
    const staleFence = (await db
      .from('task_authoring_idempotency_keys')
      .where('idempotency_key', stale.idempotencyKey)
      .first()) as unknown as IdempotencyFenceRow | undefined

    assert.equal(head?.revision, 2)
    assert.deepEqual(
      specifications.map((row) => row.version_number),
      [1, 2]
    )
    assert.isNull(staleFence)
  })
})
