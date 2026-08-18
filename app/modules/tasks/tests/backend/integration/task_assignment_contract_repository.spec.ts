import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE,
  TASK_CONTRACT_VERSION_V1_FIXTURE,
  TASK_SPECIFICATION_VERSION_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  ResolvedTaskContractV1,
  TaskContractVersionV1,
  TaskSpecificationVersionV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import AcknowledgeTaskAssignmentContractCommand from '#modules/tasks/actions/commands/task-assignment/acknowledge_task_assignment_contract_command'
import RequestTaskAssignmentClarificationCommand from '#modules/tasks/actions/commands/task-assignment/request_task_assignment_clarification_command'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { CanonicalTaskAssignmentContractSnapshotV1 } from '#modules/tasks/domain/task-assignment/task_assignment_contract_snapshot'
import {
  assignmentAcknowledgementRequestHashInput,
  assignmentClarificationRequestHashInput,
} from '#modules/tasks/domain/task-assignment/task_assignment_interaction_request'
import {
  classifyTaskContractChange,
  classifyTaskContractChangeV1,
  INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1,
} from '#modules/tasks/domain/task-authoring/task_contract_change_classifier'
import { LucidTaskAssignmentContractRepository } from '#modules/tasks/infra/adapters/task-assignment/lucid_task_assignment_contract_repository'
import { LucidTaskTransactionRunner } from '#modules/tasks/infra/adapters/task-reading/lucid_task_transaction_runner'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'
import TaskSpecificationContractRepository from '#modules/tasks/infra/repositories/task-authoring/task_specification_contract_repository'
import User from '#modules/users/infra/models/profile/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  ProjectFactory,
  TaskAssignmentFactory,
  TaskFactory,
} from '#tests/helpers/factories/project_task'
import { OrganizationFactory, OrganizationUserFactory, UserFactory } from '#tests/helpers/factories/user_org'

const repository = new LucidTaskAssignmentContractRepository()
const hasher = new NodeTaskContractContentHasher()
const creatorId = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.assignedBy
const assigneeId = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.assigneeId
const organizationId = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.organizationId
const projectId = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.projectId
const taskId = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.taskId
const assignmentId = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.assignmentId
const hash = (character: string): TvaSha256 => `sha256:${character.repeat(64)}`
const actionContext: TaskActionContext = {
  userId: assigneeId,
  ip: '127.0.0.1',
  userAgent: 'integration-test',
  organizationId,
}

async function assertPostgresConstraintError(
  operation: () => Promise<unknown>,
  expectedCode: '23503' | '23505' | '23514',
  expectedConstraint: string
): Promise<void> {
  let caught: unknown
  try {
    await operation()
  } catch (error: unknown) {
    caught = error
  }
  const postgresError = caught as { code?: unknown; constraint?: unknown } | null
  if (
    !postgresError ||
    postgresError.code !== expectedCode ||
    postgresError.constraint !== expectedConstraint
  ) {
    throw new Error(
      `Expected PostgreSQL ${expectedCode} from ${expectedConstraint}, received code=${String(postgresError?.code)} constraint=${String(postgresError?.constraint)}`,
      { cause: caught }
    )
  }
}

function interactionDependencies(nowIso: string = '2026-08-01T10:00:00.000Z') {
  return {
    repository,
    transactions: new LucidTaskTransactionRunner(),
    hasher,
    clock: { nowIso: () => nowIso },
    identityFactory: { nextId: () => randomUUID() },
  }
}

const workFieldProvenance: CanonicalTaskAssignmentContractSnapshotV1['workFieldProvenance'] = {
  action: {
    source: 'task',
    sourceVersionId: TASK_SPECIFICATION_VERSION_V1_FIXTURE.id,
    inherited: false,
    privacyClassification: 'internal',
  },
  environment: {
    source: 'project_context',
    sourceVersionId: TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.provenance.projectContextVersionId,
    inherited: true,
    privacyClassification: 'internal',
  },
}

function integrityValidBaseBundle() {
  const specificationWithoutHash: TaskSpecificationVersionV1 = {
    ...TASK_SPECIFICATION_VERSION_V1_FIXTURE,
  }
  const specification: TaskSpecificationVersionV1 = {
    ...specificationWithoutHash,
    contentHash: hasher.hash({
      schemaVersion: specificationWithoutHash.schemaVersion,
      taskId: specificationWithoutHash.taskId,
      versionNumber: specificationWithoutHash.versionNumber,
      richContent: specificationWithoutHash.richContent,
      plainTextProjection: specificationWithoutHash.plainTextProjection,
      sectionIndex: specificationWithoutHash.sectionIndex,
      projectContextVersionId: specificationWithoutHash.projectContextVersionId,
      workPackageVersionId: specificationWithoutHash.workPackageVersionId,
      confirmationState: specificationWithoutHash.confirmationState,
      sourceProvenance: specificationWithoutHash.sourceProvenance,
    }),
  }
  const resolvedWithoutHash = {
    ...TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract,
    specification: {
      versionId: specification.id,
      richContent: specification.richContent,
      plainText: specification.plainTextProjection,
      sections: specification.sectionIndex,
    },
  }
  const resolvedContract: ResolvedTaskContractV1 = {
    ...resolvedWithoutHash,
    resolvedContentHash: hasher.hash({
      schemaVersion: resolvedWithoutHash.schemaVersion,
      taskId: resolvedWithoutHash.taskId,
      versionId: resolvedWithoutHash.versionId,
      title: resolvedWithoutHash.title,
      specification: resolvedWithoutHash.specification,
      work: resolvedWithoutHash.work,
      evidence: resolvedWithoutHash.evidence,
      supportingReferences: resolvedWithoutHash.supportingReferences,
      inheritedFrom: resolvedWithoutHash.inheritedFrom,
      readiness: resolvedWithoutHash.readiness,
    }),
  }
  const contractWithoutHash: TaskContractVersionV1 = {
    ...TASK_CONTRACT_VERSION_V1_FIXTURE,
    workContract: resolvedContract.work,
    evidenceContract: resolvedContract.evidence,
    resolvedContract,
  }
  const contract: TaskContractVersionV1 = {
    ...contractWithoutHash,
    contentHash: hasher.hash({
      schemaVersion: contractWithoutHash.schemaVersion,
      taskId: contractWithoutHash.taskId,
      taskSpecificationVersionId: contractWithoutHash.taskSpecificationVersionId,
      versionNumber: contractWithoutHash.versionNumber,
      workContract: contractWithoutHash.workContract,
      evidenceContract: contractWithoutHash.evidenceContract,
      resolvedContract: contractWithoutHash.resolvedContract,
      readinessState: contractWithoutHash.readinessState,
      creatorConfirmedBy: contractWithoutHash.creatorConfirmedBy,
      creatorConfirmedAt: contractWithoutHash.creatorConfirmedAt,
    }),
  }
  return { specification, contract }
}

