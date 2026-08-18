import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  RESOLVED_TASK_CONTRACT_V1_FIXTURE,
  TASK_CONTRACT_VERSION_V1_FIXTURE,
  TASK_SPECIFICATION_VERSION_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  TaskContractVersionV1,
  TaskReadinessResultV1,
  TaskSpecificationVersionV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { LucidTaskContractHistoryReader } from '#modules/tasks/infra/adapters/task-assignment/lucid_task_contract_history_reader'
import { LucidTaskResolvedBriefReader } from '#modules/tasks/infra/adapters/task-reading/lucid_task_resolved_brief_reader'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'
import TaskSpecificationContractRepository from '#modules/tasks/infra/repositories/task-authoring/task_specification_contract_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const hash = (character: string): TvaSha256 => `sha256:${character.repeat(64)}`
const hasher = new NodeTaskContractContentHasher()

function bundle(input: {
  taskId: string
  versionNumber: number
  expectedHeadRevision: number | null
  title: string
  readiness?: TaskReadinessResultV1
}) {
  const specificationId = randomUUID()
  const contractId = randomUUID()
  const specificationWithoutHash: TaskSpecificationVersionV1 = {
    ...TASK_SPECIFICATION_VERSION_V1_FIXTURE,
    id: specificationId,
    taskId: input.taskId,
    versionNumber: input.versionNumber,
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
  const readiness = input.readiness ?? RESOLVED_TASK_CONTRACT_V1_FIXTURE.readiness
  const resolvedContractWithoutHash = {
    ...RESOLVED_TASK_CONTRACT_V1_FIXTURE,
    taskId: input.taskId,
    versionId: contractId,
    title: input.title,
    specification: {
      versionId: specificationId,
      richContent: specification.richContent,
      plainText: specification.plainTextProjection,
      sections: specification.sectionIndex,
    },
    inheritedFrom: {
      projectContextVersionId: specification.projectContextVersionId,
      workPackageVersionId: specification.workPackageVersionId,
    },
    readiness,
  }
  const resolvedContract = {
    ...resolvedContractWithoutHash,
    resolvedContentHash: hasher.hash({
      schemaVersion: resolvedContractWithoutHash.schemaVersion,
      taskId: resolvedContractWithoutHash.taskId,
      versionId: resolvedContractWithoutHash.versionId,
      title: resolvedContractWithoutHash.title,
      specification: resolvedContractWithoutHash.specification,
      work: resolvedContractWithoutHash.work,
      evidence: resolvedContractWithoutHash.evidence,
      supportingReferences: resolvedContractWithoutHash.supportingReferences,
      inheritedFrom: resolvedContractWithoutHash.inheritedFrom,
      readiness: resolvedContractWithoutHash.readiness,
    }),
  }
  const contractWithoutHash: TaskContractVersionV1 = {
    ...TASK_CONTRACT_VERSION_V1_FIXTURE,
    id: contractId,
    taskId: input.taskId,
    taskSpecificationVersionId: specificationId,
    versionNumber: input.versionNumber,
    resolvedContract,
    readinessState: readiness.workState,
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
    readinessAudit: {
      assessmentInput: { taskId: input.taskId, version: input.versionNumber },
      inputHash: hash('1'),
      resultHash: hash('2'),
      result: readiness,
    },
    expectedHeadRevision: input.expectedHeadRevision,
  }
}

function finding(code: string, severity: 'blocker' | 'warning') {
  return {
    code,
    severity,
    fieldPath: `/readiness/${code.toLowerCase()}`,
    sourcePath: null,
    message: code,
    remediationHint: `Resolve ${code}`,
  }
}

async function insertHistoricalReadinessAssessment(input: {
  readonly taskId: string
  readonly specificationVersionId: string
  readonly contractVersionId: string
  readonly blockers?: readonly string[]
  readonly warnings?: readonly string[]
  readonly assessedAt?: string
}) {
  const blockers = (input.blockers ?? []).map((code) => finding(code, 'blocker'))
  const warnings = (input.warnings ?? []).map((code) => finding(code, 'warning'))
  await db.table('task_readiness_assessments').insert({
    id: randomUUID(),
    task_id: input.taskId,
    task_specification_version_id: input.specificationVersionId,
    task_contract_version_id: input.contractVersionId,
    policy_version: 'tva-readiness-v1',
    assessment_input: JSON.stringify({ history: 'immutable', at: 'before-current' }),
    input_hash: hash('a'),
    work_state: 'needs_clarification',
    evidence_state: 'needs_clarification',
    assignment_ready: false,
    evidence_ready: false,
    blockers: JSON.stringify(blockers),
    warnings: JSON.stringify(warnings),
    result_hash: hash('b'),
    assessed_at: input.assessedAt ?? '2026-07-31T08:00:00.000Z',
  })
}

test.group('Integration | Task Contract historical reconstruction', (group) => {
  const taskIds: string[] = []
  const reader = new LucidTaskContractHistoryReader()
  const currentReader = new LucidTaskResolvedBriefReader()

  group.setup(async () => {
    await setupApp()
  })
  group.each.teardown(async () => {
    for (const table of [
      'task_authoring_heads',
      'task_readiness_assessments',
      'task_evidence_requirements',
      'task_supporting_references',
      'task_contract_versions',
      'task_specification_versions',
    ]) {
      await db.from(table).whereIn('task_id', taskIds).delete()
    }
    taskIds.length = 0
  })
  group.teardown(async () => teardownApp())

  test('reconstructs a pinned historical bundle after the authoring head advances', async ({
    assert,
  }) => {
    const taskId = randomUUID()
    taskIds.push(taskId)
    const v1 = bundle({
      taskId,
      versionNumber: 1,
      expectedHeadRevision: null,
      title: 'Original pinned API contract',
    })
    const v2 = bundle({
      taskId,
      versionNumber: 2,
      expectedHeadRevision: 1,
      title: 'Corrected current API contract',
    })
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(v1, trx)
    )
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(v2, trx)
    )

    const historical = await reader.readHistoricalBundle({
      taskId,
      specificationVersionId: v1.specification.id,
      contractVersionId: v1.contract.id,
    })
    const current = await TaskSpecificationContractRepository.findCurrent(taskId)
    const currentBrief = await currentReader.readCurrentBundle(taskId)

    assert.equal(current?.contract?.id, v2.contract.id)
    assert.equal(currentBrief?.headRevision, 2)
    assert.equal(currentBrief?.contract?.id, v2.contract.id)
    assert.equal(currentBrief?.specification.id, v2.specification.id)
    assert.notProperty(currentBrief?.readiness ?? {}, 'resultHash')
    assert.equal(historical?.contract.id, v1.contract.id)
    assert.equal(historical?.contract.resolvedContract.title, 'Original pinned API contract')
    assert.equal(historical?.specification.id, v1.specification.id)
    assert.equal(historical?.specification.contentHash, v1.specification.contentHash)
  })

  test('derives immutable readiness findings resolved before the current assignment-ready head', async ({
    assert,
  }) => {
    const taskId = randomUUID()
    taskIds.push(taskId)
    const current = bundle({
      taskId,
      versionNumber: 1,
      expectedHeadRevision: null,
      title: 'Assignment-ready API contract',
    })
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(current, trx)
    )
    await insertHistoricalReadinessAssessment({
      taskId,
      specificationVersionId: current.specification.id,
      contractVersionId: current.contract.id,
      blockers: ['TVA.WORK.SCOPE_MISSING'],
      warnings: ['TVA.EVIDENCE.MAPPING_MISSING', 'TVA.WORK.SCOPE_MISSING'],
    })

    const resolvedBrief = await currentReader.readCurrentBundle(taskId)

    assert.deepEqual(resolvedBrief?.readinessFindingCodesResolved, [
      'TVA.EVIDENCE.MAPPING_MISSING',
      'TVA.WORK.SCOPE_MISSING',
    ])
  })

  test('does not label a finding still active in the current assessment as resolved', async ({
    assert,
  }) => {
    const taskId = randomUUID()
    taskIds.push(taskId)
    const activeCode = 'TVA.WORK.SCOPE_MISSING'
    const current = bundle({
      taskId,
      versionNumber: 1,
      expectedHeadRevision: null,
      title: 'Contract with an active readiness warning',
      readiness: {
        ...RESOLVED_TASK_CONTRACT_V1_FIXTURE.readiness,
        warnings: [finding(activeCode, 'warning')],
      },
    })
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(current, trx)
    )
    await insertHistoricalReadinessAssessment({
      taskId,
      specificationVersionId: current.specification.id,
      contractVersionId: current.contract.id,
      blockers: [activeCode],
    })

    const resolvedBrief = await currentReader.readCurrentBundle(taskId)

    assert.deepEqual(resolvedBrief?.readinessFindingCodesResolved, [])
  })

  test('excludes an immutable assessment recorded after the current head assessment', async ({
    assert,
  }) => {
    const taskId = randomUUID()
    taskIds.push(taskId)
    const v1 = bundle({
      taskId,
      versionNumber: 1,
      expectedHeadRevision: null,
      title: 'First authoring version',
    })
    const v2 = bundle({
      taskId,
      versionNumber: 2,
      expectedHeadRevision: 1,
      title: 'Current assignment-ready version',
    })
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(v1, trx)
    )
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(v2, trx)
    )
    await insertHistoricalReadinessAssessment({
      taskId,
      specificationVersionId: v1.specification.id,
      contractVersionId: v1.contract.id,
      blockers: ['TVA.SHOULD_NOT_APPEAR_FROM_THE_FUTURE'],
      assessedAt: '2026-08-02T08:00:00.000Z',
    })

    const resolvedBrief = await currentReader.readCurrentBundle(taskId)

    assert.equal(resolvedBrief?.contract?.id, v2.contract.id)
    assert.deepEqual(resolvedBrief?.readinessFindingCodesResolved, [])
  })

  test('fails closed for a cross-task or mismatched specification/contract pair', async ({
    assert,
  }) => {
    const missing = await reader.readHistoricalBundle({
      taskId: randomUUID(),
      specificationVersionId: randomUUID(),
      contractVersionId: randomUUID(),
    })
    assert.isNull(missing)
  })

  test('rejects persisted resolved JSON whose immutable content no longer matches its hash', async ({
    assert,
  }) => {
    const taskId = randomUUID()
    taskIds.push(taskId)
    const persisted = bundle({
      taskId,
      versionNumber: 1,
      expectedHeadRevision: null,
      title: 'Integrity protected contract',
    })
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(persisted, trx)
    )
    await db
      .from('task_contract_versions')
      .where('id', persisted.contract.id)
      .update({
        resolved_contract: JSON.stringify({
          ...persisted.contract.resolvedContract,
          title: 'Tampered without successor version',
        }),
      })

    let thrown: unknown
    try {
      await currentReader.readCurrentBundle(taskId)
    } catch (error) {
      thrown = error
    }

    assert.instanceOf(thrown, InvariantViolationException)
  })

  test('rejects an unknown nested resolved Contract schema version', async ({ assert }) => {
    const taskId = randomUUID()
    taskIds.push(taskId)
    const persisted = bundle({
      taskId,
      versionNumber: 1,
      expectedHeadRevision: null,
      title: 'Known schema contract',
    })
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(persisted, trx)
    )
    await db
      .from('task_contract_versions')
      .where('id', persisted.contract.id)
      .update({
        resolved_contract: JSON.stringify({
          ...persisted.contract.resolvedContract,
          schemaVersion: 'suar.resolved_task_contract.v99',
        }),
      })

    let thrown: unknown
    try {
      await reader.readHistoricalBundle({
        taskId,
        specificationVersionId: persisted.specification.id,
        contractVersionId: persisted.contract.id,
      })
    } catch (error) {
      thrown = error
    }

    assert.instanceOf(thrown, InvariantViolationException)
  })
})
