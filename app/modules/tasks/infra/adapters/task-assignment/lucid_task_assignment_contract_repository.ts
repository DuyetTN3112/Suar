import { isDeepStrictEqual } from 'node:util'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { NodeTaskContractContentHasher } from '../task-submissions/node_task_contract_content_hasher.js'

import { isTaskAssignmentSnapshotV1 } from '#modules/tasks/public_contracts/task-authoring/validators'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  PersistTaskAssignmentAcknowledgementInput,
  PersistTaskAssignmentClarificationInput,
  PersistTaskAssignmentContractSnapshotInput,
  TaskAssignmentAcknowledgementState,
  TaskAssignmentContractRepository,
  TaskAssignmentContractSnapshotRecord,
  TaskAssignmentInteractionReplayLookupInput,
} from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES } from '#modules/tasks/domain/task-assignment/task_assignment_acknowledgement_rules'
import type { CanonicalTaskAssignmentContractSnapshotV1 } from '#modules/tasks/domain/task-assignment/task_assignment_contract_snapshot'
import {
  assignmentAcknowledgementRequestHashInput,
  assignmentClarificationRequestHashInput,
} from '#modules/tasks/domain/task-assignment/task_assignment_interaction_request'
import {
  isTaskContractChangeDecisionV1,
  verifyTaskContractChangeDecision,
  type TaskContractChangeDecisionV1,
} from '#modules/tasks/domain/task-authoring/task_contract_change_classifier'
import { deriveResolvedReadinessFindingCodes } from '#modules/tasks/domain/task-authoring/task_readiness_resolution_history'
import { assertTaskSpecificationContractIntegrity } from '#modules/tasks/infra/adapters/task-authoring/task_contract_integrity'
import {
  mapTaskContractVersionModel,
  mapTaskReadinessAssessmentModel,
  mapTaskSpecificationVersionModel,
} from '#modules/tasks/infra/adapters/task-authoring/task_contract_model_mapper'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import TaskAssignment from '#modules/tasks/infra/models/task-assignment/task_assignment'
import TaskAssignmentAcknowledgement from '#modules/tasks/infra/models/task-assignment/task_assignment_acknowledgement'
import TaskAssignmentClarificationRequest from '#modules/tasks/infra/models/task-assignment/task_assignment_clarification_request'
import TaskAssignmentContractHead from '#modules/tasks/infra/models/task-assignment/task_assignment_contract_head'
import TaskAssignmentSnapshot from '#modules/tasks/infra/models/task-assignment/task_assignment_snapshot'
import TaskContractVersion from '#modules/tasks/infra/models/task-authoring/task_contract_version'
import TaskReadinessAssessment from '#modules/tasks/infra/models/task-authoring/task_readiness_assessment'
import TaskSpecificationVersion from '#modules/tasks/infra/models/task-authoring/task_specification_version'

function lucidTransaction(transaction?: TaskTransaction): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

