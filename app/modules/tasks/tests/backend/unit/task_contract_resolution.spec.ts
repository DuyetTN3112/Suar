import { test } from '@japa/runner'

import {
  RESOLVED_TASK_CONTRACT_V1_FIXTURE,
  TASK_EVIDENCE_CONTRACT_V1_FIXTURE,
  TASK_SPECIFICATION_VERSION_V1_FIXTURE,
  TASK_WORK_CONTRACT_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import {
  buildResolvedTaskContract,
  compareTaskSpecificationStructuredParity,
  decideTaskContractVersionChange,
  resolveTaskWorkContract,
  type TaskWorkContractResolutionInput,
} from '#modules/tasks/domain/task-authoring/task_contract_resolution'

const hash = (character: string): TvaSha256 => `sha256:${character.repeat(64)}`

function resolutionInput(): TaskWorkContractResolutionInput {
  return {
    targetPrivacyClassification: 'internal',
    ancestryVersionIds: ['template-v1', 'project-v2', 'package-v3'],
    task: {
      sourceVersionId: 'task-v4',
      privacyClassification: 'internal',
      values: { action: 'task_action' },
      clearFields: [],
    },
    workPackage: {
      sourceVersionId: 'package-v3',
      privacyClassification: 'internal',
      values: {
        action: 'package_action',
        desiredOutcome: 'Package outcome',
        environment: 'package-staging',
      },
      clearFields: [],
    },
    projectContext: {
      sourceVersionId: 'project-v2',
      privacyClassification: 'internal',
      values: {
        desiredOutcome: 'Project outcome',
        environment: 'project-staging',
      },
      clearFields: [],
    },
    template: {
      sourceVersionId: 'template-v1',
      privacyClassification: 'internal',
      values: TASK_WORK_CONTRACT_V1_FIXTURE,
      clearFields: [],
    },
  }
}

test.group('Unit | Task contract resolution and versioning', () => {
  test('resolves every field with Task > Work Package > Project Context > template precedence', ({
    assert,
  }) => {
    const result = resolveTaskWorkContract(resolutionInput())

    assert.equal(result.resolvedWork.action, 'task_action')
    assert.equal(result.resolvedWork.desiredOutcome, 'Package outcome')
    assert.equal(result.resolvedWork.environment, 'package-staging')
    assert.equal(result.resolvedWork.object, TASK_WORK_CONTRACT_V1_FIXTURE.object)
    assert.deepInclude(result.provenance['action'], {
      source: 'task',
      sourceVersionId: 'task-v4',
      inherited: false,
    })
    assert.deepInclude(result.provenance['desiredOutcome'], {
      source: 'work_package',
      sourceVersionId: 'package-v3',
      inherited: true,
    })
    assert.deepInclude(result.provenance['object'], {
      source: 'template',
      sourceVersionId: 'template-v1',
      inherited: true,
    })
    assert.deepEqual(result.findings, [])
  })

  test('does not let accidental empty overrides hide inherited critical content', ({ assert }) => {
    const input = resolutionInput()
    const result = resolveTaskWorkContract({
      ...input,
      task: {
        sourceVersionId: 'task-v4',
        privacyClassification: 'internal',
        clearFields: [],
        values: { action: '   ', deliverables: [] },
      },
    })

    assert.equal(result.resolvedWork.action, 'package_action')
    assert.deepEqual(result.resolvedWork.deliverables, TASK_WORK_CONTRACT_V1_FIXTURE.deliverables)
    assert.includeMembers(
      result.warnings.map((finding) => finding.code),
      ['TVA.RESOLUTION.EMPTY_OVERRIDE_IGNORED']
    )
  })

  test('fails closed for circular pins, deleted templates, and inherited privacy escalation', ({
    assert,
  }) => {
    const input = resolutionInput()
    const workPackage = input.workPackage
    if (!workPackage) {
      throw new TypeError('Test fixture must include a Work Package layer')
    }
    const result = resolveTaskWorkContract({
      ...input,
      targetPrivacyClassification: 'public',
      ancestryVersionIds: ['project-v2', 'package-v3', 'project-v2'],
      task: null,
      workPackage: {
        ...workPackage,
        privacyClassification: 'confidential',
      },
      template: null,
    })

    assert.includeMembers(
      result.findings.map((finding) => finding.code),
      [
        'TVA.RESOLUTION.CIRCULAR_INHERITANCE',
        'TVA.RESOLUTION.TEMPLATE_VERSION_MISSING',
        'TVA.RESOLUTION.INHERITED_PRIVACY_CONFLICT',
      ]
    )
  })

  test('builds a resolved contract, canonical hash input, and complete source provenance map', ({
    assert,
  }) => {
    const captured: unknown[] = []
    const hasher: TaskContractContentHasher = {
      hash: (value) => {
        captured.push(value)
        return hash('c')
      },
    }
    const result = buildResolvedTaskContract(
      {
        taskId: TASK_SPECIFICATION_VERSION_V1_FIXTURE.taskId,
        contractVersionId: RESOLVED_TASK_CONTRACT_V1_FIXTURE.versionId,
        specification: TASK_SPECIFICATION_VERSION_V1_FIXTURE,
        resolution: resolutionInput(),
        evidence: TASK_EVIDENCE_CONTRACT_V1_FIXTURE,
        supportingReferences: RESOLVED_TASK_CONTRACT_V1_FIXTURE.supportingReferences,
        readiness: RESOLVED_TASK_CONTRACT_V1_FIXTURE.readiness,
        inheritedFrom: RESOLVED_TASK_CONTRACT_V1_FIXTURE.inheritedFrom,
      },
      hasher
    )

    assert.isNotNull(result.contract)
    assert.equal(result.contract?.resolvedContentHash, hash('c'))
    assert.equal(result.contract?.work.action, 'task_action')
    assert.equal(result.provenance['acceptanceCriteria']?.source, 'template')
    assert.lengthOf(captured, 1)
  })

  test('keeps incomplete authoring as a Draft and never fabricates Assignment-ready output', ({
    assert,
  }) => {
    const input = resolutionInput()
    const hasher: TaskContractContentHasher = { hash: () => hash('d') }
    const result = buildResolvedTaskContract(
      {
        taskId: TASK_SPECIFICATION_VERSION_V1_FIXTURE.taskId,
        contractVersionId: RESOLVED_TASK_CONTRACT_V1_FIXTURE.versionId,
        specification: {
          ...TASK_SPECIFICATION_VERSION_V1_FIXTURE,
          confirmationState: 'draft',
        },
        resolution: {
          ...input,
          task: null,
          workPackage: null,
          projectContext: null,
          template: null,
        },
        evidence: TASK_EVIDENCE_CONTRACT_V1_FIXTURE,
        supportingReferences: [],
        readiness: {
          ...RESOLVED_TASK_CONTRACT_V1_FIXTURE.readiness,
          workState: 'draft',
          evidenceState: 'not_configured',
          assignmentReady: false,
          evidenceReady: false,
        },
        inheritedFrom: { projectContextVersionId: null, workPackageVersionId: null },
      },
      hasher
    )

    assert.isNull(result.contract)
    assert.include(
      result.findings.map((finding) => finding.code),
      'TVA.RESOLUTION.WORK_FIELD_MISSING'
    )
  })

  test('reports explicit rich/structured mismatches with stable paths instead of a score', ({
    assert,
  }) => {
    const findings = compareTaskSpecificationStructuredParity([
      {
        fieldPath: 'work.deliverables',
        sourcePath: 'specification.sections.deliverables',
        specificationValueHash: hash('1'),
        structuredValueHash: hash('2'),
        critical: true,
      },
      {
        fieldPath: 'work.environment',
        sourcePath: 'specification.sections.environment',
        specificationValueHash: hash('3'),
        structuredValueHash: hash('4'),
        critical: false,
      },
    ])

    assert.deepEqual(
      findings.map((finding) => ({
        code: finding.code,
        severity: finding.severity,
        fieldPath: finding.fieldPath,
        sourcePath: finding.sourcePath,
      })),
      [
        {
          code: 'TVA.CONTRACT.RICH_STRUCTURED_MISMATCH',
          severity: 'blocker',
          fieldPath: 'work.deliverables',
          sourcePath: 'specification.sections.deliverables',
        },
        {
          code: 'TVA.CONTRACT.RICH_STRUCTURED_MISMATCH_WARNING',
          severity: 'warning',
          fieldPath: 'work.environment',
          sourcePath: 'specification.sections.environment',
        },
      ]
    )
  })

  test('never mutates an immutable version and requires successor acknowledgement after assignment', ({
    assert,
  }) => {
    assert.deepEqual(
      decideTaskContractVersionChange({
        operation: 'mutate_existing',
        assignmentSnapshotId: null,
        changeClass: 'editorial',
      }),
      {
        allowed: false,
        code: 'TVA.VERSION.IMMUTABLE_VERSION',
        createSuccessor: true,
        acknowledgementRequired: false,
      }
    )
    assert.deepEqual(
      decideTaskContractVersionChange({
        operation: 'create_successor',
        assignmentSnapshotId: 'snapshot-1',
        changeClass: 'material_scope',
      }),
      {
        allowed: true,
        code: 'TVA.VERSION.SUCCESSOR_REQUIRED',
        createSuccessor: true,
        acknowledgementRequired: true,
      }
    )
  })
})
