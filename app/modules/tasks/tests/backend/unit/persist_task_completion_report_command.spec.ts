import crypto from 'node:crypto'

import { test } from '@japa/runner'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import {
  CompletionReportSubmissionBlockedError,
  SaveTaskCompletionReportDraftCommand,
  SubmitTaskCompletionReportCommand,
  type PersistTaskCompletionReportInput,
  type TaskCompletionReportCommandDependencies,
} from '#modules/tasks/actions/commands/task-submissions/persist_task_completion_report_command'
import type { TaskAssignmentContractRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type {
  PersistedTaskCompletionReport,
  TaskCompletionReportRepository,
  TaskCompletionReportWrite,
} from '#modules/tasks/actions/ports/outbound/task_completion_report_repository'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { TASK_COMPLETION_REPORT_CODES } from '#modules/tasks/domain/task-submissions/task_completion_report_rules'
import { NodeTaskCompletionReportIdGenerator } from '#modules/tasks/infra/adapters/task-submissions/node_task_completion_report_id_generator'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'
import { TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE } from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'

const snapshot = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE
const hash = (character: string) => `sha256:${character.repeat(64)}` as const

function incompleteDraft(
  snapshotId: string = snapshot.id,
  snapshotHash: `sha256:${string}` = snapshot.snapshotHash
): PersistTaskCompletionReportInput {
  return {
    taskSubmissionId: '30000000-0000-4000-8000-000000000001',
    expectedRevision: 0,
    idempotencyKey: `completion:${crypto.randomUUID()}`,
    report: {
      id: crypto.randomUUID(),
      taskId: snapshot.taskId,
      taskAssignmentId: snapshot.assignmentId,
      assignmentSnapshotId: snapshotId,
      assignmentSnapshotHash: snapshotHash,
      taskContractVersionId: snapshot.provenance.taskContractVersionId,
      reportedBy: snapshot.assigneeId,
      workPerformed: '',
      contributionStatement: '',
      actualRole: '',
      actualOwnership: null,
      actualAutonomy: null,
      actualDeliverableIds: [],
      actualOutcomes: {},
      impactObserved: {},
      limitations: null,
      remainingWork: null,
      criterionResults: [],
      evidence: [],
      contributorClaims: [],
    },
    evidenceManifest: [],
  }
}

function record(
  input: PersistTaskCompletionReportInput,
  status: 'draft' | 'submitted' = 'draft'
): PersistedTaskCompletionReport {
  return {
    id: input.report.id,
    taskSubmissionId: input.taskSubmissionId,
    taskId: input.report.taskId,
    taskAssignmentId: input.report.taskAssignmentId,
    assignmentSnapshotId: input.report.assignmentSnapshotId,
    assignmentSnapshotHash: input.report.assignmentSnapshotHash,
    taskContractVersionId: input.report.taskContractVersionId,
    reportedBy: input.report.reportedBy,
    revision: status === 'submitted' ? 1 : 1,
    idempotencyKey: input.idempotencyKey,
    status,
    completionReportHash: hash('f'),
    canonicalPayload: {},
    reportedAt: null,
  }
}

function dependencies(input: {
  readonly history: readonly unknown[]
  readonly latest?: PersistedTaskCompletionReport | null
  readonly replay?: PersistedTaskCompletionReport | null
  readonly onInsert?: (write: TaskCompletionReportWrite) => void
  readonly parentStatus?: 'draft' | 'submitted' | 'accepted_for_review' | 'needs_changes' | 'locked'
}): TaskCompletionReportCommandDependencies {
  const repository = {
    lockSubmissionParent: () =>
      Promise.resolve({
        id: '30000000-0000-4000-8000-000000000001',
        taskId: snapshot.taskId,
        taskAssignmentId: snapshot.assignmentId,
        submittedBy: snapshot.assigneeId,
        status: input.parentStatus ?? ('draft' as const),
      }),
    findBySubmissionIdempotency: () => Promise.resolve(input.replay ?? null),
    findLatestBySubmission: () => Promise.resolve(input.latest ?? null),
    findById: () => Promise.resolve(null),
    insertRevision: (write: TaskCompletionReportWrite) => {
      input.onInsert?.(write)
      const reportInput = incompleteDraft(
        String(write.report['assignment_snapshot_id']),
        String(write.report['assignment_snapshot_hash']) as `sha256:${string}`
      )
      return Promise.resolve({
        ...record(reportInput),
        id: String(write.report['id']),
        revision: Number(write.report['revision']),
        status: write.report['report_status'] as 'draft',
        canonicalPayload: JSON.parse(String(write.report['canonical_payload'])) as Record<
          string,
          unknown
        >,
      })
    },
  } as unknown as TaskCompletionReportRepository
  const assignmentContracts = {
    findHistory: () => Promise.resolve(input.history),
    findCurrent: () =>
      Promise.reject(
        new Error('Completion Report must never substitute the current snapshot head')
      ),
  } as unknown as TaskAssignmentContractRepository
  return {
    repository,
    assignmentContracts,
    transactions: { run: async (work) => work({}) },
    hasher: new NodeTaskContractContentHasher(),
    idGenerator: new NodeTaskCompletionReportIdGenerator(),
  }
}

test.group('Persist Task Completion Report command', () => {
  test('keeps an older explicitly pinned snapshot after the assignment head advances', async ({
    assert,
  }) => {
    const historical = {
      id: snapshot.id,
      assignmentId: snapshot.assignmentId,
      taskId: snapshot.taskId,
      sequence: 1,
      previousSnapshotId: null,
      envelope: {
        schemaVersion: 'suar.task_assignment_contract_snapshot.v1' as const,
        snapshot,
        workFieldProvenance: {},
        acknowledgementBasis: {
          kind: 'fresh_assignment' as const,
          previousSnapshotId: null,
          previousAcknowledgementState: null,
          changeClass: 'initial' as const,
        },
      },
      snapshotHash: snapshot.snapshotHash,
      acknowledgementRequired: true,
      acknowledgementState: 'pending' as const,
      idempotencyKey: 'v1',
      replayed: false,
    }
    const successorSnapshot = { ...snapshot, id: crypto.randomUUID(), snapshotHash: hash('e') }
    const successor = {
      ...historical,
      id: successorSnapshot.id,
      sequence: 2,
      previousSnapshotId: historical.id,
      envelope: { ...historical.envelope, snapshot: successorSnapshot },
      snapshotHash: successorSnapshot.snapshotHash,
      idempotencyKey: 'v2',
    }
    let persistedSnapshotId: unknown = null
    const input = incompleteDraft()

    const result = await new SaveTaskCompletionReportDraftCommand(
      makeSystemTaskActionContext(input.report.reportedBy),
      dependencies({
        history: [historical, successor],
        onInsert: (write) => {
          persistedSnapshotId = write.report['assignment_snapshot_id']
        },
      })
    ).execute(input)

    assert.equal(result.status, 'draft')
    assert.equal(persistedSnapshotId, snapshot.id)
  })

  test('persists every Evidence Contract target on each evidence manifest row', async ({
    assert,
  }) => {
    const firstDeliverable = snapshot.resolvedContract.work.deliverables[0]
    const firstEvidenceRequirement = snapshot.resolvedContract.evidence.requirements[0]
    const deliverables = [firstDeliverable.id, crypto.randomUUID()]
    const evidenceRequirements = [firstEvidenceRequirement.id, crypto.randomUUID()]
    const assignmentSnapshot = {
      ...snapshot,
      resolvedContract: {
        ...snapshot.resolvedContract,
        work: {
          ...snapshot.resolvedContract.work,
          deliverables: [
            ...snapshot.resolvedContract.work.deliverables,
            { ...firstDeliverable, id: deliverables[1] },
          ],
        },
        evidence: {
          ...snapshot.resolvedContract.evidence,
          requirements: [
            ...snapshot.resolvedContract.evidence.requirements,
            {
              ...firstEvidenceRequirement,
              id: evidenceRequirements[1],
              deliverableIds: deliverables,
            },
          ],
        },
      },
    }
    const input = incompleteDraft()
    const evidenceId = crypto.randomUUID()
    const criterion = snapshot.resolvedContract.work.acceptanceCriteria[0]
    const criterionResultId = crypto.randomUUID()
    input.report = {
      ...input.report,
      workPerformed: 'Implemented and verified the contract targets.',
      contributionStatement: 'Owned the implementation and verification.',
      actualRole: 'Backend engineer',
      actualOwnership: 'primary_owner',
      actualAutonomy: 'independent',
      actualDeliverableIds: deliverables,
      actualOutcomes: { verified: true },
      impactObserved: { integration: 'passed' },
      criterionResults: [
        {
          id: criterionResultId,
          criterionId: criterion.id,
          expectedOutcome: criterion.statement,
          actualOutcome: 'The contract target mappings are persisted.',
          result: 'met',
          explanation: 'The implementation stores all normalized target IDs.',
          evidenceIds: [evidenceId],
          deviationStatus: 'none',
          deviationSummary: null,
          deviationApprovalRef: null,
          notApplicableReason: null,
          notApplicablePolicyRef: null,
        },
      ],
      evidence: [
        {
          id: evidenceId,
          evidenceRequirementIds: evidenceRequirements,
          criterionIds: [criterion.id],
          deliverableIds: deliverables,
          ownerUserId: input.report.reportedBy,
          contributorUserIds: [input.report.reportedBy],
          reviewerAccessState: 'available',
          availability: 'available',
          privacyClassification: 'internal',
        },
      ],
      contributorClaims: [
        {
          id: crypto.randomUUID(),
          contributorUserId: input.report.reportedBy,
          action: snapshot.resolvedContract.work.action,
          object: snapshot.resolvedContract.work.object,
          actualRole: 'Backend engineer',
          actualOwnership: 'primary_owner',
          contributionStatement: 'Owned the implementation and verification.',
          deliverableIds: deliverables,
          criterionResultIds: [criterionResultId],
          evidenceIds: [evidenceId],
        },
      ],
    }
    input.evidenceManifest = [
      {
        evidenceId,
        evidenceType: 'pull_request',
        title: 'Evidence Contract target preservation',
        description: null,
        uri: 'https://example.test/pull/1',
        storageReference: null,
        versionReference: null,
        contentHash: null,
        capturedAt: null,
      },
    ]
    let persistedEvidence: Record<string, unknown> | undefined

    await new SubmitTaskCompletionReportCommand(
      makeSystemTaskActionContext(input.report.reportedBy),
      dependencies({
        history: [
          {
            id: snapshot.id,
            assignmentId: snapshot.assignmentId,
            taskId: snapshot.taskId,
            snapshotHash: snapshot.snapshotHash,
            envelope: { snapshot: assignmentSnapshot },
            acknowledgementRequired: false,
            acknowledgementState: 'acknowledged',
          },
        ],
        onInsert: (write) => {
          persistedEvidence = write.evidence[0]
        },
      })
    ).execute(input)

    assert.deepEqual(
      JSON.parse(String(persistedEvidence?.['evidence_requirement_ids'])),
      evidenceRequirements
    )
    assert.deepEqual(
      JSON.parse(String(persistedEvidence?.['related_deliverable_ids'])),
      deliverables
    )
    assert.equal(persistedEvidence?.['related_deliverable_id'], deliverables[0])
  })

  test('rejects a late draft after a submitted report instead of downgrading lifecycle', async ({
    assert,
  }) => {
    const input = incompleteDraft()
    const submitted = { ...record(input, 'submitted'), revision: 1 }

    await assert.rejects(
      () =>
        new SaveTaskCompletionReportDraftCommand(
          makeSystemTaskActionContext(input.report.reportedBy),
          dependencies({ history: [], latest: submitted })
        ).execute({ ...input, expectedRevision: 1 }),
      ConflictException
    )
  })

  test('does not write after parent submission has entered a review-or-locked lifecycle state', async ({
    assert,
  }) => {
    const input = incompleteDraft()
    for (const parentStatus of ['submitted', 'accepted_for_review', 'locked'] as const) {
      let writes = 0
      await assert.rejects(
        () =>
          new SaveTaskCompletionReportDraftCommand(
            makeSystemTaskActionContext(input.report.reportedBy),
            dependencies({
              history: [],
              parentStatus,
              onInsert: () => {
                writes += 1
              },
            })
          ).execute(input),
        ConflictException
      )
      assert.equal(writes, 0)
    }
  })

  test('replays an exact committed request after the parent later becomes locked', async ({
    assert,
  }) => {
    const input = incompleteDraft()
    const hasher = new NodeTaskContractContentHasher()
    const replay = {
      ...record(input),
      canonicalPayload: {
        requestHash: hasher.hash({ intent: 'save_draft', input }),
        validationCodes: [],
      },
    }

    const result = await new SaveTaskCompletionReportDraftCommand(
      makeSystemTaskActionContext(input.report.reportedBy),
      dependencies({ history: [], parentStatus: 'locked', replay })
    ).execute(input)

    assert.isTrue(result.replayed)
    assert.equal(result.id, replay.id)
  })

  test('blocks submit until the exact assignment snapshot is acknowledged', async ({ assert }) => {
    const input = incompleteDraft()
    const assignmentSnapshot = {
      id: snapshot.id,
      assignmentId: snapshot.assignmentId,
      taskId: snapshot.taskId,
      sequence: 1,
      previousSnapshotId: null,
      envelope: {
        schemaVersion: 'suar.task_assignment_contract_snapshot.v1' as const,
        snapshot,
        workFieldProvenance: {},
        acknowledgementBasis: {
          kind: 'fresh_assignment' as const,
          previousSnapshotId: null,
          previousAcknowledgementState: null,
          changeClass: 'initial' as const,
        },
      },
      snapshotHash: snapshot.snapshotHash,
      acknowledgementRequired: true,
      acknowledgementState: 'pending' as const,
      idempotencyKey: 'v1',
      replayed: false,
    }
    let writes = 0
    let blockedError: unknown
    try {
      await new SubmitTaskCompletionReportCommand(
        makeSystemTaskActionContext(input.report.reportedBy),
        dependencies({
          history: [assignmentSnapshot],
          onInsert: () => {
            writes += 1
          },
        })
      ).execute(input)
    } catch (error) {
      blockedError = error
    }

    assert.instanceOf(blockedError, CompletionReportSubmissionBlockedError)
    assert.include(
      (blockedError as CompletionReportSubmissionBlockedError).blockerCodes,
      TASK_COMPLETION_REPORT_CODES.assignmentAcknowledgementRequired
    )
    assert.equal(writes, 0)

    blockedError = null
    try {
      await new SubmitTaskCompletionReportCommand(
        makeSystemTaskActionContext(input.report.reportedBy),
        dependencies({
          history: [
            { ...assignmentSnapshot, acknowledgementState: 'clarification_requested' as const },
          ],
        })
      ).execute({ ...input, idempotencyKey: `${input.idempotencyKey}:clarification` })
    } catch (error) {
      blockedError = error
    }
    assert.instanceOf(blockedError, CompletionReportSubmissionBlockedError)
    assert.include(
      (blockedError as CompletionReportSubmissionBlockedError).blockerCodes,
      TASK_COMPLETION_REPORT_CODES.assignmentClarificationUnresolved
    )
  })
})