const baseBundle = integrityValidBaseBundle()

function envelope(
  input: {
    id?: string
    snapshotHash?: TvaSha256
    createdAt?: string
    roleInTask?: string
    assignmentId?: string
    assigneeId?: string
    resolvedContract?: ResolvedTaskContractV1
    taskSpecificationVersionId?: string
    taskContractVersionId?: string
    capabilityRubricVersionIds?: readonly string[]
    readinessFindingCodesResolved?: readonly string[]
    acknowledgementRequired?: boolean
    acknowledgementBasis?: CanonicalTaskAssignmentContractSnapshotV1['acknowledgementBasis']
    changeDecision?: CanonicalTaskAssignmentContractSnapshotV1['changeDecision']
  } = {}
): CanonicalTaskAssignmentContractSnapshotV1 {
  const { snapshotHash: _fixtureHash, ...snapshotWithoutHash } = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE
  const snapshot = {
    ...snapshotWithoutHash,
    id: input.id ?? TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.id,
    assignmentId: input.assignmentId ?? TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.assignmentId,
    assigneeId: input.assigneeId ?? TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.assigneeId,
    createdAt: input.createdAt ?? TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.createdAt,
    roleInTask: input.roleInTask ?? TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.roleInTask,
    resolvedContract: input.resolvedContract ?? baseBundle.contract.resolvedContract,
    provenance: {
      ...snapshotWithoutHash.provenance,
      taskSpecificationVersionId:
        input.taskSpecificationVersionId ??
        snapshotWithoutHash.provenance.taskSpecificationVersionId,
      taskContractVersionId:
        input.taskContractVersionId ?? snapshotWithoutHash.provenance.taskContractVersionId,
      capabilityRubricVersionIds:
        input.capabilityRubricVersionIds ??
        snapshotWithoutHash.provenance.capabilityRubricVersionIds,
    },
    acknowledgementRequired:
      input.acknowledgementRequired ?? TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.acknowledgementRequired,
    readinessFindingCodesResolved:
      input.readinessFindingCodesResolved ?? [],
  }
  const acknowledgementBasis =
    input.acknowledgementBasis ??
    ({
      kind: 'fresh_assignment',
      previousSnapshotId: null,
      previousAcknowledgementState: null,
      changeClass: 'initial',
    } as const)
  const changeDecision =
    input.changeDecision ??
    (acknowledgementBasis.kind === 'fresh_assignment'
      ? INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1
      : classifyTaskContractChangeV1({
          previous: baseBundle.contract.resolvedContract,
          next: snapshot.resolvedContract,
        }))
  return {
    schemaVersion: 'suar.task_assignment_contract_snapshot.v1',
    snapshot: {
      ...snapshot,
      snapshotHash:
        input.snapshotHash ??
        hasher.hash({
          envelopeSchemaVersion: 'suar.task_assignment_contract_snapshot.v1',
          snapshot,
          workFieldProvenance,
          acknowledgementBasis,
          changeDecision,
        }),
    },
    workFieldProvenance,
    acknowledgementBasis,
    changeDecision,
  }
}

function materiallyChangedBundle() {
  const base = baseBundle.contract.resolvedContract
  const specificationId = randomUUID()
  const contractId = randomUUID()
  const specificationWithoutHash: TaskSpecificationVersionV1 = {
    ...TASK_SPECIFICATION_VERSION_V1_FIXTURE,
    id: specificationId,
    versionNumber: 2,
    changeClass: 'material_scope',
    changeReason: 'Security fixture for a materially expanded successor',
  }
  const specification: TaskSpecificationVersionV1 = {
    ...specificationWithoutHash,
    contentHash: hasher.hash({
      schemaVersion: specificationWithoutHash.schemaVersion,
      taskId: specificationWithoutHash.taskId,
      versionNumber: specificationWithoutHash.versionNumber,
      richContent: specificationWithoutHash.richContent,
      plainTextProjection: specificationWithoutHash.plainTextProjection,
      sectionIndex: specificationWithoutHash.sectionIndex,
      projectContextVersionId: specificationWithoutHash.projectContextVersionId,
      workPackageVersionId: specificationWithoutHash.workPackageVersionId,
      confirmationState: specificationWithoutHash.confirmationState,
      sourceProvenance: specificationWithoutHash.sourceProvenance,
    }),
  }
  const resolvedWithoutHash = {
    ...base,
    versionId: contractId,
    specification: {
      versionId: specificationId,
      richContent: specification.richContent,
      plainText: specification.plainTextProjection,
      sections: specification.sectionIndex,
    },
    work: {
      ...base.work,
      scope: [
        ...base.work.scope,
        {
          id: randomUUID(),
          title: 'Production rollout ownership',
          description: 'Own the production rollout, rollback, and live-traffic migration.',
        },
      ],
    },
  }
  const resolvedContract: ResolvedTaskContractV1 = {
    ...resolvedWithoutHash,
    resolvedContentHash: hasher.hash({
      schemaVersion: resolvedWithoutHash.schemaVersion,
      taskId: resolvedWithoutHash.taskId,
      versionId: resolvedWithoutHash.versionId,
      title: resolvedWithoutHash.title,
      specification: resolvedWithoutHash.specification,
      work: resolvedWithoutHash.work,
      evidence: resolvedWithoutHash.evidence,
      supportingReferences: resolvedWithoutHash.supportingReferences,
      inheritedFrom: resolvedWithoutHash.inheritedFrom,
      readiness: resolvedWithoutHash.readiness,
    }),
  }
  const contractWithoutHash: TaskContractVersionV1 = {
    ...TASK_CONTRACT_VERSION_V1_FIXTURE,
    id: contractId,
    taskSpecificationVersionId: specificationId,
    versionNumber: 2,
    workContract: resolvedContract.work,
    resolvedContract,
    changeClass: 'material_scope',
    changeReason: 'Security fixture for a materially expanded successor',
  }
  const contract: TaskContractVersionV1 = {
    ...contractWithoutHash,
    contentHash: hasher.hash({
      schemaVersion: contractWithoutHash.schemaVersion,
      taskId: contractWithoutHash.taskId,
      taskSpecificationVersionId: contractWithoutHash.taskSpecificationVersionId,
      versionNumber: contractWithoutHash.versionNumber,
      workContract: contractWithoutHash.workContract,
      evidenceContract: contractWithoutHash.evidenceContract,
      resolvedContract: contractWithoutHash.resolvedContract,
      readinessState: contractWithoutHash.readinessState,
      creatorConfirmedBy: contractWithoutHash.creatorConfirmedBy,
      creatorConfirmedAt: contractWithoutHash.creatorConfirmedAt,
    }),
  }

  return {
    specification,
    contract,
    resolutionProvenance: workFieldProvenance,
    readinessAudit: {
      assessmentInput: { taskId, version: 2 },
      inputHash: hash('c'),
      resultHash: hash('d'),
      result: resolvedContract.readiness,
    },
    expectedHeadRevision: 1,
  }
}

