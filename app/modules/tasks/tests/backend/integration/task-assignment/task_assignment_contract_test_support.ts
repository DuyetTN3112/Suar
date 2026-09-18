import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { CanonicalTaskAssignmentContractSnapshotV1 } from '#modules/tasks/domain/task-assignment/task_assignment_contract_snapshot'
import {
  classifyTaskContractChangeV1,
  INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1,
} from '#modules/tasks/domain/task-authoring/task_contract_change_classifier'
import { LucidTaskAssignmentContractRepository } from '#modules/tasks/infra/adapters/task-assignment/lucid_task_assignment_contract_repository'
import { LucidTaskTransactionRunner } from '#modules/tasks/infra/adapters/task-reading/lucid_task_transaction_runner'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'
import TaskSpecificationContractRepository from '#modules/tasks/infra/repositories/task-authoring/task_specification_contract_repository'
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
import {
  ProjectFactory,
  TaskAssignmentFactory,
  TaskFactory,
} from '#tests/helpers/factories/project_task'
import { OrganizationFactory, UserFactory } from '#tests/helpers/factories/user_org'

export const repository = new LucidTaskAssignmentContractRepository()
export const hasher = new NodeTaskContractContentHasher()
export const creatorId = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.assignedBy
export const assigneeId = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.assigneeId
export const organizationId = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.organizationId
export const projectId = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.projectId
export const taskId = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.taskId
export const assignmentId = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.assignmentId
export const hash = (character: string): TvaSha256 => `sha256:${character.repeat(64)}`

export const actionContext: TaskActionContext = {
  userId: assigneeId,
  ip: '127.0.0.1',
  userAgent: 'integration-test',
  organizationId,
}

export async function assertPostgresConstraintError(
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

export function interactionDependencies(nowIso: string = '2026-08-01T10:00:00.000Z') {
  return {
    repository,
    transactions: new LucidTaskTransactionRunner(),
    hasher,
    clock: { nowIso: () => nowIso },
    identityFactory: { nextId: () => randomUUID() },
  }
}

export const workFieldProvenance: CanonicalTaskAssignmentContractSnapshotV1['workFieldProvenance'] = {
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

export function integrityValidBaseBundle() {
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

export const baseBundle = integrityValidBaseBundle()

export function envelope(
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

export function materiallyChangedBundle() {
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

export async function createReviewSession(
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

export async function createReviewDispute(input: {
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

export async function createTaskReviewWorkflow(status: string): Promise<string> {
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

export async function persistMaterialAuthoringBundle() {
  const changedBundle = materiallyChangedBundle()
  await db.transaction((trx) =>
    TaskSpecificationContractRepository.persistContractBundle(changedBundle, trx)
  )
  return changedBundle
}

export function materialSuccessorEnvelope(
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

export async function cleanupScenario(): Promise<void> {
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

export async function createScenario(): Promise<void> {
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