function toJsonRecord(value: object): Record<string, unknown> {
  return value as unknown as Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidAcknowledgementBasis(value: unknown, acknowledgementRequired: boolean): boolean {
  if (!isRecord(value)) return false
  const kind = value['kind']
  if (kind === 'fresh_assignment') {
    return (
      value['previousSnapshotId'] === null &&
      value['previousAcknowledgementState'] === null &&
      value['changeClass'] === 'initial' &&
      acknowledgementRequired
    )
  }
  if (kind === 'reacknowledgement_required') {
    return (
      typeof value['previousSnapshotId'] === 'string' &&
      ['pending', 'acknowledged', 'clarification_requested'].includes(
        String(value['previousAcknowledgementState'])
      ) &&
      typeof value['changeClass'] === 'string' &&
      value['changeClass'] !== 'initial' &&
      acknowledgementRequired
    )
  }
  if (kind === 'acknowledgement_carried_forward') {
    return (
      typeof value['previousSnapshotId'] === 'string' &&
      value['previousAcknowledgementState'] === 'acknowledged' &&
      ['editorial', 'clarification', 'deadline_priority'].includes(String(value['changeClass'])) &&
      !acknowledgementRequired
    )
  }
  return false
}

function capabilityRubricVersionIds(
  resolvedContract: CanonicalTaskAssignmentContractSnapshotV1['snapshot']['resolvedContract']
): string[] {
  return [
    ...new Set(
      resolvedContract.evidence.capabilities
        .map((capability) => capability.rubricVersionId)
        .filter((id): id is string => id !== null)
    ),
  ].sort()
}

function assertCanonicalEnvelope(
  envelope: CanonicalTaskAssignmentContractSnapshotV1,
  idempotencyKey: string,
  hasher: TaskContractContentHasher
): void {
  const rawBasis = (envelope as { acknowledgementBasis?: unknown }).acknowledgementBasis
  const rawChangeDecision = (envelope as { changeDecision?: unknown }).changeDecision
  const validAcknowledgementBasis = isValidAcknowledgementBasis(
    rawBasis,
    envelope.snapshot.acknowledgementRequired
  )
  if (
    (envelope as { schemaVersion: unknown }).schemaVersion !==
      'suar.task_assignment_contract_snapshot.v1' ||
    !isTaskAssignmentSnapshotV1(envelope.snapshot) ||
    !isTaskContractChangeDecisionV1(rawChangeDecision) ||
    Object.keys(envelope.workFieldProvenance).length === 0 ||
    envelope.snapshot.roleInTask !== envelope.snapshot.resolvedContract.work.roleInTask ||
    envelope.snapshot.ownershipLevel !== envelope.snapshot.resolvedContract.work.ownershipLevel ||
    envelope.snapshot.provenance.projectContextVersionId !==
      envelope.snapshot.resolvedContract.inheritedFrom.projectContextVersionId ||
    envelope.snapshot.provenance.workPackageVersionId !==
      envelope.snapshot.resolvedContract.inheritedFrom.workPackageVersionId ||
    envelope.snapshot.provenance.taskContractVersionId !==
      envelope.snapshot.resolvedContract.versionId ||
    envelope.snapshot.provenance.taskSpecificationVersionId !==
      envelope.snapshot.resolvedContract.specification.versionId ||
    !isDeepStrictEqual(
      envelope.snapshot.provenance.capabilityRubricVersionIds,
      capabilityRubricVersionIds(envelope.snapshot.resolvedContract)
    ) ||
    !validAcknowledgementBasis ||
    !idempotencyKey.trim()
  ) {
    throw new InvariantViolationException(
      'Assignment Contract repository received an invalid canonical snapshot envelope'
    )
  }

  const decisionChangeClass = envelope.changeDecision.changeClass ?? 'editorial'
  if (
    (envelope.acknowledgementBasis.kind === 'fresh_assignment'
      ? !verifyTaskContractChangeDecision({
          decision: envelope.changeDecision,
          previous: null,
          next: envelope.snapshot.resolvedContract,
        })
      : envelope.changeDecision.changeClass === 'initial' ||
        envelope.acknowledgementBasis.changeClass !== decisionChangeClass ||
        (envelope.acknowledgementBasis.kind === 'acknowledgement_carried_forward' &&
          envelope.changeDecision.requiresReack))
  ) {
    throw new InvariantViolationException(
      'Assignment Contract snapshot change decision contradicts its acknowledgement basis'
    )
  }

  const { snapshotHash, ...snapshotWithoutHash } = envelope.snapshot
  const recomputedHash = hasher.hash({
    envelopeSchemaVersion: envelope.schemaVersion,
    snapshot: snapshotWithoutHash,
    workFieldProvenance: envelope.workFieldProvenance,
    acknowledgementBasis: envelope.acknowledgementBasis,
    changeDecision: envelope.changeDecision,
  })
  if (recomputedHash !== snapshotHash) {
    throw new InvariantViolationException(
      'Assignment Contract snapshot declared hash does not match its canonical content'
    )
  }
}

function assertInput(
  input: PersistTaskAssignmentContractSnapshotInput,
  hasher: TaskContractContentHasher
): void {
  assertCanonicalEnvelope(input.envelope, input.idempotencyKey, hasher)
  if (!Number.isInteger(input.expectedHeadRevision) || input.expectedHeadRevision < 0) {
    throw new InvariantViolationException(
      'Assignment Contract expected head revision must be a non-negative integer'
    )
  }
}

function assertSnapshotRowIntegrity(
  snapshot: TaskAssignmentSnapshot,
  hasher: TaskContractContentHasher
): CanonicalTaskAssignmentContractSnapshotV1 {
  const envelope = snapshot.canonical_snapshot
  if (
    !envelope ||
    !snapshot.snapshot_hash ||
    snapshot.snapshot_sequence === null ||
    snapshot.acknowledgement_required === null ||
    !snapshot.idempotency_key
  ) {
    throw new InvariantViolationException('Native assignment Contract snapshot row is incomplete')
  }
  assertCanonicalEnvelope(envelope, snapshot.idempotency_key, hasher)

  const canonical = envelope.snapshot
  const expectedAcceptanceSnapshot = {
    acceptanceCriteria: canonical.resolvedContract.work.acceptanceCriteria,
    verificationMethods: canonical.resolvedContract.evidence.verificationMethods,
  }
  const expectedWorkflowSnapshot = {
    acknowledgementRequired: canonical.acknowledgementRequired,
    acknowledgementBasis: envelope.acknowledgementBasis,
    readiness: canonical.resolvedContract.readiness,
  }
  if (
    snapshot.schema_version !== envelope.schemaVersion ||
    canonical.id !== snapshot.id ||
    canonical.assignmentId !== snapshot.task_assignment_id ||
    canonical.taskId !== snapshot.task_id ||
    canonical.resolvedContract.taskId !== snapshot.task_id ||
    canonical.snapshotHash !== snapshot.snapshot_hash ||
    canonical.acknowledgementRequired !== snapshot.acknowledgement_required ||
    canonical.provenance.taskSpecificationVersionId !== snapshot.task_specification_version_id ||
    canonical.provenance.taskContractVersionId !== snapshot.task_contract_version_id ||
    !isDeepStrictEqual(snapshot.task_snapshot, canonical.resolvedContract) ||
    !isDeepStrictEqual(snapshot.acceptance_criteria_snapshot, expectedAcceptanceSnapshot) ||
    !isDeepStrictEqual(snapshot.workflow_snapshot, expectedWorkflowSnapshot)
  ) {
    throw new InvariantViolationException(
      'Assignment Contract canonical envelope and immutable snapshot row are inconsistent'
    )
  }

  return envelope
}

function assertHeadIntegrity(
  head: TaskAssignmentContractHead,
  currentSnapshot: TaskAssignmentSnapshot
): void {
  if (
    head.task_assignment_id !== currentSnapshot.task_assignment_id ||
    head.task_id !== currentSnapshot.task_id ||
    head.current_snapshot_id !== currentSnapshot.id ||
    head.expected_snapshot_hash !== currentSnapshot.snapshot_hash ||
    head.revision !== currentSnapshot.snapshot_sequence
  ) {
    throw new InvariantViolationException(
      'Assignment Contract mutable head and immutable current snapshot are inconsistent'
    )
  }
}

function assertSuccessorChangeIntegrity(
  previous: TaskAssignmentContractSnapshotRecord,
  next: CanonicalTaskAssignmentContractSnapshotV1
): TaskContractChangeDecisionV1 {
  const decision = next.changeDecision
  const validHistoricalDecision = verifyTaskContractChangeDecision({
    decision,
    previous: previous.envelope.snapshot.resolvedContract,
    next: next.snapshot.resolvedContract,
  })
  const expectedChangeClass = decision.changeClass ?? 'editorial'
  const basis = next.acknowledgementBasis
  if (
    !validHistoricalDecision ||
    basis.kind === 'fresh_assignment' ||
    basis.changeClass !== expectedChangeClass ||
    (basis.kind === 'acknowledgement_carried_forward' && decision.requiresReack)
  ) {
    throw new InvariantViolationException(
      'Assignment Contract successor acknowledgement basis contradicts the canonical content change'
    )
  }
  return decision
}

type GovernedAssignmentLifecycle = 'review' | 'dispute' | 'legacy_unpinned_workflow'

const ACTIVE_REVIEW_DISPUTE_STATUSES: string[] = [
  'pending',
  'collecting_evidence',
  'admin_reviewing',
  'ai_reviewing',
]

async function findGovernedAssignmentLifecycle(
  trx: TransactionClientContract,
  taskId: string,
  assignmentId: string
): Promise<GovernedAssignmentLifecycle | null> {
  const activeDispute = (await trx
    .from('review_disputes')
    .where('task_id', taskId)
    .where('task_assignment_id', assignmentId)
    .whereIn('status', ACTIVE_REVIEW_DISPUTE_STATUSES)
    .select('id')
    .first()) as { id: string } | undefined
  if (activeDispute) return 'dispute'

  const activeReview = (await trx
    .from('review_sessions as rs')
    .join('task_assignments as ta', 'ta.id', 'rs.task_assignment_id')
    .where('ta.task_id', taskId)
    .where('rs.task_assignment_id', assignmentId)
    .whereIn('rs.status', ['pending', 'in_progress', 'disputed'])
    .orderBy('rs.created_at', 'desc')
    .select('rs.status')
    .first()) as { status: string } | undefined
  const taskWorkflow = (await trx
    .from('task_review_workflows as trw')
    .where('trw.task_assignment_id', assignmentId)
    .where('trw.task_id', taskId)
    .orderBy('trw.updated_at', 'desc')
    .select('trw.status')
    .first()) as { status: string } | undefined
  const legacyWorkflow = (await trx
    .from('task_review_workflows as trw')
    .where('trw.task_id', taskId)
    .whereNull('trw.task_assignment_id')
    .whereIn('trw.status', [
      'awaiting_review',
      'in_review',
      'awaiting_response',
      'disputed',
      'reported',
      'ai_reviewing',
    ])
    .select('trw.id')
    .first()) as { id: string } | undefined

  if (
    activeReview?.status === 'disputed' ||
    (taskWorkflow && ['disputed', 'reported', 'ai_reviewing'].includes(taskWorkflow.status))
  ) {
    return 'dispute'
  }
  if (
    activeReview ||
    (taskWorkflow &&
      ['awaiting_review', 'in_review', 'awaiting_response'].includes(taskWorkflow.status))
  ) {
    return 'review'
  }
  if (legacyWorkflow) return 'legacy_unpinned_workflow'
  return null
}

async function assertGovernedSuccessorPersistenceAllowed(input: {
  readonly trx: TransactionClientContract
  readonly taskId: string
  readonly assignmentId: string
  readonly reacknowledgementRequired: boolean
}): Promise<void> {
  if (!input.reacknowledgementRequired) return

  const lifecycle = await findGovernedAssignmentLifecycle(
    input.trx,
    input.taskId,
    input.assignmentId
  )
  if (!lifecycle) return

  const reasonCode =
    lifecycle === 'legacy_unpinned_workflow'
      ? TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.legacyUnpinnedWorkflowProvenanceRequired
      : TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.governedSuccessorCycleRequired
  throw new ConflictException(reasonCode, { reasonCode, workLifecycle: lifecycle })
}

async function assertResolvedReadinessHistoryIntegrity(input: {
  readonly trx: TransactionClientContract
  readonly envelope: CanonicalTaskAssignmentContractSnapshotV1
  readonly hasher: TaskContractContentHasher
}): Promise<void> {
  const canonical = input.envelope.snapshot
  const assessments = await TaskReadinessAssessment.query({ client: input.trx })
    .where('task_id', canonical.taskId)
    .orderBy('assessed_at', 'asc')
    .orderBy('id', 'asc')
  let currentIndex = -1
  for (let index = assessments.length - 1; index >= 0; index -= 1) {
    const assessment = assessments[index]
    if (
      assessment?.task_specification_version_id ===
        canonical.provenance.taskSpecificationVersionId &&
      assessment.task_contract_version_id === canonical.provenance.taskContractVersionId
    ) {
      currentIndex = index
      break
    }
  }
  const currentAssessment = assessments[currentIndex]
  if (!currentAssessment) {
    throw new InvariantViolationException(
      'Assignment Contract snapshot references a Contract without immutable readiness history'
    )
  }
  const current = mapTaskReadinessAssessmentModel(currentAssessment)
  const expectedResolvedCodes = deriveResolvedReadinessFindingCodes({
    historical: assessments
      .slice(0, currentIndex + 1)
      .map((assessment) => mapTaskReadinessAssessmentModel(assessment)),
    current,
  })
  if (
    input.hasher.hash(current) !== input.hasher.hash(canonical.resolvedContract.readiness) ||
    !isDeepStrictEqual(canonical.readinessFindingCodesResolved, expectedResolvedCodes)
  ) {
    throw new InvariantViolationException(
      'Assignment Contract readiness history does not match immutable authoring assessments'
    )
  }
}

type LockedInteractionContext = NonNullable<
  Awaited<ReturnType<LucidTaskAssignmentContractRepository['lockInteractionContext']>>
>

function assertInteractionPersistenceFence(
  context: LockedInteractionContext | null,
  interaction: 'acknowledgement' | 'clarification'
): asserts context is LockedInteractionContext {
  if (
    !context ||
    context.assignmentState !== 'active' ||
    context.taskState !== 'active' ||
    !context.assigneeActive ||
    !context.acknowledgementRequired ||
    (interaction === 'acknowledgement' && context.clarificationOpen)
  ) {
    throw new ConflictException(
      `Assignment ${interaction} is no longer valid for the locked lifecycle state`
    )
  }
}

function mapRecord(
  snapshot: TaskAssignmentSnapshot,
  envelope: CanonicalTaskAssignmentContractSnapshotV1,
  acknowledgementState: TaskAssignmentAcknowledgementState,
  replayed: boolean
): TaskAssignmentContractSnapshotRecord {
  return {
    id: snapshot.id,
    assignmentId: snapshot.task_assignment_id,
    taskId: snapshot.task_id,
    sequence: snapshot.snapshot_sequence as number,
    previousSnapshotId: snapshot.previous_snapshot_id,
    envelope,
    snapshotHash: snapshot.snapshot_hash as `sha256:${string}`,
    acknowledgementRequired: snapshot.acknowledgement_required as boolean,
    acknowledgementState,
    idempotencyKey: snapshot.idempotency_key as string,
    replayed,
  }
}

function requiredTransaction(transaction: TaskTransaction): TransactionClientContract {
  const trx = lucidTransaction(transaction)
  if (!trx) throw new InvariantViolationException('Assignment Contract transaction is required')
  return trx
}

function iso(date: DateTime, field: string): string {
  const value = date.toUTC().toISO()
  if (!value) throw new InvariantViolationException(`${field} is not a valid timestamp`)
  return value
}

async function lockInteractionIdempotencyKey(
  trx: TransactionClientContract,
  kind: 'acknowledgement' | 'clarification',
  actorId: string,
  idempotencyKey: string
): Promise<void> {
  await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [
    `task-assignment:${kind}:${actorId}:${idempotencyKey}`,
  ])
}