async function createReviewSession(
  targetAssignmentId: string,
  revieweeId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'disputed'
): Promise<string> {
  const id = randomUUID()
  await db.table('review_sessions').insert({
    id,
    task_assignment_id: targetAssignmentId,
    reviewee_id: revieweeId,
    status,
    manager_review_completed: false,
    creator_reviewer_id: creatorId,
    creator_review_completed: false,
    manager_reviews_count: 0,
    peer_reviews_count: 0,
    required_peer_reviews: 1,
    required_total_reviews: 2,
    minimum_manager_reviews: 1,
    minimum_peer_reviews: 1,
    confirmations: null,
    created_at: '2026-08-01T08:30:00.000Z',
    updated_at: '2026-08-01T08:30:00.000Z',
  })
  return id
}

async function createReviewDispute(input: {
  readonly reviewSessionId: string
  readonly targetAssignmentId: string
  readonly targetTaskId: string
  readonly revieweeId: string
  readonly status: 'pending' | 'admin_reviewing' | 'resolved'
}): Promise<string> {
  const id = randomUUID()
  await db.table('review_disputes').insert({
    id,
    review_session_id: input.reviewSessionId,
    task_assignment_id: input.targetAssignmentId,
    task_id: input.targetTaskId,
    reviewee_id: input.revieweeId,
    opened_by: input.revieweeId,
    status: input.status,
    dispute_reason: 'Verify governed assignment Contract successor behavior.',
    requested_outcome: 'request_re_review',
    created_at: '2026-08-01T08:40:00.000Z',
    updated_at: '2026-08-01T08:40:00.000Z',
    resolved_at: input.status === 'resolved' ? '2026-08-01T08:50:00.000Z' : null,
    resolved_by: input.status === 'resolved' ? creatorId : null,
  })
  return id
}

async function createTaskReviewWorkflow(status: string): Promise<string> {
  const id = randomUUID()
  await db.table('task_review_workflows').insert({
    id,
    task_id: taskId,
    task_assignment_id: assignmentId,
    project_id: projectId,
    organization_id: organizationId,
    reviewee_id: assigneeId,
    status,
    required_review_count: 2,
    completed_review_count: status === 'completed' ? 2 : 0,
    created_at: '2026-08-01T08:20:00.000Z',
    updated_at: '2026-08-01T08:20:00.000Z',
  })
  return id
}

async function persistMaterialAuthoringBundle() {
  const changedBundle = materiallyChangedBundle()
  await db.transaction((trx) =>
    TaskSpecificationContractRepository.persistContractBundle(changedBundle, trx)
  )
  return changedBundle
}

function materialSuccessorEnvelope(
  predecessor: Awaited<ReturnType<LucidTaskAssignmentContractRepository['persistSnapshot']>>,
  changedBundle: ReturnType<typeof materiallyChangedBundle>,
  createdAt: string = '2026-08-01T09:30:00.000Z'
): CanonicalTaskAssignmentContractSnapshotV1 {
  const previousAcknowledgementState = predecessor.acknowledgementState
  if (previousAcknowledgementState === 'not_required') {
    throw new Error('Material successor test predecessor must carry an acknowledgement state')
  }
  return envelope({
    id: randomUUID(),
    createdAt,
    resolvedContract: changedBundle.contract.resolvedContract,
    taskSpecificationVersionId: changedBundle.specification.id,
    taskContractVersionId: changedBundle.contract.id,
    acknowledgementRequired: true,
    acknowledgementBasis: {
      kind: 'reacknowledgement_required',
      previousSnapshotId: predecessor.id,
      previousAcknowledgementState,
      changeClass: 'material_scope',
    },
  })
}

async function cleanupScenario(): Promise<void> {
  await db.from('review_disputes').where('task_assignment_id', assignmentId).delete()
  await db.from('review_sessions').where('task_assignment_id', assignmentId).delete()
  await db.from('task_review_workflows').where('task_id', taskId).delete()
  await db
    .from('task_assignment_clarification_requests')
    .where('task_assignment_id', assignmentId)
    .delete()
  await db
    .from('task_assignment_acknowledgements')
    .where('task_assignment_id', assignmentId)
    .delete()
  await db.from('task_assignment_contract_heads').where('task_assignment_id', assignmentId).delete()
  await db.from('task_assignment_snapshots').where('task_assignment_id', assignmentId).delete()

  for (const table of [
    'task_evidence_requirements',
    'task_supporting_references',
    'task_readiness_assessments',
    'task_authoring_heads',
    'task_contract_versions',
    'task_specification_versions',
  ]) {
    await db.from(table).where('task_id', taskId).delete()
  }

  await db.from('task_assignments').where('id', assignmentId).delete()
  await db.from('tasks').where('id', taskId).delete()
  await db.from('task_statuses').where('organization_id', organizationId).delete()
  await db.from('projects').where('id', projectId).delete()
  await db.from('organization_users').where('organization_id', organizationId).delete()
  await db.from('organizations').where('id', organizationId).delete()
  await db.from('users').whereIn('id', [creatorId, assigneeId]).delete()
}

async function createScenario(): Promise<void> {
  await cleanupScenario()
  await UserFactory.create({ id: creatorId })
  await UserFactory.create({ id: assigneeId })
  await OrganizationFactory.create({ id: organizationId, owner_id: creatorId })
  await ProjectFactory.create({
    id: projectId,
    organization_id: organizationId,
    creator_id: creatorId,
    owner_id: creatorId,
  })
  await TaskFactory.create({
    id: taskId,
    organization_id: organizationId,
    project_id: projectId,
    creator_id: creatorId,
    assigned_to: assigneeId,
  })
  await TaskAssignmentFactory.create({
    id: assignmentId,
    task_id: taskId,
    assignee_id: assigneeId,
    assigned_by: creatorId,
  })
  await db
    .from('task_assignments')
    .where('id', assignmentId)
    .update({ assigned_at: TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.createdAt })
  await db.transaction((trx) =>
    TaskSpecificationContractRepository.persistContractBundle(
      {
        specification: baseBundle.specification,
        contract: baseBundle.contract,
        resolutionProvenance: workFieldProvenance,
        readinessAudit: {
          assessmentInput: { taskId },
          inputHash: hash('a'),
          resultHash: hash('b'),
          result: baseBundle.contract.resolvedContract.readiness,
        },
        expectedHeadRevision: null,
      },
      trx
    )
  )
}

