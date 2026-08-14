import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  RESOLVED_TASK_CONTRACT_V1_FIXTURE,
  TASK_CONTRACT_VERSION_V1_FIXTURE,
  TASK_EVIDENCE_CONTRACT_V1_FIXTURE,
  TASK_SPECIFICATION_VERSION_V1_FIXTURE,
  TASK_WORK_CONTRACT_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import type {
  TvaJsonObject,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  ResolvedTaskContractV1,
  TaskContractVersionV1,
  TaskEvidenceContractV1,
  TaskReadinessResultV1,
  TaskSpecificationVersionV1,
  TaskSupportingReferenceV1,
  TaskWorkContractV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import TaskContractVersion from '#modules/tasks/infra/models/task-authoring/task_contract_version'
import TaskSpecificationVersion from '#modules/tasks/infra/models/task-authoring/task_specification_version'
import TaskSpecificationContractRepository, {
  type PersistTaskSpecificationContractBundleInput,
  type PersistTaskSpecificationDraftInput,
} from '#modules/tasks/infra/repositories/task-authoring/task_specification_contract_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const AT = '2026-08-01T08:00:00.000Z'
const hash = (character: string): TvaSha256 => `sha256:${character.repeat(64)}`
const taskIds = new Set<string>()

function firstSupportingReference(
  references: readonly TaskSupportingReferenceV1[]
): TaskSupportingReferenceV1 {
  const reference = references[0]
  if (!reference) {
    throw new InvariantViolationException('Test fixture is missing its Supporting Reference')
  }
  return reference
}

function buildConfirmedBundle(
  input: {
    taskId?: string
    specificationVersion?: number
    contractVersion?: number
    projectContextVersionId?: string | null
    workPackageVersionId?: string | null
    expectedHeadRevision?: number | null
  } = {}
): PersistTaskSpecificationContractBundleInput {
  const taskId = input.taskId ?? randomUUID()
  const specificationId = randomUUID()
  const contractId = randomUUID()
  const actorId = randomUUID()
  const projectContextVersionId =
    input.projectContextVersionId === undefined ? randomUUID() : input.projectContextVersionId
  const workPackageVersionId =
    input.workPackageVersionId === undefined ? randomUUID() : input.workPackageVersionId
  taskIds.add(taskId)

  const sourceProvenance = {
    ...TASK_SPECIFICATION_VERSION_V1_FIXTURE.sourceProvenance,
    confirmedBy: actorId,
    confirmedAt: AT,
  }
  const specification: TaskSpecificationVersionV1 = {
    ...TASK_SPECIFICATION_VERSION_V1_FIXTURE,
    id: specificationId,
    taskId,
    versionNumber: input.specificationVersion ?? 1,
    projectContextVersionId,
    workPackageVersionId,
    authorId: actorId,
    sourceProvenance,
  }
  const workContract: TaskWorkContractV1 = TASK_WORK_CONTRACT_V1_FIXTURE
  const evidenceContract: TaskEvidenceContractV1 = TASK_EVIDENCE_CONTRACT_V1_FIXTURE
  const supportingReference: TaskSupportingReferenceV1 = {
    ...RESOLVED_TASK_CONTRACT_V1_FIXTURE.supportingReferences[0],
    id: randomUUID(),
    addedBy: actorId,
  }
  const resolvedContract: ResolvedTaskContractV1 = {
    ...RESOLVED_TASK_CONTRACT_V1_FIXTURE,
    taskId,
    versionId: contractId,
    specification: {
      versionId: specificationId,
      richContent: specification.richContent,
      plainText: specification.plainTextProjection,
      sections: specification.sectionIndex,
    },
    work: workContract,
    evidence: evidenceContract,
    supportingReferences: [supportingReference],
    inheritedFrom: { projectContextVersionId, workPackageVersionId },
  }
  const contract: TaskContractVersionV1 = {
    ...TASK_CONTRACT_VERSION_V1_FIXTURE,
    id: contractId,
    taskId,
    taskSpecificationVersionId: specificationId,
    versionNumber: input.contractVersion ?? input.specificationVersion ?? 1,
    workContract,
    evidenceContract,
    resolvedContract,
    creatorConfirmedBy: actorId,
  }
  const assessmentInput: TvaJsonObject = {
    taskId,
    specificationVersionId: specificationId,
    contractVersionId: contractId,
    localCriticalSectionsPresent: true,
  }

  return {
    specification,
    contract,
    readinessAudit: {
      assessmentInput,
      inputHash: hash('a'),
      resultHash: hash('b'),
      result: resolvedContract.readiness,
    },
    expectedHeadRevision: input.expectedHeadRevision ?? null,
  }
}

function buildLinkOnlyDraft(
  input: {
    taskId?: string
    versionNumber?: number
    expectedHeadRevision?: number | null
    references?: readonly TaskSupportingReferenceV1[]
  } = {}
): PersistTaskSpecificationDraftInput {
  const base = buildConfirmedBundle({
    ...(input.taskId === undefined ? {} : { taskId: input.taskId }),
    ...(input.versionNumber === undefined ? {} : { specificationVersion: input.versionNumber }),
  })
  const reference: TaskSupportingReferenceV1 = {
    ...firstSupportingReference(base.contract.resolvedContract.supportingReferences),
    accessState: 'authenticated' as const,
  }
  const references = input.references ?? [reference]
  const result: TaskReadinessResultV1 = {
    policyVersion: 'tva-readiness-v1',
    workState: 'needs_clarification',
    evidenceState: 'not_configured',
    assignmentReady: false,
    evidenceReady: false,
    blockers: [
      {
        code: 'TVA.SPECIFICATION.LOCAL_CONTENT_REQUIRED',
        severity: 'blocker',
        fieldPath: 'specification.richContent',
        sourcePath: null,
        message: 'Critical execution details must be available inside Suar.',
        remediationHint: 'Add local scope, deliverables, acceptance criteria, and edge cases.',
      },
    ],
    warnings: [
      {
        code: 'TVA.REFERENCE.AUTH_REQUIRED',
        severity: 'warning',
        fieldPath: 'supportingReferences[0].accessState',
        sourcePath: null,
        message: 'The supporting source requires authentication.',
        remediationHint: 'Keep all critical execution details in the local Specification.',
      },
    ],
    assessedAt: AT,
  }
  const specification: TaskSpecificationVersionV1 = {
    ...base.specification,
    confirmationState: 'draft',
    richContent: { type: 'document', sections: [] },
    plainTextProjection: '',
    sectionIndex: [],
    projectContextVersionId: null,
    workPackageVersionId: null,
    sourceProvenance: {
      class: 'native_prework',
      sourceType: 'authored',
      sourceReferenceIds: references.map((item) => item.id),
      confirmedBy: null,
      confirmedAt: null,
    },
  }

  return {
    specification,
    supportingReferences: references,
    readinessAudit: {
      assessmentInput: {
        taskId: specification.taskId,
        specificationVersionId: specification.id,
        localCriticalSectionsPresent: false,
        supportingReferenceCount: references.length,
      },
      inputHash: hash('c'),
      resultHash: hash('d'),
      result,
    },
    expectedHeadRevision: input.expectedHeadRevision ?? null,
  }
}

async function tableExists(tableName: string): Promise<boolean> {
  const row = (await db
    .from('information_schema.tables')
    .select('table_name')
    .where('table_schema', 'public')
    .where('table_name', tableName)
    .first()) as { table_name?: string } | undefined
  return row?.table_name === tableName
}

async function cleanupTaskAuthoringRows(): Promise<void> {
  if (taskIds.size === 0) return
  const ids = [...taskIds]
  for (const tableName of [
    'task_authoring_heads',
    'task_readiness_assessments',
    'task_evidence_requirements',
    'task_supporting_references',
    'task_contract_versions',
    'task_specification_versions',
    'task_requirement_versions',
  ]) {
    if (await tableExists(tableName)) {
      await db.from(tableName).whereIn('task_id', ids).delete()
    }
  }
  taskIds.clear()
}

test.group('Integration | Task Specification and Contract persistence', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTaskAuthoringRows())

  test('round-trips the complete immutable Specification, Work/Evidence Contract, references, pins, resolved payload, confirmation, and readiness audit', async ({
    assert,
  }) => {
    const input = buildConfirmedBundle()
    const persisted = await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(input, trx)
    )
    const current = await TaskSpecificationContractRepository.findCurrent(
      input.specification.taskId
    )

    assert.equal(persisted.head.revision, 1)
    assert.equal(current?.specification.id, input.specification.id)
    assert.deepEqual(current?.specification.rich_content, input.specification.richContent)
    assert.equal(
      current?.specification.project_context_version_id,
      input.specification.projectContextVersionId
    )
    assert.equal(
      current?.specification.work_package_version_id,
      input.specification.workPackageVersionId
    )
    assert.deepEqual(current?.contract?.work_contract, input.contract.workContract)
    assert.deepEqual(current?.contract?.evidence_contract, input.contract.evidenceContract)
    assert.deepEqual(current?.contract?.resolved_contract, input.contract.resolvedContract)
    assert.equal(current?.contract?.creator_confirmed_by, input.contract.creatorConfirmedBy)
    assert.equal(current?.supportingReferences[0]?.access_state, 'authenticated')
    assert.equal(
      current?.evidenceRequirements[0]?.evidence_requirement_id,
      input.contract.evidenceContract.requirements[0]?.id
    )
    assert.deepEqual(
      current?.evidenceRequirements[0]?.criterion_ids,
      input.contract.evidenceContract.requirements[0]?.criterionIds
    )
    assert.equal(current?.latestReadinessAssessment?.assignment_ready, true)
    assert.deepEqual(
      current?.latestReadinessAssessment?.assessment_input,
      input.readinessAudit.assessmentInput
    )
  })

  test('stores a link-only Draft and audited blockers without treating an authenticated doc as local content', async ({
    assert,
  }) => {
    const input = buildLinkOnlyDraft()
    await db.transaction((trx) => TaskSpecificationContractRepository.persistDraft(input, trx))
    const current = await TaskSpecificationContractRepository.findCurrent(
      input.specification.taskId
    )

    assert.equal(current?.specification.confirmation_state, 'draft')
    assert.equal(current?.contract, null)
    assert.equal(current?.supportingReferences.length, 1)
    assert.equal(current?.supportingReferences[0]?.access_state, 'authenticated')
    assert.equal(current?.latestReadinessAssessment?.assignment_ready, false)
    assert.equal(
      current?.latestReadinessAssessment?.blockers[0]?.code,
      'TVA.SPECIFICATION.LOCAL_CONTENT_REQUIRED'
    )
  })

  test('allows the same URL for distinct semantics but rejects an exact duplicate within one version', async ({
    assert,
  }) => {
    const seed = buildLinkOnlyDraft()
    const first = firstSupportingReference(seed.supportingReferences)
    const second: TaskSupportingReferenceV1 = {
      ...first,
      id: randomUUID(),
      relation: 'design_asset',
      relevantSection: 'Sequence diagram',
    }
    const allowed = buildLinkOnlyDraft({ references: [first, second] })
    await db.transaction((trx) => TaskSpecificationContractRepository.persistDraft(allowed, trx))

    const exactDuplicate: TaskSupportingReferenceV1 = { ...first, id: randomUUID() }
    const rejected = buildLinkOnlyDraft({ references: [first, exactDuplicate] })
    await assert.rejects(
      () =>
        db.transaction((trx) => TaskSpecificationContractRepository.persistDraft(rejected, trx)),
      ValidationException
    )

    const allowedRows = await db
      .from('task_supporting_references')
      .where('task_id', allowed.specification.taskId)
    const rejectedRows = await db
      .from('task_specification_versions')
      .where('task_id', rejected.specification.taskId)
    assert.lengthOf(allowedRows, 2)
    assert.lengthOf(rejectedRows, 0)
  })

  test('preserves a legacy skill-only requirement snapshot and returns no fabricated native Contract before companion data exists', async ({
    assert,
  }) => {
    const taskId = randomUUID()
    taskIds.add(taskId)
    const legacyId = randomUUID()
    await db.table('task_requirement_versions').insert({
      id: legacyId,
      task_id: taskId,
      version_number: 1,
      reason: 'task_created',
      created_by: null,
      professional_role_snapshot: JSON.stringify({ source: 'legacy-skill-only' }),
    })

    assert.isNull(await TaskSpecificationContractRepository.findCurrent(taskId))

    const nativeInput = buildConfirmedBundle({ taskId })
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(nativeInput, trx)
    )
    const legacy = (await db.from('task_requirement_versions').where('id', legacyId).first()) as
      | { id: string }
      | undefined
    const current = await TaskSpecificationContractRepository.findCurrent(taskId)
    assert.equal(legacy?.id, legacyId)
    assert.equal(current?.contract?.id, nativeInput.contract.id)
  })

  test('rejects canonical model mutation and records a correction as a new version while allowing equal content hashes', async ({
    assert,
  }) => {
    const v1 = buildConfirmedBundle()
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(v1, trx)
    )

    const persistedSpecification = await TaskSpecificationVersion.findOrFail(v1.specification.id)
    persistedSpecification.plain_text_projection = 'Silently overwritten'
    await assert.rejects(
      () => persistedSpecification.save(),
      /Task Specification versions are immutable/
    )
    const persistedContract = await TaskContractVersion.findOrFail(v1.contract.id)
    persistedContract.readiness_state = 'draft'
    await assert.rejects(() => persistedContract.save(), /Task Contract versions are immutable/)

    const v2 = buildConfirmedBundle({
      taskId: v1.specification.taskId,
      specificationVersion: 2,
      contractVersion: 2,
      expectedHeadRevision: 1,
    })
    assert.equal(v2.specification.contentHash, v1.specification.contentHash)
    assert.equal(v2.contract.contentHash, v1.contract.contentHash)
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(v2, trx)
    )

    const current = await TaskSpecificationContractRepository.findCurrent(v1.specification.taskId)
    const unchangedV1 = await TaskSpecificationVersion.findOrFail(v1.specification.id)
    assert.equal(current?.head.revision, 2)
    assert.equal(current?.specification.id, v2.specification.id)
    assert.equal(unchangedV1.plain_text_projection, v1.specification.plainTextProjection)
  })

  test('uses optimistic head revision so concurrent saves produce one winner and roll the stale version back', async ({
    assert,
  }) => {
    const v1 = buildConfirmedBundle()
    await db.transaction((trx) =>
      TaskSpecificationContractRepository.persistContractBundle(v1, trx)
    )
    const v2 = buildLinkOnlyDraft({
      taskId: v1.specification.taskId,
      versionNumber: 2,
      expectedHeadRevision: 1,
    })
    const v3 = buildLinkOnlyDraft({
      taskId: v1.specification.taskId,
      versionNumber: 3,
      expectedHeadRevision: 1,
    })

    const outcomes = await Promise.allSettled([
      db.transaction((trx) => TaskSpecificationContractRepository.persistDraft(v2, trx)),
      db.transaction((trx) => TaskSpecificationContractRepository.persistDraft(v3, trx)),
    ])
    assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1)
    assert.equal(outcomes.filter((outcome) => outcome.status === 'rejected').length, 1)

    const current = await TaskSpecificationContractRepository.findCurrent(v1.specification.taskId)
    const versions = await db
      .from('task_specification_versions')
      .where('task_id', v1.specification.taskId)
      .orderBy('version_number')
    assert.equal(current?.head.revision, 2)
    assert.lengthOf(versions, 2)
  })

  test('rolls back every companion row and the current pointer when publication fails', async ({
    assert,
  }) => {
    const input = buildConfirmedBundle()
    await assert.rejects(() =>
      db.transaction(async (trx) => {
        await TaskSpecificationContractRepository.persistContractBundle(input, trx)
        throw new InvariantViolationException('WP-03 rollback probe')
      })
    )

    for (const tableName of [
      'task_authoring_heads',
      'task_readiness_assessments',
      'task_evidence_requirements',
      'task_supporting_references',
      'task_contract_versions',
      'task_specification_versions',
    ]) {
      const rows = await db.from(tableName).where('task_id', input.specification.taskId)
      assert.lengthOf(rows, 0, `Rollback left rows in ${tableName}`)
    }
  })

  test('rejects inconsistent resolved inheritance pins and oversized contract JSON before persistence', async ({
    assert,
  }) => {
    const inconsistent = buildConfirmedBundle()
    const badContract = {
      ...inconsistent.contract,
      resolvedContract: {
        ...inconsistent.contract.resolvedContract,
        inheritedFrom: {
          ...inconsistent.contract.resolvedContract.inheritedFrom,
          projectContextVersionId: randomUUID(),
        },
      },
    } satisfies TaskContractVersionV1

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          TaskSpecificationContractRepository.persistContractBundle(
            { ...inconsistent, contract: badContract },
            trx
          )
        ),
      InvariantViolationException
    )

    const oversized = buildConfirmedBundle()
    const oversizedSpecification: TaskSpecificationVersionV1 = {
      ...oversized.specification,
      richContent: { type: 'document', body: 'x'.repeat(262_145) },
    }
    await assert.rejects(
      () =>
        db.transaction((trx) =>
          TaskSpecificationContractRepository.persistContractBundle(
            { ...oversized, specification: oversizedSpecification },
            trx
          )
        ),
      ValidationException
    )

    const inconsistentCount = (await db
      .from('task_specification_versions')
      .where('task_id', inconsistent.specification.taskId)
      .count('* as total')
      .first()) as { total: string | number } | undefined
    const oversizedCount = (await db
      .from('task_specification_versions')
      .where('task_id', oversized.specification.taskId)
      .count('* as total')
      .first()) as { total: string | number } | undefined
    assert.equal(Number(inconsistentCount?.total ?? 0), 0)
    assert.equal(Number(oversizedCount?.total ?? 0), 0)
  })
})