export class LucidTaskAssignmentContractRepository implements TaskAssignmentContractRepository {
  constructor(
    private readonly hasher: TaskContractContentHasher = new NodeTaskContractContentHasher()
  ) {}

  async persistSnapshot(
    input: PersistTaskAssignmentContractSnapshotInput,
    transaction: TaskTransaction
  ): Promise<TaskAssignmentContractSnapshotRecord> {
    assertInput(input, this.hasher)
    const trx = lucidTransaction(transaction)
    if (!trx) throw new InvariantViolationException('Assignment snapshot transaction is required')
    const canonical = input.envelope.snapshot

    const task = await Task.query({ client: trx }).where('id', canonical.taskId).forUpdate().first()
    if (
      !task ||
      task.deleted_at !== null ||
      task.status === 'cancelled' ||
      task.organization_id !== canonical.organizationId ||
      task.project_id !== canonical.projectId
    ) {
      throw new InvariantViolationException(
        'Assignment Contract snapshot does not match the durable Task boundary'
      )
    }
    await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [
      canonical.assignmentId,
    ])
    const assignment = await TaskAssignment.query({ client: trx })
      .where('id', canonical.assignmentId)
      .forUpdate()
      .first()
    if (
      !assignment ||
      assignment.assignment_status !== 'active' ||
      assignment.task_id !== canonical.taskId ||
      assignment.assignee_id !== canonical.assigneeId ||
      assignment.assigned_by !== canonical.assignedBy
    ) {
      throw new InvariantViolationException(
        'Assignment Contract snapshot does not match the durable task assignment'
      )
    }
    const [contract, specification] = await Promise.all([
      TaskContractVersion.query({ client: trx })
        .where('id', canonical.provenance.taskContractVersionId)
        .first(),
      TaskSpecificationVersion.query({ client: trx })
        .where('id', canonical.provenance.taskSpecificationVersionId)
        .first(),
    ])
    if (contract && specification) {
      assertTaskSpecificationContractIntegrity({
        expectedTaskId: canonical.taskId,
        specification: mapTaskSpecificationVersionModel(specification),
        contract: mapTaskContractVersionModel(contract),
        hasher: this.hasher,
      })
    }
    if (
      !contract ||
      !specification ||
      contract.task_id !== canonical.taskId ||
      specification.task_id !== canonical.taskId ||
      contract.task_specification_version_id !== specification.id ||
      contract.creator_confirmed_by !== canonical.creatorConfirmation.confirmedBy ||
      !contract.creator_confirmed_at ||
      iso(contract.creator_confirmed_at, 'Task Contract creator confirmation') !==
        canonical.creatorConfirmation.confirmedAt ||
      canonical.roleInTask !== canonical.resolvedContract.work.roleInTask ||
      canonical.ownershipLevel !== canonical.resolvedContract.work.ownershipLevel ||
      canonical.provenance.projectContextVersionId !==
        canonical.resolvedContract.inheritedFrom.projectContextVersionId ||
      canonical.provenance.workPackageVersionId !==
        canonical.resolvedContract.inheritedFrom.workPackageVersionId ||
      !isDeepStrictEqual(contract.resolved_contract, canonical.resolvedContract) ||
      !isDeepStrictEqual(contract.resolution_provenance, input.envelope.workFieldProvenance)
    ) {
      throw new InvariantViolationException(
        'Assignment Contract snapshot references foreign or inconsistent authoring facts'
      )
    }
    await assertResolvedReadinessHistoryIntegrity({
      trx,
      envelope: input.envelope,
      hasher: this.hasher,
    })