test.group('Integration | Task assignment Contract repository', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.each.setup(() => createScenario())
  group.each.teardown(() => cleanupScenario())
  group.teardown(() => teardownApp())

  test('persists the initial immutable snapshot and returns a stable idempotent replay', async ({
    assert,
  }) => {
    const input = {
      envelope: envelope(),
      idempotencyKey: 'assign-contract-v1',
      expectedHeadRevision: 0,
    }
    const initial = await db.transaction((trx) => repository.persistSnapshot(input, trx))
    const replay = await db.transaction((trx) => repository.persistSnapshot(input, trx))

    assert.equal(initial.sequence, 1)
    assert.isNull(initial.previousSnapshotId)
    assert.isFalse(initial.replayed)
    assert.deepEqual(
      { ...replay, replayed: false },
      initial,
      'A retry must reconstruct the same durable response'
    )
    assert.isTrue(replay.replayed)
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 1)
  })

  test('serializes concurrent retries so one durable snapshot wins and the other replays it', async ({
    assert,
  }) => {
    const input = {
      envelope: envelope(),
      idempotencyKey: 'assignment-concurrent-retry',
      expectedHeadRevision: 0,
    }
    const outcomes = await Promise.all([
      db.transaction((trx) => repository.persistSnapshot(input, trx)),
      db.transaction((trx) => repository.persistSnapshot(input, trx)),
    ])

    assert.sameMembers(
      outcomes.map((outcome) => outcome.replayed),
      [false, true]
    )
    assert.equal(outcomes[0].id, outcomes[1].id)
    assert.equal(outcomes[0].snapshotHash, outcomes[1].snapshotHash)
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 1)
  })

  test('rejects an idempotency key collision with a different canonical payload', async ({
    assert,
  }) => {
    await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-key-collision',
          expectedHeadRevision: 0,
        },
        trx
      )
    )

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: envelope({
                id: randomUUID(),
              }),
              idempotencyKey: 'assignment-key-collision',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      ConflictException
    )
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 1)
  })

  test('rejects a forged declared hash before any snapshot or head is stored', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: envelope({ snapshotHash: hash('c') }),
              idempotencyKey: 'assignment-forged-hash',
              expectedHeadRevision: 0,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 0)
    assert.lengthOf(await db.from('task_assignment_contract_heads').where('task_id', taskId), 0)
  })

  test('@security rejects self-consistent but forged immutable classifier metadata', async ({
    assert,
  }) => {
    const forged = envelope({
      changeDecision: {
        ...INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1,
        code: 'TVA.CHANGE.NONE',
        codes: [],
      },
    })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: forged,
              idempotencyKey: 'forged-initial-classifier-decision',
              expectedHeadRevision: 0,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 0)
  })

  test('@security rejects self-consistent readiness history claims absent from authoring facts', async ({
    assert,
  }) => {
    const forged = envelope({ readinessFindingCodesResolved: ['TVA.FORGED.RESOLVED'] })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: forged,
              idempotencyKey: 'forged-readiness-resolution-history',
              expectedHeadRevision: 0,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 0)
  })

  test('@security verifies a stored V1 successor decision against its immutable predecessor', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'classifier-history-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const changedBundle = await persistMaterialAuthoringBundle()
    const validSuccessor = materialSuccessorEnvelope(first, changedBundle)
    const forgedDecision = {
      ...validSuccessor.changeDecision,
      changedPaths: [],
    }
    const { snapshotHash: _snapshotHash, ...snapshotWithoutHash } = validSuccessor.snapshot
    const forgedSuccessor: CanonicalTaskAssignmentContractSnapshotV1 = {
      ...validSuccessor,
      changeDecision: forgedDecision,
      snapshot: {
        ...snapshotWithoutHash,
        snapshotHash: hasher.hash({
          envelopeSchemaVersion: validSuccessor.schemaVersion,
          snapshot: snapshotWithoutHash,
          workFieldProvenance: validSuccessor.workFieldProvenance,
          acknowledgementBasis: validSuccessor.acknowledgementBasis,
          changeDecision: forgedDecision,
        }),
      },
    }

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: forgedSuccessor,
              idempotencyKey: 'forged-successor-classifier-decision',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    const current = await repository.findCurrent(assignmentId)
    assert.equal(current?.id, first.id)
  })

  test('@security rejects canonical authoring version and capability rubric pins that do not exactly match the resolved Contract', async ({
    assert,
  }) => {
    const wrongContractVersion = {
      ...baseBundle.contract.resolvedContract,
      versionId: randomUUID(),
    }
    const wrongSpecificationVersion = {
      ...baseBundle.contract.resolvedContract,
      specification: {
        ...baseBundle.contract.resolvedContract.specification,
        versionId: randomUUID(),
      },
    }

    for (const [idempotencyKey, forgedEnvelope] of [
      ['forged-resolved-contract-version', envelope({ resolvedContract: wrongContractVersion })],
      [
        'forged-resolved-specification-version',
        envelope({ resolvedContract: wrongSpecificationVersion }),
      ],
      ['forged-capability-rubric-pins', envelope({ capabilityRubricVersionIds: [] })],
    ] as const) {
      await assert.rejects(
        () =>
          db.transaction((trx) =>
            repository.persistSnapshot(
              {
                envelope: forgedEnvelope,
                idempotencyKey,
                expectedHeadRevision: 0,
              },
              trx
            )
          ),
        InvariantViolationException
      )
    }

    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 0)
  })

  test('@security revalidates durable Specification and Contract content hashes before pinning them', async ({
    assert,
  }) => {
    await db
      .from('task_specification_versions')
      .where('id', TASK_SPECIFICATION_VERSION_V1_FIXTURE.id)
      .update({ content_hash: hash('e') })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: envelope(),
              idempotencyKey: 'durable-specification-hash-corruption',
              expectedHeadRevision: 0,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    await db
      .from('task_specification_versions')
      .where('id', TASK_SPECIFICATION_VERSION_V1_FIXTURE.id)
      .update({ content_hash: baseBundle.specification.contentHash })

    await db
      .from('task_contract_versions')
      .where('id', TASK_CONTRACT_VERSION_V1_FIXTURE.id)
      .update({ content_hash: hash('f') })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: envelope(),
              idempotencyKey: 'durable-contract-hash-corruption',
              expectedHeadRevision: 0,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 0)
  })

  test('@security rejects a successor whose canonical timestamp does not advance beyond its predecessor', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'strict-time-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const nonAdvancing = envelope({
      id: randomUUID(),
      createdAt: first.envelope.snapshot.createdAt,
      acknowledgementBasis: {
        kind: 'reacknowledgement_required',
        previousSnapshotId: first.id,
        previousAcknowledgementState: 'pending',
        changeClass: 'editorial',
      },
    })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: nonAdvancing,
              idempotencyKey: 'strict-time-non-advancing',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    const current = await repository.findCurrent(assignmentId)
    assert.equal(current?.id, first.id)
  })

  test('@security database fences reject a second active assignment and application checks mismatched native Contract/Specification pairs', async ({
    assert,
  }) => {
    await assertPostgresConstraintError(
      () =>
        TaskAssignmentFactory.create({
          id: randomUUID(),
          task_id: taskId,
          assignee_id: assigneeId,
          assigned_by: creatorId,
          assignment_status: 'active',
        }),
      '23505',
      'uq_task_assignments_one_active_task'
    )

    const initial = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'database-authoring-pin-initial',
          expectedHeadRevision: 0,
        },
        trx
      )
    )

    const invalidLegacySnapshot = {
      task_assignment_id: assignmentId,
      task_id: taskId,
      snapshot_reason: `legacy-${randomUUID().slice(0, 8)}`,
      task_snapshot: {},
      required_skills_snapshot: [],
      acceptance_criteria_snapshot: {},
      workflow_snapshot: {},
    }
    const legacySnapshotId = randomUUID()
    const predecessorSnapshotId = randomUUID()
    await db.table('task_assignment_snapshots').insert({
      id: legacySnapshotId,
      ...invalidLegacySnapshot,
      idempotency_key: `legacy-must-not-own-idempotency:${randomUUID()}`,
    })
    await db.table('task_assignment_snapshots').insert({
      id: predecessorSnapshotId,
      ...invalidLegacySnapshot,
      snapshot_reason: `legacy-${randomUUID().slice(0, 8)}`,
      previous_snapshot_id: initial.id,
    })
    await db
      .from('task_assignment_snapshots')
      .whereIn('id', [legacySnapshotId, predecessorSnapshotId])
      .delete()

    const v2 = materiallyChangedBundle()
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(v2, trx)
    )

    await db
      .from('task_assignment_snapshots')
      .where('id', initial.id)
      .update({ task_contract_version_id: v2.contract.id })
    await assert.rejects(() => repository.findCurrent(assignmentId), InvariantViolationException)
  })

  test('rolls a stale successor back without moving the mutable head', async ({ assert }) => {
    const initial = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-initial',
          expectedHeadRevision: 0,
        },
        trx
      )
    )

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: envelope({
                id: randomUUID(),
                acknowledgementBasis: {
                  kind: 'reacknowledgement_required',
                  previousSnapshotId: initial.id,
                  previousAcknowledgementState: 'pending',
                  changeClass: 'editorial',
                },
              }),
              idempotencyKey: 'assignment-stale-successor',
              expectedHeadRevision: 0,
            },
            trx
          )
        ),
      ConflictException
    )

    const current = await repository.findCurrent(assignmentId)
    assert.equal(current?.id, initial.id)
    assert.equal(current?.sequence, 1)
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 1)
  })

  test('retains the immutable successor chain and reads history separately from current', async ({
    assert,
  }) => {
    const firstInput = {
      envelope: envelope(),
      idempotencyKey: 'assignment-history-v1',
      expectedHeadRevision: 0,
    }
    const first = await db.transaction((trx) => repository.persistSnapshot(firstInput, trx))
    const secondEnvelope = envelope({
      id: randomUUID(),
      createdAt: '2026-08-01T09:00:00.000Z',
      acknowledgementBasis: {
        kind: 'reacknowledgement_required',
        previousSnapshotId: first.id,
        previousAcknowledgementState: 'pending',
        changeClass: 'editorial',
      },
    })
    const second = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: secondEnvelope,
          idempotencyKey: 'assignment-history-v2',
          expectedHeadRevision: 1,
        },
        trx
      )
    )

    const history = await repository.findHistory(assignmentId)
    const current = await repository.findCurrent(assignmentId)
    const replayedFirst = await db.transaction((trx) => repository.persistSnapshot(firstInput, trx))

    assert.deepEqual(
      history.map((record) => [record.id, record.sequence, record.previousSnapshotId]),
      [
        [first.id, 1, null],
        [second.id, 2, first.id],
      ]
    )
    assert.equal(current?.id, second.id)
    assert.equal(current?.snapshotHash, secondEnvelope.snapshot.snapshotHash)
    assert.equal(replayedFirst.id, first.id)
    assert.equal(replayedFirst.sequence, 1)
    assert.isTrue(replayedFirst.replayed)
    assert.equal(
      history[0]?.envelope.snapshot.resolvedContract.title,
      first.envelope.snapshot.resolvedContract.title
    )
  })

  test('persists one exact acknowledgement fact and replays retries without mutation', async ({
    assert,
  }) => {
    const snapshot = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-before-ack',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const command = new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      interactionDependencies()
    )
    const dto = {
      assignmentId,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      contractVersionHead: snapshot.sequence,
      idempotencyKey: 'ack-exact-retry',
    }

    const first = await command.execute(dto)
    const replay = await command.execute(dto)
    const current = await repository.findCurrent(assignmentId)

    assert.isFalse(first.replayed)
    assert.isTrue(replay.replayed)
    assert.deepEqual(replay.fact, first.fact)
    await assert.rejects(
      () => command.execute({ ...dto, snapshotHash: hash('e') }),
      ConflictException
    )
    assert.equal(current?.acknowledgementState, 'acknowledged')
    assert.lengthOf(
      await db.from('task_assignment_acknowledgements').where('task_assignment_id', assignmentId),
      1
    )
  })

  test('replays an exact acknowledgement after the assignment lifecycle has closed', async ({
    assert,
  }) => {
    const snapshot = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-before-closed-ack-retry',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const command = new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      interactionDependencies()
    )
    const dto = {
      assignmentId,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      contractVersionHead: snapshot.sequence,
      idempotencyKey: 'ack-retry-after-closed-lifecycle',
    }
    const first = await command.execute(dto)
    await db
      .from('task_assignments')
      .where('id', assignmentId)
      .update({ assignment_status: 'completed', completed_at: new Date() })

    const replay = await command.execute(dto)

    assert.isFalse(first.replayed)
    assert.isTrue(replay.replayed)
    assert.deepEqual(replay.fact, first.fact)
    await assert.rejects(
      () => command.execute({ ...dto, snapshotHash: hash('f') }),
      ConflictException
    )
  })

  test('persists clarification independently, replays it, and blocks acknowledgement while open', async ({
    assert,
  }) => {
    const snapshot = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-before-clarification',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const clarification = new RequestTaskAssignmentClarificationCommand(
      actionContext,
      interactionDependencies()
    )
    const dto = {
      assignmentId,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      contractVersionHead: snapshot.sequence,
      reason: 'Clarify rollback ownership before I accept this Contract.',
      idempotencyKey: 'clarification-exact-retry',
    }

    const first = await clarification.execute(dto)
    const replay = await clarification.execute(dto)
    const current = await repository.findCurrent(assignmentId)

    assert.isFalse(first.replayed)
    assert.isTrue(replay.replayed)
    assert.deepEqual(replay.fact, first.fact)
    assert.equal(current?.acknowledgementState, 'clarification_requested')
    assert.lengthOf(
      await db.from('task_assignment_acknowledgements').where('task_assignment_id', assignmentId),
      0
    )

    const acknowledge = new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      interactionDependencies()
    )
    await assert.rejects(
      () =>
        acknowledge.execute({
          assignmentId,
          snapshotId: snapshot.id,
          snapshotHash: snapshot.snapshotHash,
          contractVersionHead: snapshot.sequence,
          idempotencyKey: 'ack-before-clarification-resolved',
        }),
      'TVA.ASSIGNMENT.CLARIFICATION_UNRESOLVED'
    )
  })

  test('replays an exact clarification after the assignment lifecycle has closed', async ({
    assert,
  }) => {
    const snapshot = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-before-closed-clarification-retry',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const command = new RequestTaskAssignmentClarificationCommand(
      actionContext,
      interactionDependencies()
    )
    const dto = {
      assignmentId,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      contractVersionHead: snapshot.sequence,
      reason: 'Clarify the rollback owner before work continues.',
      idempotencyKey: 'clarification-retry-after-closed-lifecycle',
    }
    const first = await command.execute(dto)
    await db
      .from('task_assignments')
      .where('id', assignmentId)
      .update({ assignment_status: 'completed', completed_at: new Date() })

    const replay = await command.execute(dto)

    assert.isFalse(first.replayed)
    assert.isTrue(replay.replayed)
    assert.deepEqual(replay.fact, first.fact)
    await assert.rejects(
      () => command.execute({ ...dto, reason: 'A different request reusing the same key.' }),
      ConflictException
    )
  })

  test('a post-ack clarification never revokes or replaces the immutable acknowledgement', async ({
    assert,
  }) => {
    const snapshot = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-ack-then-clarify',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    await new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      interactionDependencies()
    ).execute({
      assignmentId,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      contractVersionHead: snapshot.sequence,
      idempotencyKey: 'ack-before-post-ack-question',
    })
    await new RequestTaskAssignmentClarificationCommand(
      actionContext,
      interactionDependencies('2026-08-01T10:05:00.000Z')
    ).execute({
      assignmentId,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      contractVersionHead: snapshot.sequence,
      reason: 'Record a non-revoking follow-up question.',
      idempotencyKey: 'post-ack-question',
    })

    const current = await repository.findCurrent(assignmentId)
    assert.equal(current?.acknowledgementState, 'acknowledged')
    assert.lengthOf(
      await db.from('task_assignment_acknowledgements').where('task_assignment_id', assignmentId),
      1
    )
    assert.lengthOf(
      await db
        .from('task_assignment_clarification_requests')
        .where('task_assignment_id', assignmentId),
      1
    )
  })

  test('carries acknowledgement only through an immutable basis that points to an acknowledged predecessor', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-before-carry-forward',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    await new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      interactionDependencies()
    ).execute({
      assignmentId,
      snapshotId: first.id,
      snapshotHash: first.snapshotHash,
      contractVersionHead: first.sequence,
      idempotencyKey: 'ack-before-carry-forward',
    })
    const carriedEnvelope = envelope({
      id: randomUUID(),
      createdAt: '2026-08-01T10:10:00.000Z',
      acknowledgementRequired: false,
      acknowledgementBasis: {
        kind: 'acknowledgement_carried_forward',
        previousSnapshotId: first.id,
        previousAcknowledgementState: 'acknowledged',
        changeClass: 'editorial',
      },
    })

    const carried = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: carriedEnvelope,
          idempotencyKey: 'editorial-carry-forward',
          expectedHeadRevision: 1,
        },
        trx
      )
    )
    const history = await repository.findHistory(assignmentId)

    assert.equal(carried.acknowledgementState, 'acknowledged')
    assert.equal(history[1]?.envelope.acknowledgementBasis.previousSnapshotId, first.id)
    assert.lengthOf(
      await db.from('task_assignment_acknowledgements').where('task_assignment_id', assignmentId),
      1,
      'carry-forward must not forge a second actor acknowledgement fact'
    )
  })

  test('rejects acknowledgement carry-forward from a predecessor that is still pending', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'pending-before-invalid-carry',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const invalidCarry = envelope({
      id: randomUUID(),
      acknowledgementRequired: false,
      acknowledgementBasis: {
        kind: 'acknowledgement_carried_forward',
        previousSnapshotId: first.id,
        previousAcknowledgementState: 'acknowledged',
        changeClass: 'editorial',
      },
    })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: invalidCarry,
              idempotencyKey: 'invalid-pending-carry',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    const current = await repository.findCurrent(assignmentId)
    assert.equal(current?.id, first.id)
  })

  test('@security rejects a materially changed successor forged as editorial acknowledgement carry-forward', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'security-material-carry-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    await new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      interactionDependencies()
    ).execute({
      assignmentId,
      snapshotId: first.id,
      snapshotHash: first.snapshotHash,
      contractVersionHead: first.sequence,
      idempotencyKey: 'security-material-carry-ack',
    })
    const changedBundle = materiallyChangedBundle()
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(changedBundle, trx)
    )
    const changedContract = changedBundle.contract.resolvedContract
    const classification = classifyTaskContractChange({
      previous: first.envelope.snapshot.resolvedContract,
      next: changedContract,
    })
    assert.isTrue(classification.requiresReack, 'attack fixture must be materially different')
    const forged = envelope({
      id: randomUUID(),
      createdAt: '2026-08-01T10:30:00.000Z',
      resolvedContract: changedContract,
      taskSpecificationVersionId: changedBundle.specification.id,
      taskContractVersionId: changedBundle.contract.id,
      acknowledgementRequired: false,
      acknowledgementBasis: {
        kind: 'acknowledgement_carried_forward',
        previousSnapshotId: first.id,
        previousAcknowledgementState: 'acknowledged',
        changeClass: 'editorial',
      },
    })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: forged,
              idempotencyKey: 'security-forged-material-carry-forward',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      InvariantViolationException
    )
    const current = await repository.findCurrent(assignmentId)
    assert.equal(current?.id, first.id)
  })

  test('@security direct repository persistence blocks a material successor during active review', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'governance-active-review-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const changedBundle = await persistMaterialAuthoringBundle()
    await createReviewSession(assignmentId, assigneeId, 'in_progress')

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: materialSuccessorEnvelope(first, changedBundle),
              idempotencyKey: 'governance-material-during-review',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED'
    )
    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: envelope({
                id: randomUUID(),
                createdAt: '2026-08-01T09:35:00.000Z',
                acknowledgementBasis: {
                  kind: 'reacknowledgement_required',
                  previousSnapshotId: first.id,
                  previousAcknowledgementState: 'pending',
                  changeClass: 'editorial',
                },
              }),
              idempotencyKey: 'governance-editorial-reack-during-review',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED'
    )

    const current = await repository.findCurrent(assignmentId)
    assert.equal(current?.id, first.id)
    assert.lengthOf(await db.from('task_assignment_snapshots').where('task_id', taskId), 1)
  })

  test('enforces workflow-only review state and permits the successor after workflow completion', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'governance-workflow-only-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const changedBundle = await persistMaterialAuthoringBundle()
    const workflowId = await createTaskReviewWorkflow('in_review')

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: materialSuccessorEnvelope(first, changedBundle),
              idempotencyKey: 'governance-material-during-workflow-review',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED'
    )

    await db
      .from('task_review_workflows')
      .where('id', workflowId)
      .update({ status: 'completed', updated_at: '2026-08-01T08:55:00.000Z' })
    const successor = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: materialSuccessorEnvelope(first, changedBundle),
          idempotencyKey: 'governance-material-after-workflow-completion',
          expectedHeadRevision: 1,
        },
        trx
      )
    )
    assert.equal(successor.sequence, 2)
  })

  test('@security direct repository persistence blocks a material successor during active dispute', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'governance-active-dispute-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const changedBundle = await persistMaterialAuthoringBundle()
    const reviewSessionId = await createReviewSession(assignmentId, assigneeId, 'completed')
    await createReviewDispute({
      reviewSessionId,
      targetAssignmentId: assignmentId,
      targetTaskId: taskId,
      revieweeId: assigneeId,
      status: 'admin_reviewing',
    })

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          repository.persistSnapshot(
            {
              envelope: materialSuccessorEnvelope(first, changedBundle),
              idempotencyKey: 'governance-material-during-dispute',
              expectedHeadRevision: 1,
            },
            trx
          )
        ),
      'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED'
    )

    const current = await repository.findCurrent(assignmentId)
    assert.equal(current?.id, first.id)
  })

  test('allows a material successor after the exact assignment dispute is resolved', async ({
    assert,
  }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'governance-resolved-dispute-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const changedBundle = await persistMaterialAuthoringBundle()
    const reviewSessionId = await createReviewSession(assignmentId, assigneeId, 'completed')
    await createReviewDispute({
      reviewSessionId,
      targetAssignmentId: assignmentId,
      targetTaskId: taskId,
      revieweeId: assigneeId,
      status: 'resolved',
    })

    const successor = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: materialSuccessorEnvelope(first, changedBundle),
          idempotencyKey: 'governance-material-after-resolution',
          expectedHeadRevision: 1,
        },
        trx
      )
    )

    assert.equal(successor.sequence, 2)
    assert.equal(successor.previousSnapshotId, first.id)
    assert.equal(successor.acknowledgementState, 'pending')
  })

  test('isolates governed review and dispute state to the exact assignment', async ({ assert }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'governance-cross-assignment-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const changedBundle = await persistMaterialAuthoringBundle()
    const otherAssignmentId = randomUUID()
    let otherReviewSessionId: string | null = null

    try {
      await TaskAssignmentFactory.create({
        id: otherAssignmentId,
        task_id: taskId,
        assignee_id: assigneeId,
        assigned_by: creatorId,
        assignment_status: 'completed',
      })
      otherReviewSessionId = await createReviewSession(otherAssignmentId, assigneeId, 'in_progress')
      await createReviewDispute({
        reviewSessionId: otherReviewSessionId,
        targetAssignmentId: otherAssignmentId,
        targetTaskId: taskId,
        revieweeId: assigneeId,
        status: 'pending',
      })

      const successor = await db.transaction((trx) =>
        repository.persistSnapshot(
          {
            envelope: materialSuccessorEnvelope(first, changedBundle),
            idempotencyKey: 'governance-cross-assignment-material',
            expectedHeadRevision: 1,
          },
          trx
        )
      )
      assert.equal(successor.sequence, 2)
    } finally {
      await db.from('review_disputes').where('task_assignment_id', otherAssignmentId).delete()
      if (otherReviewSessionId) {
        await db.from('review_sessions').where('id', otherReviewSessionId).delete()
      }
      await db.from('task_assignments').where('id', otherAssignmentId).delete()
    }
  })

  test('preserves acknowledged editorial carry-forward during active review', async ({ assert }) => {
    const first = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'governance-editorial-predecessor',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    await new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      interactionDependencies()
    ).execute({
      assignmentId,
      snapshotId: first.id,
      snapshotHash: first.snapshotHash,
      contractVersionHead: first.sequence,
      idempotencyKey: 'governance-editorial-acknowledgement',
    })
    await createReviewSession(assignmentId, assigneeId, 'in_progress')

    const successor = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope({
            id: randomUUID(),
            createdAt: '2026-08-01T09:45:00.000Z',
            acknowledgementRequired: false,
            acknowledgementBasis: {
              kind: 'acknowledgement_carried_forward',
              previousSnapshotId: first.id,
              previousAcknowledgementState: 'acknowledged',
              changeClass: 'editorial',
            },
          }),
          idempotencyKey: 'governance-editorial-during-review',
          expectedHeadRevision: 1,
        },
        trx
      )
    )

    assert.equal(successor.sequence, 2)
    assert.equal(successor.acknowledgementState, 'acknowledged')
  })

  test('@security rejects acknowledgement and clarification facts pinned to another assignment snapshot', async ({
    assert,
  }) => {
    const primary = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'security-cross-assignment-primary',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const otherAssignmentId = randomUUID()
    const otherAssigneeId = randomUUID()
    const otherTaskId = randomUUID()

    try {
      await UserFactory.create({ id: otherAssigneeId })
      await TaskFactory.create({
        id: otherTaskId,
        organization_id: organizationId,
        project_id: projectId,
        creator_id: creatorId,
        assigned_to: otherAssigneeId,
      })
      await TaskAssignmentFactory.create({
        id: otherAssignmentId,
        task_id: otherTaskId,
        assignee_id: otherAssigneeId,
        assigned_by: creatorId,
      })
      const acknowledgementFact = {
        assignmentId: otherAssignmentId,
        assigneeId: otherAssigneeId,
        snapshotId: primary.id,
        snapshotHash: primary.snapshotHash,
        contractVersionHead: primary.sequence,
        acknowledgedAt: '2026-08-01T10:40:00.000Z',
      }
      const clarificationRequest = {
        requestId: randomUUID(),
        assignmentId: otherAssignmentId,
        requestedBy: otherAssigneeId,
        snapshotId: primary.id,
        snapshotHash: primary.snapshotHash,
        contractVersionHead: primary.sequence,
        requestedAt: '2026-08-01T10:41:00.000Z',
      }
      const clarificationReason = 'Attempt to bind a clarification to another assignment.'

      await assert.rejects(
        () =>
          db.transaction((trx) =>
            repository.persistAcknowledgement(
              {
                fact: acknowledgementFact,
                idempotencyKey: 'security-cross-assignment-ack',
                requestHash: hasher.hash(
                  assignmentAcknowledgementRequestHashInput(acknowledgementFact)
                ),
              },
              trx
            )
          ),
        ConflictException
      )
      await assert.rejects(
        () =>
          db.transaction((trx) =>
            repository.persistClarification(
              {
                request: clarificationRequest,
                reason: clarificationReason,
                idempotencyKey: 'security-cross-assignment-clarification',
                requestHash: hasher.hash(
                  assignmentClarificationRequestHashInput({
                    request: clarificationRequest,
                    reason: clarificationReason,
                  })
                ),
              },
              trx
            )
          ),
        ConflictException
      )

      const current = await repository.findCurrent(assignmentId)
      assert.equal(current?.id, primary.id)
      assert.lengthOf(
        await db
          .from('task_assignment_acknowledgements')
          .whereIn('task_assignment_id', [assignmentId, otherAssignmentId]),
        0
      )
      assert.lengthOf(
        await db
          .from('task_assignment_clarification_requests')
          .whereIn('task_assignment_id', [assignmentId, otherAssignmentId]),
        0
      )
    } finally {
      await db
        .from('task_assignment_clarification_requests')
        .where('task_assignment_id', otherAssignmentId)
        .delete()
      await db
        .from('task_assignment_acknowledgements')
        .where('task_assignment_id', otherAssignmentId)
        .delete()
      await db
        .from('task_assignment_contract_heads')
        .where('task_assignment_id', otherAssignmentId)
        .delete()
      await db
        .from('task_assignment_snapshots')
        .where('task_assignment_id', otherAssignmentId)
        .delete()
      await db.from('task_assignments').where('id', otherAssignmentId).delete()
      await db.from('tasks').where('id', otherTaskId).delete()
      await db.from('users').where('id', otherAssigneeId).delete()
    }
  })

  test('fails closed when the mutable head or canonical immutable row violates integrity', async ({
    assert,
  }) => {
    const persisted = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'assignment-integrity',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    await db
      .from('task_assignment_contract_heads')
      .where('task_assignment_id', assignmentId)
      .update({ expected_snapshot_hash: hash('f') })
    await assert.rejects(() => repository.findCurrent(assignmentId), InvariantViolationException)

    await db
      .from('task_assignment_snapshots')
      .where('id', persisted.id)
      .update({
        canonical_snapshot: JSON.stringify({
          ...persisted.envelope,
          snapshot: { ...persisted.envelope.snapshot, snapshotHash: hash('0') },
        }),
      })
    await assert.rejects(() => repository.findCurrent(assignmentId), InvariantViolationException)
  })

  test('exposes acknowledgement and clarification through the canonical v1 HTTP boundary', async ({
    assert,
    client,
  }) => {
    const assignee = await User.findOrFail(assigneeId)
    await OrganizationUserFactory.create({
      organization_id: organizationId,
      user_id: assigneeId,
      org_role: 'org_member',
      status: 'approved',
    })
    await assignee.merge({ current_organization_id: organizationId }).save()

    const snapshot = await db.transaction((trx) =>
      repository.persistSnapshot(
        {
          envelope: envelope(),
          idempotencyKey: 'http-interaction-snapshot',
          expectedHeadRevision: 0,
        },
        trx
      )
    )
    const basePayload = {
      assignmentId,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      contractVersionHead: snapshot.sequence,
    }

    const owner = await User.findOrFail(creatorId)
    const unauthorizedResponse = await client
      .post(`/api/v1/task-assignments/${assignmentId}/acknowledgement`)
      .loginAs(owner)
      .json({ ...basePayload, idempotencyKey: 'http-unauthorized-acknowledgement' })
    unauthorizedResponse.assertStatus(400)

    const clarificationResponse = await client
      .post(`/api/v1/task-assignments/${assignmentId}/clarifications`)
      .loginAs(assignee)
      .json({
        ...basePayload,
        reason: 'Clarify the acceptance boundary before execution.',
        idempotencyKey: 'http-clarification-request',
    })
    clarificationResponse.assertStatus(200)
    const afterClarification = await repository.findCurrent(assignmentId)
    assert.equal(afterClarification?.acknowledgementState, 'clarification_requested')

    const acknowledgementResponse = await client
      .post(`/api/v1/task-assignments/${assignmentId}/acknowledgement`)
      .loginAs(assignee)
      .json({
        ...basePayload,
        idempotencyKey: 'http-acknowledgement-request',
    })
    acknowledgementResponse.assertStatus(400)
    const afterRejectedAcknowledgement = await repository.findCurrent(assignmentId)
    assert.equal(afterRejectedAcknowledgement?.acknowledgementState, 'clarification_requested')
  })
})
