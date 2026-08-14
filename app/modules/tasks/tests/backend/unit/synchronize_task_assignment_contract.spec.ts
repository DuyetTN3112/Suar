import { test } from '@japa/runner'

import {
  synchronizeTaskAssignmentContract,
  synchronizeTaskAssignmentContractForTask,
  type SynchronizeTaskAssignmentContractDependencies,
} from '#modules/tasks/actions/commands/internal/synchronize_task_assignment_contract'
import type {
  TaskAssignmentContractRepository,
  TaskAssignmentContractSnapshotRecord,
} from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskAssignmentRecord } from '#modules/tasks/actions/ports/outbound/task_assignment_repository'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { CurrentTaskAuthoringBundle } from '#modules/tasks/actions/ports/outbound/task_resolved_brief_reader'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { CanonicalTaskAssignmentContractSnapshotV1 } from '#modules/tasks/domain/task-assignment/task_assignment_contract_snapshot'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'
import {
  TASK_CONTRACT_VERSION_V1_FIXTURE,
  TASK_SPECIFICATION_VERSION_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import type { TaskRecord } from '#modules/tasks/types/task_records'
import type { MetadataAssignmentProvider } from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'

const transaction: TaskTransaction = {}
const assignment: TaskAssignmentRecord = {
  id: '20000000-0000-4000-8000-000000000001',
  task_id: TASK_CONTRACT_VERSION_V1_FIXTURE.taskId,
  assignee_id: '20000000-0000-4000-8000-000000000002',
  assigned_by: TASK_CONTRACT_VERSION_V1_FIXTURE.creatorConfirmedBy,
  assigned_at: '2026-08-01T10:00:00.000Z',
  assignment_status: 'active',
}
const workFieldProvenance = {
  action: {
    source: 'task' as const,
    sourceVersionId: TASK_SPECIFICATION_VERSION_V1_FIXTURE.id,
    inherited: false,
    privacyClassification: 'internal' as const,
  },
}

function bundle(
  contract: CurrentTaskAuthoringBundle['contract'] = TASK_CONTRACT_VERSION_V1_FIXTURE
): CurrentTaskAuthoringBundle {
  return {
    headRevision: contract?.versionNumber ?? 1,
    specification: TASK_SPECIFICATION_VERSION_V1_FIXTURE,
    contract,
    workFieldProvenance,
    supportingReferences: [],
    readiness: TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract.readiness,
    readinessFindingCodesResolved: [],
  }
}

function record(
  envelope: CanonicalTaskAssignmentContractSnapshotV1,
  sequence: number,
  acknowledgementState: TaskAssignmentContractSnapshotRecord['acknowledgementState']
): TaskAssignmentContractSnapshotRecord {
  return {
    id: envelope.snapshot.id,
    assignmentId: assignment.id,
    taskId: assignment.task_id,
    sequence,
    previousSnapshotId: sequence === 1 ? null : 'previous-snapshot',
    envelope,
    snapshotHash: envelope.snapshot.snapshotHash,
    acknowledgementRequired: envelope.snapshot.acknowledgementRequired,
    acknowledgementState,
    idempotencyKey: `snapshot-${sequence}`,
    replayed: false,
  }
}

function harness(harnessInput: {
  authoringBundle?: CurrentTaskAuthoringBundle | null
  current?: TaskAssignmentContractSnapshotRecord | null
  metadataAssignmentProvider?: MetadataAssignmentProvider
}) {
  const persisted: CanonicalTaskAssignmentContractSnapshotV1[] = []
  const repository: TaskAssignmentContractRepository = {
    findCurrent: () => Promise.resolve(harnessInput.current ?? null),
    findHistory: () => Promise.resolve([]),
    persistSnapshot: (value) => {
      persisted.push(value.envelope)
      return Promise.resolve(
        record(
          value.envelope,
          value.expectedHeadRevision + 1,
          value.envelope.snapshot.acknowledgementRequired ? 'pending' : 'acknowledged'
        )
      )
    },
    findAcknowledgementReplay: () => Promise.resolve(null),
    findClarificationReplay: () => Promise.resolve(null),
    lockInteractionContext: () => Promise.resolve(null),
    persistAcknowledgement: () => Promise.reject(new Error('Not used by coordinator test')),
    persistClarification: () => Promise.reject(new Error('Not used by coordinator test')),
  }
  const dependencies: SynchronizeTaskAssignmentContractDependencies = {
    resolvedBriefReader: {
      readCurrentBundle: () => Promise.resolve(harnessInput.authoringBundle ?? null),
    },
    repository,
    hasher: new NodeTaskContractContentHasher(),
    identityFactory: { nextId: () => '20000000-0000-4000-8000-000000000003' },
    clock: { nowIso: () => '2026-08-01T11:00:00.000Z' },
    ...(harnessInput.metadataAssignmentProvider
      ? { metadataAssignmentProvider: harnessInput.metadataAssignmentProvider }
      : {}),
  }
  return { dependencies, persisted }
}

function firstPersisted(values: CanonicalTaskAssignmentContractSnapshotV1[]) {
  const value = values[0]
  if (!value) throw new Error('Expected a persisted assignment Contract snapshot')
  return value
}

function input(workLifecycle: 'assigned' | 'in_progress' | 'review' | 'dispute' = 'assigned') {
  return {
    assignment,
    organizationId: '20000000-0000-4000-8000-000000000004',
    projectId: '20000000-0000-4000-8000-000000000005',
    workLifecycle,
  } as const
}

function materialSuccessorContract() {
  return {
    ...TASK_CONTRACT_VERSION_V1_FIXTURE,
    id: '20000000-0000-4000-8000-000000000008',
    versionNumber: 2,
    resolvedContract: {
      ...TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract,
      versionId: '20000000-0000-4000-8000-000000000008',
      work: {
        ...TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract.work,
        deliverables: [
          {
            id: '20000000-0000-4000-8000-000000000010',
            title: 'Production implementation',
            description: 'A materially different production implementation.',
            expectedFormat: 'source_code',
            expectedLocation: 'repository',
          },
        ],
      },
    },
  }
}

const task: TaskRecord = {
  id: assignment.task_id,
  title: 'Governed task',
  description: 'Task used to exercise assignment Contract synchronization.',
  organization_id: '20000000-0000-4000-8000-000000000004',
  project_id: '20000000-0000-4000-8000-000000000005',
  status: 'in_progress',
  task_status_id: null,
  priority: 'medium',
  assigned_to: assignment.assignee_id,
  creator_id: assignment.assigned_by,
}

function externalDependencies(
  dependencies: SynchronizeTaskAssignmentContractDependencies,
  lifecycle: 'review' | 'dispute' | null = null
): TaskExternalDependencies {
  return {
    resolvedBrief: dependencies.resolvedBriefReader,
    assignmentContract: {
      repository: dependencies.repository,
      hasher: dependencies.hasher,
      identityFactory: dependencies.identityFactory,
      clock: dependencies.clock,
    },
    review: {
      getTaskAssignmentContractLifecycle: () => Promise.resolve(lifecycle),
    },
  } as unknown as TaskExternalDependencies
}

test.group('Synchronize assignment canonical Contract', () => {
  test('keeps an explicit legacy state when no versioned authoring bundle exists', async ({
    assert,
  }) => {
    const { dependencies, persisted } = harness({ authoringBundle: null })
    const result = await synchronizeTaskAssignmentContract(input(), transaction, dependencies)

    assert.equal(result.state, 'legacy_unversioned')
    assert.lengthOf(persisted, 0)
  })

  test('blocks assignment when the V2 authoring head is still Draft', async ({ assert }) => {
    const { dependencies } = harness({ authoringBundle: bundle(null) })
    await assert.rejects(
      () => synchronizeTaskAssignmentContract(input(), transaction, dependencies),
      'TVA.ASSIGNMENT.WORK_NOT_READY'
    )
  })

  test('persists a self-contained fresh snapshot and requires initial acknowledgement', async ({
    assert,
  }) => {
    const { dependencies, persisted } = harness({ authoringBundle: bundle() })
    const result = await synchronizeTaskAssignmentContract(input(), transaction, dependencies)

    assert.equal(result.state, 'persisted')
    assert.equal(
      persisted[0]?.snapshot.provenance.taskContractVersionId,
      TASK_CONTRACT_VERSION_V1_FIXTURE.id
    )
    assert.equal(persisted[0]?.acknowledgementBasis.kind, 'fresh_assignment')
    assert.deepEqual(persisted[0]?.changeDecision, {
      classifierVersion: 'suar.task_contract_change_classifier.v1',
      policyVersion: 'suar.task_contract_change_policy.v1',
      changeClass: 'initial',
      code: 'TVA.CHANGE.INITIAL',
      codes: ['TVA.CHANGE.INITIAL'],
      changedPaths: [],
      requiresReack: true,
    })
    assert.isTrue(persisted[0]?.snapshot.acknowledgementRequired)
  })

  test('pins canonical task metadata before the assignment snapshot is persisted', async ({
    assert,
  }) => {
    let requestedNamespaces: readonly string[] | undefined
    const metadataAssignmentProvider: MetadataAssignmentProvider = {
      getAssignments: (query) => {
        requestedNamespaces = query.namespaces
        return Promise.resolve({
          assignments: [
            {
              resource: 'task',
              entityId: assignment.task_id,
              term: { namespace: 'skills', termId: 'skill-typescript' },
              provenance: 'explicit' as const,
              reviewState: 'reviewed' as const,
              sourceType: 'task_required_skill',
              taxonomyVersion: 7,
            },
          ],
          freeFormTags: [],
          taxonomyVersions: { skills: 7 },
          diagnostics: [],
          completeness: [],
          providerVersions: {
            assignmentSchemaVersion: 1,
            sourceRevisions: { [assignment.task_id]: 'sha256:task-source' },
            enrichmentVersions: {},
          },
        })
      },
    }
    const { dependencies, persisted } = harness({
      authoringBundle: bundle(),
      metadataAssignmentProvider,
    })

    await synchronizeTaskAssignmentContract(input(), transaction, dependencies)

    assert.equal(
      persisted[0]?.snapshot.taxonomyMetadata?.assignments[0]?.term.termId,
      'skill-typescript'
    )
    assert.equal(persisted[0]?.snapshot.taxonomyMetadata?.sourceRevision, 'sha256:task-source')
    assert.deepEqual(requestedNamespaces, ['skills'])
  })

  test('pins readiness findings resolved before the current authoring assessment', async ({
    assert,
  }) => {
    const authoringBundle = {
      ...bundle(),
      readinessFindingCodesResolved: ['TVA.EVIDENCE.MAPPING_MISSING', 'TVA.WORK.SCOPE_MISSING'],
    }
    const { dependencies, persisted } = harness({ authoringBundle })

    await synchronizeTaskAssignmentContract(input(), transaction, dependencies)

    assert.deepEqual(persisted[0]?.snapshot.readinessFindingCodesResolved, [
      'TVA.EVIDENCE.MAPPING_MISSING',
      'TVA.WORK.SCOPE_MISSING',
    ])
  })

  test('returns the existing immutable head when the exact Contract is already pinned', async ({
    assert,
  }) => {
    const firstHarness = harness({ authoringBundle: bundle() })
    await synchronizeTaskAssignmentContract(input(), transaction, firstHarness.dependencies)
    const current = record(firstPersisted(firstHarness.persisted), 1, 'pending')
    const { dependencies, persisted } = harness({ authoringBundle: bundle(), current })

    const result = await synchronizeTaskAssignmentContract(input(), transaction, dependencies)
    assert.equal(result.state, 'current')
    assert.lengthOf(persisted, 0)
  })

  test('material successor creates a re-acknowledgement basis', async ({ assert }) => {
    const firstHarness = harness({ authoringBundle: bundle() })
    await synchronizeTaskAssignmentContract(input(), transaction, firstHarness.dependencies)
    const current = record(firstPersisted(firstHarness.persisted), 1, 'acknowledged')
    const nextContract = {
      ...TASK_CONTRACT_VERSION_V1_FIXTURE,
      id: '20000000-0000-4000-8000-000000000006',
      versionNumber: 2,
      resolvedContract: {
        ...TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract,
        versionId: '20000000-0000-4000-8000-000000000006',
        work: {
          ...TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract.work,
          scope: [
            ...TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract.work.scope,
            {
              id: '20000000-0000-4000-8000-000000000009',
              title: 'Implement API',
              description: 'Add production implementation scope to the design-only Contract.',
            },
          ],
        },
      },
    }
    const { dependencies, persisted } = harness({ authoringBundle: bundle(nextContract), current })

    await synchronizeTaskAssignmentContract(input('in_progress'), transaction, dependencies)
    assert.equal(persisted[0]?.acknowledgementBasis.kind, 'reacknowledgement_required')
    assert.equal(persisted[0]?.changeDecision.changeClass, 'material_scope')
    assert.equal(persisted[0]?.changeDecision.code, 'TVA.CHANGE.MATERIAL_SCOPE')
    assert.isTrue(persisted[0]?.changeDecision.changedPaths.includes('work.scope.length'))
    assert.isTrue(persisted[0]?.changeDecision.requiresReack)
    assert.isTrue(persisted[0]?.snapshot.acknowledgementRequired)
  })

  test('editorial successor carries an acknowledged predecessor without forging a new fact', async ({
    assert,
  }) => {
    const firstHarness = harness({ authoringBundle: bundle() })
    await synchronizeTaskAssignmentContract(input(), transaction, firstHarness.dependencies)
    const current = record(firstPersisted(firstHarness.persisted), 1, 'acknowledged')
    const nextContract = {
      ...TASK_CONTRACT_VERSION_V1_FIXTURE,
      id: '20000000-0000-4000-8000-000000000007',
      versionNumber: 2,
      resolvedContract: {
        ...TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract,
        versionId: '20000000-0000-4000-8000-000000000007',
        specification: {
          ...TASK_CONTRACT_VERSION_V1_FIXTURE.resolvedContract.specification,
          richContent: { type: 'doc', content: [{ type: 'paragraph' }] },
        },
      },
    }
    const { dependencies, persisted } = harness({ authoringBundle: bundle(nextContract), current })

    await synchronizeTaskAssignmentContract(input('in_progress'), transaction, dependencies)
    assert.equal(persisted[0]?.acknowledgementBasis.kind, 'acknowledgement_carried_forward')
    assert.isFalse(persisted[0]?.snapshot.acknowledgementRequired)
  })

  test('material change during review requires a governed successor cycle', async ({ assert }) => {
    const firstHarness = harness({ authoringBundle: bundle() })
    await synchronizeTaskAssignmentContract(input(), transaction, firstHarness.dependencies)
    const current = record(firstPersisted(firstHarness.persisted), 1, 'acknowledged')
    const nextContract = materialSuccessorContract()
    const { dependencies } = harness({ authoringBundle: bundle(nextContract), current })

    await assert.rejects(
      () => synchronizeTaskAssignmentContract(input('review'), transaction, dependencies),
      'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED'
    )
  })

  test('uses the production review lifecycle reader to block a material successor during dispute', async ({
    assert,
  }) => {
    const firstHarness = harness({ authoringBundle: bundle() })
    await synchronizeTaskAssignmentContract(input(), transaction, firstHarness.dependencies)
    const current = record(firstPersisted(firstHarness.persisted), 1, 'acknowledged')
    const nextHarness = harness({
      authoringBundle: bundle(materialSuccessorContract()),
      current,
    })

    await assert.rejects(
      () =>
        synchronizeTaskAssignmentContractForTask(
          assignment,
          task,
          transaction,
          externalDependencies(nextHarness.dependencies, 'dispute')
        ),
      'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED'
    )
    assert.lengthOf(nextHarness.persisted, 0)
  })

  test('fails closed when governed versioning dependencies are both absent', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        synchronizeTaskAssignmentContractForTask(
          assignment,
          task,
          transaction,
          { review: {} } as unknown as TaskExternalDependencies
        ),
      'task_assignment_contract dependency failed during synchronize_assignment_contract'
    )
  })

  test('fails closed when only one assignment Contract dependency is configured', async ({
    assert,
  }) => {
    const configured = harness({ authoringBundle: bundle() }).dependencies
    const withCoordinatorOnly = externalDependencies(configured)
    delete withCoordinatorOnly.resolvedBrief
    const withReaderOnly = externalDependencies(configured)
    delete withReaderOnly.assignmentContract

    await assert.rejects(
      () =>
        synchronizeTaskAssignmentContractForTask(
          assignment,
          task,
          transaction,
          withCoordinatorOnly
        ),
      'task_resolved_brief_reader dependency failed during synchronize_assignment_contract'
    )
    await assert.rejects(
      () =>
        synchronizeTaskAssignmentContractForTask(
          assignment,
          task,
          transaction,
          withReaderOnly
        ),
      'task_assignment_contract dependency failed during synchronize_assignment_contract'
    )
  })

  test('fails closed when governed synchronization has no lifecycle reader', async ({ assert }) => {
    const configured = harness({ authoringBundle: bundle() }).dependencies
    const dependencies = externalDependencies(configured)
    Reflect.deleteProperty(dependencies.review, 'getTaskAssignmentContractLifecycle')

    await assert.rejects(
      () =>
        synchronizeTaskAssignmentContractForTask(
          assignment,
          task,
          transaction,
          dependencies
        ),
      'task_review_reader dependency failed during read_assignment_contract_lifecycle'
    )
  })
})