    const existing = await TaskAssignmentSnapshot.query({ client: trx })
      .where('task_assignment_id', canonical.assignmentId)
      .where('idempotency_key', input.idempotencyKey)
      .first()
    if (existing) {
      const persistedEnvelope = assertSnapshotRowIntegrity(existing, this.hasher)
      if (
        existing.snapshot_hash !== canonical.snapshotHash ||
        existing.id !== canonical.id ||
        !isDeepStrictEqual(persistedEnvelope, input.envelope)
      ) {
        throw new ConflictException(
          'Assignment snapshot idempotency key was reused with a different payload'
        )
      }
      const history = await this.loadHistory(canonical.assignmentId, trx)
      const replay = history.find((record) => record.id === existing.id)
      if (!replay) {
        throw new InvariantViolationException(
          'Idempotent assignment snapshot is absent from its immutable history'
        )
      }
      return { ...replay, replayed: true }
    }

    const head = await TaskAssignmentContractHead.query({ client: trx })
      .where('task_assignment_id', canonical.assignmentId)
      .forUpdate()
      .first()
    const existingHistory = await this.loadHistory(canonical.assignmentId, trx, head)
    const previousRecord = existingHistory.at(-1)
    const basis = input.envelope.acknowledgementBasis
    if (
      (head === null && basis.kind !== 'fresh_assignment') ||
      (head !== null &&
        (basis.kind === 'fresh_assignment' ||
          basis.previousSnapshotId !== previousRecord?.id ||
          basis.previousAcknowledgementState !== previousRecord.acknowledgementState))
    ) {
      throw new InvariantViolationException(
        'Assignment Contract successor acknowledgement basis does not match the immutable predecessor'
      )
    }
    const actualRevision = head?.revision ?? 0
    if (actualRevision !== input.expectedHeadRevision) {
      throw new ConflictException('Assignment Contract head revision is stale', {
        expectedHeadRevision: input.expectedHeadRevision,
        actualHeadRevision: actualRevision,
      })
    }
    if (previousRecord) {
      const change = assertSuccessorChangeIntegrity(previousRecord, input.envelope)
      await assertGovernedSuccessorPersistenceAllowed({
        trx,
        taskId: canonical.taskId,
        assignmentId: canonical.assignmentId,
        reacknowledgementRequired:
          basis.kind === 'reacknowledgement_required' || change.requiresReack,
      })
    }
    const sequence = actualRevision + 1
    const canonicalCreatedAt = DateTime.fromISO(canonical.createdAt, { zone: 'utc' })
    const previousCreatedAt = previousRecord
      ? DateTime.fromISO(previousRecord.envelope.snapshot.createdAt, { zone: 'utc' })
      : null
    if (
      !canonicalCreatedAt.isValid ||
      (!previousRecord &&
        canonicalCreatedAt.toMillis() !== assignment.assigned_at.toUTC().toMillis()) ||
      (previousCreatedAt && canonicalCreatedAt.toMillis() <= previousCreatedAt.toMillis())
    ) {
      throw new InvariantViolationException(
        'Assignment Contract snapshot timestamp contradicts assignment chronology'
      )
    }
    const created = await TaskAssignmentSnapshot.create(
      {
        id: canonical.id,
        task_assignment_id: canonical.assignmentId,
        task_id: canonical.taskId,
        snapshot_reason: 'assigned',
        task_snapshot: toJsonRecord(canonical.resolvedContract),
        required_skills_snapshot: [],
        acceptance_criteria_snapshot: {
          acceptanceCriteria: canonical.resolvedContract.work.acceptanceCriteria,
          verificationMethods: canonical.resolvedContract.evidence.verificationMethods,
        },
        workflow_snapshot: {
          acknowledgementRequired: canonical.acknowledgementRequired,
          acknowledgementBasis: input.envelope.acknowledgementBasis,
          readiness: canonical.resolvedContract.readiness,
        },
        schema_version: input.envelope.schemaVersion,
        task_specification_version_id: canonical.provenance.taskSpecificationVersionId,
        task_contract_version_id: canonical.provenance.taskContractVersionId,
        snapshot_sequence: sequence,
        previous_snapshot_id: head?.current_snapshot_id ?? null,
        canonical_snapshot: input.envelope,
        snapshot_hash: canonical.snapshotHash,
        acknowledgement_required: canonical.acknowledgementRequired,
        idempotency_key: input.idempotencyKey,
      },
      { client: trx }
    )
    const acknowledgementState: TaskAssignmentAcknowledgementState =
      input.envelope.acknowledgementBasis.kind === 'acknowledgement_carried_forward'
        ? 'acknowledged'
        : canonical.acknowledgementRequired
          ? 'pending'
          : 'not_required'
    let nextHead: TaskAssignmentContractHead
    if (head) {
      head.merge({
        task_id: canonical.taskId,
        current_snapshot_id: created.id,
        revision: sequence,
        acknowledgement_state: acknowledgementState,
        expected_snapshot_hash: canonical.snapshotHash,
      })
      await head.save()
      nextHead = head
    } else {
      nextHead = await TaskAssignmentContractHead.create(
        {
          task_assignment_id: canonical.assignmentId,
          task_id: canonical.taskId,
          current_snapshot_id: created.id,
          revision: sequence,
          acknowledgement_state: acknowledgementState,
          expected_snapshot_hash: canonical.snapshotHash,
        },
        { client: trx }
      )
    }

