import { test } from '@japa/runner'

import {
  CreateTaskAuthoringPipeline,
  type CreateTaskAuthoringPipelineResult,
  type TaskAuthoringIdentityFactory,
} from '#modules/tasks/actions/commands/task-authoring/internal/create_task_authoring_pipeline'
import CreateTaskDTO from '#modules/tasks/actions/dtos/request/task-authoring/create_task_dto'
import type {
  PersistInitialTaskContractInput,
  PersistInitialTaskSpecificationInput,
  TaskAuthoringCreatePersistence,
} from '#modules/tasks/actions/ports/outbound/task-authoring/task_authoring_create_persistence'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'
import type { TaskReadinessFindingV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'

const ORG_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const PROJECT_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const STATUS_ID = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'
const ACTOR_ID = 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a'
const TASK_ID = 'e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7a8b'
const SPEC_ID = 'f6a7b8c9-d0e1-4f2a-8b3c-4d5e6f7a8b9c'
const CONTRACT_ID = '07b8c9d0-e1f2-4a3b-8c4d-5e6f7a8b9c0d'
const REFERENCE_ID = '18c9d0e1-f2a3-4b4c-8d5e-6f7a8b9c0d1e'
const CRITERION_ID = '29d0e1f2-a3b4-4c5d-8e6f-7a8b9c0d1e2f'
const DELIVERABLE_ID = '3ae1f2a3-b4c5-4d6e-8f7a-8b9c0d1e2f3a'
const REQUIREMENT_ID = '4bf2a3b4-c5d6-4e7f-8a8b-9c0d1e2f3a4b'
const CAPABILITY_ID = '5ca3b4c5-d6e7-4f8a-8b9c-0d1e2f3a4b5c'
const RUBRIC_ID = '6db4c5d6-e7f8-4a9b-8c0d-1e2f3a4b5c6d'

class SequenceIdentityFactory implements TaskAuthoringIdentityFactory {
  constructor(private readonly ids: string[]) {}

  nextId(): string {
    const id = this.ids.shift()
    if (!id) throw new Error('Test identity sequence exhausted')
    return id
  }
}

function draftDto(): CreateTaskDTO {
  return new CreateTaskDTO({
    title: 'Design pre-order API',
    task_status_id: STATUS_ID,
    project_id: PROJECT_ID,
    organization_id: ORG_ID,
    authoring: {
      mode: 'evidence_enabled',
      intent: 'save_draft',
      idempotency_key: 'draft:pre-order-api:1',
      expected_head_revision: 0,
      creator_confirmed: false,
    },
  })
}

function versionDraftDto(): CreateTaskDTO {
  return new CreateTaskDTO({
    title: 'Design pre-order API v2',
    description: 'Clarify the retry and compatibility contract.',
    task_status_id: STATUS_ID,
    project_id: PROJECT_ID,
    organization_id: ORG_ID,
    authoring: {
      mode: 'evidence_enabled',
      intent: 'save_draft',
      idempotency_key: 'draft:pre-order-api:2',
      expected_head_revision: 1,
      creator_confirmed: false,
      specification: {
        plain_text: 'Clarify the retry and compatibility contract for version two.',
      },
    },
  })
}

function completeEvidenceDto(
  authoringVersion: { idempotencyKey: string; expectedHeadRevision: number } = {
    idempotencyKey: 'publish:pre-order-api:1',
    expectedHeadRevision: 0,
  }
): CreateTaskDTO {
  return new CreateTaskDTO({
    title: 'Design pre-order API',
    description: 'Design an idempotent pre-order API and prove the contract works.',
    task_status_id: STATUS_ID,
    project_id: PROJECT_ID,
    organization_id: ORG_ID,
    assigned_to: ACTOR_ID,
    acceptance_criteria: 'All contract tests pass.',
    required_skills: [{ id: CAPABILITY_ID, level: 'l5' }],
    authoring: {
      mode: 'evidence_enabled',
      intent: 'publish',
      idempotency_key: authoringVersion.idempotencyKey,
      expected_head_revision: authoringVersion.expectedHeadRevision,
      creator_confirmed: true,
      constraints_addressed: true,
      dependencies_addressed: true,
      specification: {
        rich_content: {
          type: 'doc',
          content: [{ type: 'paragraph', text: 'Design the pre-order API contract.' }],
        },
        plain_text:
          'Design the pre-order API contract, failure handling, compatibility, and tests.',
        sections: [
          {
            id: SPEC_ID,
            key: 'execution-brief',
            title: 'Execution brief',
            plainText: 'Design contract, failure handling, compatibility, and tests.',
            critical: true,
            hasTextEquivalent: true,
          },
        ],
      },
      work_contract: {
        action: 'Design and implement',
        object: 'the pre-order order API',
        problemStatement: 'Current checkout cannot represent future inventory reservations.',
        desiredOutcome: 'Clients can create pre-orders safely with idempotent retries.',
        scope: [{ id: SPEC_ID, title: 'Order API', description: 'Create and query pre-orders.' }],
        outOfScope: [
          { id: CONTRACT_ID, title: 'Payment settlement', description: 'No settlement changes.' },
        ],
        deliverables: [
          {
            id: DELIVERABLE_ID,
            title: 'OpenAPI contract',
            description: 'Versioned API definition and implementation.',
            expectedFormat: 'OpenAPI YAML and source code',
            expectedLocation: 'repository',
          },
        ],
        acceptanceCriteria: [
          {
            id: CRITERION_ID,
            statement: 'Contract and retry tests pass in staging.',
            verificationMethod: 'Automated contract test and code review',
            critical: true,
          },
        ],
        qualityRequirements: [
          {
            id: REQUIREMENT_ID,
            title: 'Backward compatible',
            description: 'Existing order clients remain compatible.',
          },
        ],
        constraints: [
          {
            id: RUBRIC_ID,
            title: 'Compatibility constraint',
            description: 'No breaking change for existing clients.',
          },
        ],
        dependencies: [
          {
            id: REFERENCE_ID,
            title: 'Inventory reservation contract',
            description: 'Approved dependency contract.',
            ownerId: ACTOR_ID,
            state: 'ready',
          },
        ],
        roleInTask: 'Primary API designer and implementer',
        ownershipLevel: 'primary_owner',
        autonomyLevel: 'independent',
        collaborationType: 'cross_functional',
        environment: 'production-like staging',
        complexityContext: { distributedServices: 3, retryBoundary: true },
        impactScope: { modules: ['orders', 'inventory'], risk: 'high' },
        estimatedUsersAffected: 25_000,
        dueAt: '2026-08-20T10:00:00.000Z',
      },
      evidence_contract: {
        mode: 'evidence_enabled',
        requirements: [
          {
            id: REQUIREMENT_ID,
            type: 'test_report',
            title: 'Contract test report',
            description: 'Machine-readable contract and retry results.',
            criterionIds: [CRITERION_ID],
            deliverableIds: [DELIVERABLE_ID],
            required: true,
            privacyClassification: 'internal',
          },
        ],
        verificationMethods: ['Automated contract test', 'Code review'],
        verifierPolicy: {
          reviewerIds: [],
          reviewerRoleCodes: ['engineering_manager'],
          minimumReviewers: 1,
          disallowSelfReview: true,
        },
        capabilities: [
          {
            id: CAPABILITY_ID,
            capabilityId: CAPABILITY_ID,
            capabilityName: 'API design',
            minimumLevel: 4,
            targetLevel: 5,
            assessmentCeiling: 6,
            rubricVersionId: RUBRIC_ID,
            observableBehaviours: [
              'Defines stable API boundaries, retry behaviour, and failure contracts.',
            ],
          },
        ],
        profileEligibility: true,
        privacyClassification: 'internal',
      },
      supporting_references: [
        {
          type: 'document',
          uri: 'https://docs.example.test/pre-order',
          title: 'Original product requirement',
          relevant_section: 'Pre-order lifecycle',
          relation: 'requirement_source',
          access_state: 'authenticated',
          privacy_classification: 'internal',
        },
      ],
    },
  })
}

function buildPipeline(persistence: TaskAuthoringCreatePersistence, ids: string[]) {
  return new CreateTaskAuthoringPipeline({
    persistence,
    inheritanceReader: {
      readExactPins: () =>
        Promise.resolve({ projectContext: null, workPackage: null, findings: [] }),
    },
    hasher: new NodeTaskContractContentHasher(),
    identityFactory: new SequenceIdentityFactory(ids),
    clock: { nowIso: () => '2026-08-01T10:00:00.000Z' },
  })
}

test.group('Create Task authoring pipeline', () => {
  test('persists an incomplete title-only Task as a specification Draft with explainable readiness', async ({
    assert,
  }) => {
    const draftInputs: PersistInitialTaskSpecificationInput[] = []
    const pipeline = buildPipeline(
      {
        persistInitialDraft: (input) => {
          draftInputs.push(input)
          return Promise.resolve()
        },
        persistInitialContract: () => {
          throw new Error('Draft must not persist a Contract version')
        },
        persistVersionDraft: () => {
          throw new Error('Initial Draft must not use version persistence')
        },
        persistVersionContract: () => {
          throw new Error('Initial Draft must not use version persistence')
        },
      },
      [SPEC_ID, CONTRACT_ID]
    )

    const result = await pipeline.persistInitial({
      taskId: TASK_ID,
      actorId: ACTOR_ID,
      dto: draftDto(),
      trx: {},
    })

    assert.equal(result.contractVersionId, null)
    assert.equal(result.readiness.workState, 'draft')
    assert.isFalse(result.readiness.assignmentReady)
    assert.isFalse(result.readiness.evidenceReady)
    assert.includeMembers(
      result.readiness.blockers.map((finding) => finding.code),
      [
        'TVA.WORK.SPECIFICATION_MISSING',
        'TVA.WORK.ACTION_MISSING',
        'TVA.EVIDENCE.CAPABILITY_MISSING',
      ]
    )
    const persistedDraft = draftInputs[0]
    if (!persistedDraft) throw new Error('Expected one persisted Draft')
    assert.equal(persistedDraft.idempotencyKey, 'draft:pre-order-api:1')
    assert.equal(persistedDraft.expectedHeadRevision, 0)
    assert.equal(persistedDraft.specification.confirmationState, 'draft')
  })

  test('publishes a complete immutable Work/Evidence Contract and preserves authenticated refs as warnings', async ({
    assert,
  }) => {
    const contractInputs: PersistInitialTaskContractInput[] = []
    const pipeline = buildPipeline(
      {
        persistInitialDraft: () => {
          throw new Error('Publish must persist a Contract bundle')
        },
        persistInitialContract: (input) => {
          contractInputs.push(input)
          return Promise.resolve()
        },
        persistVersionDraft: () => {
          throw new Error('Initial publish must not use version persistence')
        },
        persistVersionContract: () => {
          throw new Error('Initial publish must not use version persistence')
        },
      },
      [SPEC_ID, CONTRACT_ID, REFERENCE_ID]
    )

    const result = await pipeline.persistInitial({
      taskId: TASK_ID,
      actorId: ACTOR_ID,
      dto: completeEvidenceDto(),
      trx: {},
    })

    assert.isTrue(result.readiness.assignmentReady)
    assert.isTrue(result.readiness.evidenceReady)
    assert.include(
      result.readiness.warnings.map((finding) => finding.code),
      'TVA.REFERENCE.AUTHENTICATION_REQUIRED'
    )
    const persistedContract = contractInputs[0]
    if (!persistedContract) throw new Error('Expected one persisted Contract bundle')
    assert.equal(persistedContract.contract.id, CONTRACT_ID)
    assert.equal(persistedContract.contract.resolvedContract.specification.versionId, SPEC_ID)
    assert.equal(
      persistedContract.contract.resolvedContract.supportingReferences[0]?.addedBy,
      ACTOR_ID
    )
    assert.equal(
      persistedContract.contract.resolvedContract.supportingReferences[0]?.accessState,
      'authenticated'
    )
    assert.equal(persistedContract.readinessAudit.result.evidenceState, 'evidence_ready')
    assert.notProperty(persistedContract.readinessAudit.result, 'richContent')
    assert.equal(persistedContract.resolutionProvenance['action']?.source, 'task')
    assert.isFalse(persistedContract.resolutionProvenance['action']?.inherited)
    assert.equal(
      persistedContract.resolutionProvenance['action']?.sourceVersionId,
      SPEC_ID
    )
  })

  test('blocks publishing an Evidence Contract when selected skills have no rubric yet', async ({ assert }) => {
    const contractInputs: PersistInitialTaskContractInput[] = []
    const dto = completeEvidenceDto()
    const authoring = dto.authoring.evidence_contract
    if (!authoring || !authoring.capabilities?.length) {
      throw new Error('Expected complete Evidence Contract capabilities')
    }
    const contractDto = new CreateTaskDTO({
      ...dto.toObject(),
      label: undefined,
      priority: undefined,
      assigned_to: undefined,
      due_date: undefined,
      parent_task_id: undefined,
      project_sprint_id: undefined,
      authoring: {
        ...dto.authoring,
        evidence_contract: {
          ...authoring,
          capabilities: authoring.capabilities.map((capability) => ({
            ...capability,
            assessmentCeiling: null,
            rubricVersionId: null,
          })),
        },
      },
    })
    const pipeline = buildPipeline(
      {
        persistInitialDraft: () => {
          throw new Error('Publish must persist a Contract bundle')
        },
        persistInitialContract: (input) => {
          contractInputs.push(input)
          return Promise.resolve()
        },
        persistVersionDraft: () => {
          throw new Error('Initial publish must not use version persistence')
        },
        persistVersionContract: () => {
          throw new Error('Initial publish must not use version persistence')
        },
      },
      [SPEC_ID, CONTRACT_ID, REFERENCE_ID]
    )

    await assert.rejects(() => pipeline.persistInitial({
      taskId: TASK_ID,
      actorId: ACTOR_ID,
      dto: contractDto,
      trx: {},
    }), /TVA\.EVIDENCE\.(ASSESSMENT_CEILING_MISSING|RUBRIC_VERSION_MISSING)/)

    assert.lengthOf(contractInputs, 0)
  })

  test('blocks publish when an exact inherited pin is unavailable or out of scope', async ({
    assert,
  }) => {
    const dto = completeEvidenceDto()
    const inheritedFailure: TaskReadinessFindingV1 = {
      code: 'TVA.RESOLUTION.WORK_PACKAGE_PIN_FORBIDDEN',
      severity: 'blocker',
      fieldPath: 'workPackageVersionId',
      sourcePath: null,
      message: 'Pinned Work Package is not available in this tenant and project.',
      remediationHint: 'Select an accessible Work Package version.',
    }
    const pipeline = new CreateTaskAuthoringPipeline({
      persistence: {
        persistInitialDraft: () => Promise.resolve(),
        persistInitialContract: () => Promise.resolve(),
        persistVersionDraft: () => Promise.resolve(),
        persistVersionContract: () => Promise.resolve(),
      },
      inheritanceReader: {
        readExactPins: () =>
          Promise.resolve({
            projectContext: null,
            workPackage: null,
            findings: [inheritedFailure],
          }),
      },
      hasher: new NodeTaskContractContentHasher(),
      identityFactory: new SequenceIdentityFactory([SPEC_ID, CONTRACT_ID, REFERENCE_ID]),
      clock: { nowIso: () => '2026-08-01T10:00:00.000Z' },
    })

    await assert.rejects(
      () => pipeline.persistInitial({ taskId: TASK_ID, actorId: ACTOR_ID, dto, trx: {} }),
      /TVA\.RESOLUTION\.WORK_PACKAGE_PIN_FORBIDDEN/
    )
  })

  test('publishes a subsequent immutable Contract version through version persistence', async ({
    assert,
  }) => {
    const versionInputs: PersistInitialTaskContractInput[] = []
    const pipeline = buildPipeline(
      {
        persistInitialDraft: () => {
          throw new Error('A version publish must not use initial persistence')
        },
        persistInitialContract: () => {
          throw new Error('A version publish must not use initial persistence')
        },
        persistVersionDraft: () => {
          throw new Error('Publish must persist a Contract bundle')
        },
        persistVersionContract: (input) => {
          versionInputs.push(input)
          return Promise.resolve()
        },
      },
      [SPEC_ID, CONTRACT_ID, REFERENCE_ID]
    )

    const result = await pipeline.persistVersion({
      taskId: TASK_ID,
      actorId: ACTOR_ID,
      dto: completeEvidenceDto({
        idempotencyKey: 'publish:pre-order-api:2',
        expectedHeadRevision: 1,
      }),
      trx: {},
    })

    assert.equal(result.headRevision, 2)
    const persistedVersion = versionInputs[0]
    if (!persistedVersion) throw new Error('Expected one persisted Contract version')
    assert.equal(persistedVersion.specification.versionNumber, 2)
    assert.equal(persistedVersion.contract.versionNumber, 2)
    assert.equal(persistedVersion.contract.changeClass, 'clarification')
  })

  test('persists a subsequent Draft as Specification v2 and advances head revision 1 to 2', async ({
    assert,
  }) => {
    const versionInputs: PersistInitialTaskSpecificationInput[] = []
    const persistence = {
      persistInitialDraft: () => {
        throw new Error('A subsequent version must not use initial persistence')
      },
      persistInitialContract: () => {
        throw new Error('A Draft must not persist a Contract bundle')
      },
      persistVersionDraft: (input: PersistInitialTaskSpecificationInput) => {
        versionInputs.push(input)
        return Promise.resolve()
      },
      persistVersionContract: () => {
        throw new Error('A Draft must not persist a Contract bundle')
      },
    }
    const pipeline = buildPipeline(persistence, [SPEC_ID, CONTRACT_ID]) as CreateTaskAuthoringPipeline & {
      persistVersion(input: {
        taskId: string
        actorId: string
        dto: CreateTaskDTO
        trx: object
      }): Promise<CreateTaskAuthoringPipelineResult>
    }

    const result = await pipeline.persistVersion({
      taskId: TASK_ID,
      actorId: ACTOR_ID,
      dto: versionDraftDto(),
      trx: {},
    })

    assert.equal(result.headRevision, 2)
    const persistedVersion = versionInputs[0]
    if (!persistedVersion) throw new Error('Expected one persisted version Draft')
    assert.equal(persistedVersion.expectedHeadRevision, 1)
    assert.equal(persistedVersion.specification.versionNumber, 2)
    assert.equal(persistedVersion.specification.changeClass, 'clarification')
  })
})