    const persistedEnvelope = assertSnapshotRowIntegrity(created, this.hasher)
    assertHeadIntegrity(nextHead, created)
    return mapRecord(created, persistedEnvelope, acknowledgementState, false)
  }

  async findCurrent(
    assignmentId: string,
    transaction?: TaskTransaction
  ): Promise<TaskAssignmentContractSnapshotRecord | null> {
    const history = await this.loadHistory(assignmentId, lucidTransaction(transaction))
    return history.at(-1) ?? null
  }

  async findHistory(
    assignmentId: string,
    transaction?: TaskTransaction
  ): Promise<readonly TaskAssignmentContractSnapshotRecord[]> {
    return this.loadHistory(assignmentId, lucidTransaction(transaction))
  }

  async findAcknowledgementReplay(
    input: TaskAssignmentInteractionReplayLookupInput,
    transaction: TaskTransaction
  ) {
    const trx = requiredTransaction(transaction)
    await lockInteractionIdempotencyKey(
      trx,
      'acknowledgement',
      input.actorId,
      input.idempotencyKey
    )
    const replay = await TaskAssignmentAcknowledgement.query({ client: trx })
      .where('assignee_id', input.actorId)
      .where('idempotency_key', input.idempotencyKey)
      .first()
    if (!replay) return null

    const snapshot = await TaskAssignmentSnapshot.query({ client: trx })
      .where('id', replay.snapshot_id)
      .first()
    if (!snapshot) {
      throw new InvariantViolationException(
        'Assignment acknowledgement references a missing immutable snapshot'
      )
    }
    const envelope = assertSnapshotRowIntegrity(snapshot, this.hasher)
    const contractVersionHead = snapshot.snapshot_sequence
    if (contractVersionHead === null || !Number.isSafeInteger(contractVersionHead)) {
      throw new InvariantViolationException(
        'Assignment acknowledgement references a legacy or invalid snapshot sequence'
      )
    }
    const durableFact = {
      assignmentId: replay.task_assignment_id,
      assigneeId: replay.assignee_id,
      snapshotId: replay.snapshot_id,
      snapshotHash: replay.snapshot_hash,
      contractVersionHead,
      acknowledgedAt: iso(replay.acknowledged_at, 'Assignment acknowledgement acknowledged_at'),
    }
    const durableRequestHash = this.hasher.hash(
      assignmentAcknowledgementRequestHashInput(durableFact)
    )
    if (
      envelope.snapshot.assignmentId !== durableFact.assignmentId ||
      envelope.snapshot.assigneeId !== durableFact.assigneeId ||
      snapshot.snapshot_hash !== durableFact.snapshotHash ||
      replay.request_hash !== durableRequestHash
    ) {
      throw new InvariantViolationException(
        'Assignment acknowledgement replay failed durable integrity validation'
      )
    }
    if (
      input.requestHash !== durableRequestHash ||
      input.assignmentId !== durableFact.assignmentId ||
      input.snapshotId !== durableFact.snapshotId ||
      input.snapshotHash !== durableFact.snapshotHash ||
      input.contractVersionHead !== durableFact.contractVersionHead
    ) {
      throw new ConflictException(
        'Assignment acknowledgement idempotency key was reused with a different request'
      )
    }
    return { fact: durableFact, replayed: true }
  }

  async findClarificationReplay(
    input: TaskAssignmentInteractionReplayLookupInput,
    transaction: TaskTransaction
  ) {
    const trx = requiredTransaction(transaction)
    await lockInteractionIdempotencyKey(
      trx,
      'clarification',
      input.actorId,
      input.idempotencyKey
    )
    const replay = await TaskAssignmentClarificationRequest.query({ client: trx })
      .where('requested_by', input.actorId)
      .where('idempotency_key', input.idempotencyKey)
      .first()
    if (!replay) return null

    const snapshot = await TaskAssignmentSnapshot.query({ client: trx })
      .where('id', replay.snapshot_id)
      .first()
    if (!snapshot) {
      throw new InvariantViolationException(
        'Assignment clarification references a missing immutable snapshot'
      )
    }
    const envelope = assertSnapshotRowIntegrity(snapshot, this.hasher)
    const contractVersionHead = snapshot.snapshot_sequence
    if (contractVersionHead === null || !Number.isSafeInteger(contractVersionHead)) {
      throw new InvariantViolationException(
        'Assignment clarification references a legacy or invalid snapshot sequence'
      )
    }
    const durableFact = {
      requestId: replay.id,
      assignmentId: replay.task_assignment_id,
      requestedBy: replay.requested_by,
      snapshotId: replay.snapshot_id,
      snapshotHash: snapshot.snapshot_hash as `sha256:${string}`,
      contractVersionHead,
      requestedAt: iso(replay.created_at, 'Assignment clarification created_at'),
    }
    const durableRequestHash = this.hasher.hash(
      assignmentClarificationRequestHashInput({ request: durableFact, reason: replay.reason })
    )
    if (
      envelope.snapshot.assignmentId !== durableFact.assignmentId ||
      envelope.snapshot.assigneeId !== durableFact.requestedBy ||
      replay.request_hash !== durableRequestHash
    ) {
      throw new InvariantViolationException(
        'Assignment clarification replay failed durable integrity validation'
      )
    }
    if (
      input.requestHash !== durableRequestHash ||
      input.assignmentId !== durableFact.assignmentId ||
      input.snapshotId !== durableFact.snapshotId ||
      input.snapshotHash !== durableFact.snapshotHash ||
      input.contractVersionHead !== durableFact.contractVersionHead
    ) {
      throw new ConflictException(
        'Assignment clarification idempotency key was reused with a different request'
      )
    }
    return { fact: durableFact, replayed: true }
  }

  async lockInteractionContext(assignmentId: string, transaction: TaskTransaction) {
    const trx = requiredTransaction(transaction)
    const assignmentPointer = await TaskAssignment.query({ client: trx })
      .where('id', assignmentId)
      .select('id', 'task_id')
      .first()
    if (!assignmentPointer) return null

    const task = await Task.query({ client: trx })
      .where('id', assignmentPointer.task_id)
      .forUpdate()
      .first()
    const assignment = await TaskAssignment.query({ client: trx })
      .where('id', assignmentId)
      .forUpdate()
      .first()
    if (!task || !assignment || assignment.task_id !== assignmentPointer.task_id) {
      throw new InvariantViolationException(
        'Assignment Contract interaction context changed while acquiring lifecycle locks'
      )
    }
    const assignee = (await trx
      .from('users')
      .select('status', 'deleted_at')
      .where('id', assignment.assignee_id)
      .forUpdate()
      .first()) as { status: string; deleted_at: Date | string | null } | undefined
    const head = await TaskAssignmentContractHead.query({ client: trx })
      .where('task_assignment_id', assignmentId)
      .forUpdate()
      .first()
    if (!head) return null

    const history = await this.loadHistory(assignmentId, trx, head)
    const current = history.at(-1)
    if (!current) {
      throw new InvariantViolationException(
        'Assignment Contract interaction head has no immutable current snapshot'
      )
    }
    if (!assignee) {
      throw new InvariantViolationException(
        'Assignment Contract interaction context is missing assignee state'
      )
    }
    if (
      current.taskId !== task.id ||
      current.envelope.snapshot.assigneeId !== assignment.assignee_id
    ) {
      throw new InvariantViolationException(
        'Assignment Contract interaction context crosses Task or assignee boundaries'
      )
    }
    const existingAcknowledgement = await TaskAssignmentAcknowledgement.query({ client: trx })
      .where('task_assignment_id', assignmentId)
      .orderBy('created_at', 'desc')
      .first()
    const openClarification = await TaskAssignmentClarificationRequest.query({ client: trx })
      .where('task_assignment_id', assignmentId)
      .where('snapshot_id', current.id)
      .where('state', 'open')
      .first()

    return {
      assignmentId,
      assigneeId: assignment.assignee_id,
      assignmentState: assignment.assignment_status,
      taskState:
        task.deleted_at !== null || task.status === 'cancelled'
          ? ('cancelled' as const)
          : ('active' as const),
      assigneeActive: assignee.status === 'active' && assignee.deleted_at === null,
      acknowledgementRequired: current.acknowledgementRequired,
      clarificationOpen: openClarification !== null,
      currentSnapshot: {
        snapshotId: current.id,
        snapshotHash: current.snapshotHash,
        contractVersionHead: current.sequence,
      },
      existingAcknowledgement: existingAcknowledgement
        ? {
            assignmentId: existingAcknowledgement.task_assignment_id,
            assigneeId: existingAcknowledgement.assignee_id,
            snapshotId: existingAcknowledgement.snapshot_id,
            snapshotHash: existingAcknowledgement.snapshot_hash,
            contractVersionHead:
              history.find((record) => record.id === existingAcknowledgement.snapshot_id)
                ?.sequence ?? 0,
            acknowledgedAt: iso(
              existingAcknowledgement.acknowledged_at,
              'Assignment acknowledgement acknowledged_at'
            ),
          }
        : null,
    }
  }

  async persistAcknowledgement(
    input: PersistTaskAssignmentAcknowledgementInput,
    transaction: TaskTransaction
  ) {
    const trx = requiredTransaction(transaction)
    if (
      !input.idempotencyKey.trim() ||
      this.hasher.hash(assignmentAcknowledgementRequestHashInput(input.fact)) !== input.requestHash
    ) {
      throw new InvariantViolationException(
        'Assignment acknowledgement persistence input failed integrity validation'
      )
    }
    const context = await this.lockInteractionContext(input.fact.assignmentId, transaction)
    assertInteractionPersistenceFence(context, 'acknowledgement')
    if (
      context.assigneeId !== input.fact.assigneeId ||
      context.currentSnapshot.snapshotId !== input.fact.snapshotId ||
      context.currentSnapshot.snapshotHash !== input.fact.snapshotHash ||
      context.currentSnapshot.contractVersionHead !== input.fact.contractVersionHead
    ) {
      throw new ConflictException('Assignment acknowledgement targets a stale Contract snapshot')
    }

    const replay = await TaskAssignmentAcknowledgement.query({ client: trx })
      .where('assignee_id', input.fact.assigneeId)
      .where('idempotency_key', input.idempotencyKey)
      .first()
    if (replay) {
      if (
        replay.request_hash !== input.requestHash ||
        replay.task_assignment_id !== input.fact.assignmentId ||
        replay.snapshot_id !== input.fact.snapshotId
      ) {
        throw new ConflictException(
          'Assignment acknowledgement idempotency key was reused with a different request'
        )
      }
      return {
        replayed: true,
        fact: {
          assignmentId: replay.task_assignment_id,
          assigneeId: replay.assignee_id,
          snapshotId: replay.snapshot_id,
          snapshotHash: replay.snapshot_hash,
          contractVersionHead: input.fact.contractVersionHead,
          acknowledgedAt: iso(replay.acknowledged_at, 'Assignment acknowledgement acknowledged_at'),
        },
      }
    }

    const existingExact = await TaskAssignmentAcknowledgement.query({ client: trx })
      .where('task_assignment_id', input.fact.assignmentId)
      .where('snapshot_id', input.fact.snapshotId)
      .where('assignee_id', input.fact.assigneeId)
      .first()
    if (existingExact) {
      return {
        replayed: true,
        fact: {
          assignmentId: existingExact.task_assignment_id,
          assigneeId: existingExact.assignee_id,
          snapshotId: existingExact.snapshot_id,
          snapshotHash: existingExact.snapshot_hash,
          contractVersionHead: input.fact.contractVersionHead,
          acknowledgedAt: iso(
            existingExact.acknowledged_at,
            'Assignment acknowledgement acknowledged_at'
          ),
        },
      }
    }

    const acknowledgement = await TaskAssignmentAcknowledgement.create(
      {
        schema_version: 'suar.task_assignment_acknowledgement.v1',
        task_assignment_id: input.fact.assignmentId,
        snapshot_id: input.fact.snapshotId,
        assignee_id: input.fact.assigneeId,
        snapshot_hash: input.fact.snapshotHash,
        idempotency_key: input.idempotencyKey,
        request_hash: input.requestHash,
        acknowledged_at: DateTime.fromISO(input.fact.acknowledgedAt, { zone: 'utc' }),
      },
      { client: trx }
    )
    const head = await TaskAssignmentContractHead.query({ client: trx })
      .where('task_assignment_id', input.fact.assignmentId)
      .forUpdate()
      .firstOrFail()
    head.acknowledgement_state = 'acknowledged'
    await head.save()

    return {
      replayed: false,
      fact: {
        ...input.fact,
        acknowledgedAt: iso(acknowledgement.acknowledged_at, 'Assignment acknowledgement acknowledged_at'),
      },
    }
  }

  async persistClarification(
    input: PersistTaskAssignmentClarificationInput,
    transaction: TaskTransaction
  ) {
    const trx = requiredTransaction(transaction)
    const reason = input.reason.trim()
    if (
      !reason ||
      !input.idempotencyKey.trim() ||
      this.hasher.hash(
        assignmentClarificationRequestHashInput({ request: input.request, reason })
      ) !== input.requestHash
    ) {
      throw new InvariantViolationException(
        'Assignment clarification persistence input failed integrity validation'
      )
    }
    const context = await this.lockInteractionContext(input.request.assignmentId, transaction)
    assertInteractionPersistenceFence(context, 'clarification')
    if (
      context.assigneeId !== input.request.requestedBy ||
      context.currentSnapshot.snapshotId !== input.request.snapshotId ||
      context.currentSnapshot.snapshotHash !== input.request.snapshotHash ||
      context.currentSnapshot.contractVersionHead !== input.request.contractVersionHead
    ) {
      throw new ConflictException('Assignment clarification targets a stale Contract snapshot')
    }

    const replay = await TaskAssignmentClarificationRequest.query({ client: trx })
      .where('requested_by', input.request.requestedBy)
      .where('idempotency_key', input.idempotencyKey)
      .first()
    if (replay) {
      if (
        replay.request_hash !== input.requestHash ||
        replay.task_assignment_id !== input.request.assignmentId ||
        replay.snapshot_id !== input.request.snapshotId ||
        replay.reason !== reason
      ) {
        throw new ConflictException(
          'Assignment clarification idempotency key was reused with a different request'
        )
      }
      return {
        replayed: true,
        fact: {
          requestId: replay.id,
          assignmentId: replay.task_assignment_id,
          requestedBy: replay.requested_by,
          snapshotId: replay.snapshot_id,
          snapshotHash: input.request.snapshotHash,
          contractVersionHead: input.request.contractVersionHead,
          requestedAt: iso(replay.created_at, 'Assignment clarification created_at'),
        },
      }
    }
    const existingOpen = await TaskAssignmentClarificationRequest.query({ client: trx })
      .where('task_assignment_id', input.request.assignmentId)
      .where('snapshot_id', input.request.snapshotId)
      .where('state', 'open')
      .first()
    if (existingOpen) {
      throw new ConflictException('Assignment Contract already has an open clarification request')
    }

    const clarification = await TaskAssignmentClarificationRequest.create(
      {
        id: input.request.requestId,
        schema_version: 'suar.task_assignment_clarification.v1',
        task_assignment_id: input.request.assignmentId,
        snapshot_id: input.request.snapshotId,
        requested_by: input.request.requestedBy,
        reason,
        state: 'open',
        idempotency_key: input.idempotencyKey,
        request_hash: input.requestHash,
      },
      { client: trx }
    )
    if (!context.existingAcknowledgement || context.existingAcknowledgement.snapshotId !== input.request.snapshotId) {
      const head = await TaskAssignmentContractHead.query({ client: trx })
        .where('task_assignment_id', input.request.assignmentId)
        .forUpdate()
        .firstOrFail()
      head.acknowledgement_state = 'clarification_requested'
      await head.save()
    }

    return {
      replayed: false,
      fact: {
        ...input.request,
        requestedAt: iso(clarification.created_at, 'Assignment clarification created_at'),
      },
    }
  }

  private async loadHistory(
    assignmentId: string,
    trx?: TransactionClientContract,
    knownHead?: TaskAssignmentContractHead | null
  ): Promise<TaskAssignmentContractSnapshotRecord[]> {
    const snapshotQuery = trx
      ? TaskAssignmentSnapshot.query({ client: trx })
      : TaskAssignmentSnapshot.query()
    const snapshots = await snapshotQuery
      .where('task_assignment_id', assignmentId)
      .whereNotNull('schema_version')
      .orderBy('snapshot_sequence', 'asc')
    const head =
      knownHead === undefined
        ? await (
            trx
              ? TaskAssignmentContractHead.query({ client: trx })
              : TaskAssignmentContractHead.query()
          )
            .where('task_assignment_id', assignmentId)
            .first()
        : knownHead

    if (snapshots.length === 0) {
      if (head) {
        throw new InvariantViolationException(
          'Assignment Contract head exists without immutable snapshots'
        )
      }
      return []
    }
    if (!head) {
      throw new InvariantViolationException(
        'Native assignment Contract snapshots exist without a mutable head'
      )
    }

    const snapshotIds = snapshots.map((snapshot) => snapshot.id)
    const acknowledgementQuery = trx
      ? TaskAssignmentAcknowledgement.query({ client: trx })
      : TaskAssignmentAcknowledgement.query()
    const clarificationQuery = trx
      ? TaskAssignmentClarificationRequest.query({ client: trx })
      : TaskAssignmentClarificationRequest.query()
    const [acknowledgements, openClarifications] = await Promise.all([
      acknowledgementQuery.whereIn('snapshot_id', snapshotIds),
      clarificationQuery.whereIn('snapshot_id', snapshotIds).where('state', 'open'),
    ])
    const acknowledgedSnapshotIds = new Set(
      acknowledgements.map((acknowledgement) => acknowledgement.snapshot_id)
    )
    const clarificationSnapshotIds = new Set(
      openClarifications.map((clarification) => clarification.snapshot_id)
    )

    const records: TaskAssignmentContractSnapshotRecord[] = []
    let previous: TaskAssignmentSnapshot | null = null
    for (const [index, snapshot] of snapshots.entries()) {
      const envelope = assertSnapshotRowIntegrity(snapshot, this.hasher)
      const basis = envelope.acknowledgementBasis
      const expectedSequence = index + 1
      if (
        snapshot.snapshot_sequence !== expectedSequence ||
        snapshot.previous_snapshot_id !== (previous?.id ?? null) ||
        (index === 0
          ? basis.kind !== 'fresh_assignment'
          : basis.kind === 'fresh_assignment' || basis.previousSnapshotId !== previous?.id)
      ) {
        throw new InvariantViolationException(
          'Assignment Contract immutable snapshot chain is discontinuous'
        )
      }
      const hasAcknowledgement = acknowledgedSnapshotIds.has(snapshot.id)
      const hasOpenClarification = clarificationSnapshotIds.has(snapshot.id)
      const snapshotAcknowledgements = acknowledgements.filter(
        (acknowledgement) => acknowledgement.snapshot_id === snapshot.id
      )
      const snapshotClarifications = openClarifications.filter(
        (clarification) => clarification.snapshot_id === snapshot.id
      )
      if (
        snapshotAcknowledgements.some(
          (acknowledgement) =>
            acknowledgement.task_assignment_id !== assignmentId ||
            acknowledgement.assignee_id !== envelope.snapshot.assigneeId ||
            acknowledgement.snapshot_hash !== snapshot.snapshot_hash
        ) ||
        snapshotClarifications.some(
          (clarification) =>
            clarification.task_assignment_id !== assignmentId ||
            clarification.requested_by !== envelope.snapshot.assigneeId
        )
      ) {
        throw new InvariantViolationException(
          'Assignment Contract interaction fact crosses immutable assignment boundaries'
        )
      }
      if (
        !snapshot.acknowledgement_required &&
        (hasAcknowledgement || hasOpenClarification)
      ) {
        throw new InvariantViolationException(
          'Assignment Contract acknowledgement facts are inconsistent'
        )
      }
      const previousRecord = records.at(-1)
      if (previousRecord) {
        assertSuccessorChangeIntegrity(previousRecord, envelope)
      }
      if (
        basis.kind !== 'fresh_assignment' &&
        basis.previousAcknowledgementState !== previousRecord?.acknowledgementState
      ) {
        throw new InvariantViolationException(
          'Assignment Contract successor basis misstates predecessor acknowledgement state'
        )
      }
      if (
        basis.kind === 'acknowledgement_carried_forward' &&
        previousRecord?.acknowledgementState !== 'acknowledged'
      ) {
        throw new InvariantViolationException(
          'Assignment Contract carry-forward basis does not reference an acknowledged predecessor'
        )
      }
      const acknowledgementState: TaskAssignmentAcknowledgementState =
        basis.kind === 'acknowledgement_carried_forward'
          ? 'acknowledged'
          : snapshot.acknowledgement_required === false
            ? 'not_required'
            : hasAcknowledgement
              ? 'acknowledged'
              : hasOpenClarification
                ? 'clarification_requested'
                : 'pending'
      records.push(mapRecord(snapshot, envelope, acknowledgementState, false))
      previous = snapshot
    }

    const currentSnapshot = snapshots.at(-1) as TaskAssignmentSnapshot
    assertHeadIntegrity(head, currentSnapshot)
    const currentRecord = records.at(-1) as TaskAssignmentContractSnapshotRecord
    if (head.acknowledgement_state !== currentRecord.acknowledgementState) {
      throw new InvariantViolationException(
        'Assignment Contract head acknowledgement state does not match its immutable facts'
      )
    }
    return records
  }
}
