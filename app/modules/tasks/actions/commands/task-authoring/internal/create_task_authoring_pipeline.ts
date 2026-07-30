import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type {
  CoordinateTaskAuthoringInput,
  TaskAuthoringCreateCoordinator,
  TaskAuthoringSubject,
} from '#modules/tasks/actions/ports/outbound/task-authoring/task_authoring_create_coordinator'
import type { TaskAuthoringCreatePersistence } from '#modules/tasks/actions/ports/outbound/task-authoring/task_authoring_create_persistence'
import type { TaskAuthoringInheritanceReader } from '#modules/tasks/actions/ports/outbound/task-authoring/task_authoring_inheritance_reader'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import {
  buildResolvedTaskContract,
  resolveTaskWorkContract,
  type TaskWorkContractLayer,
} from '#modules/tasks/domain/task-authoring/task_contract_resolution'
import { assessTaskReadiness } from '#modules/tasks/domain/task-authoring/task_readiness_kernel'
import type {
  TvaPrivacyClassification,
  TvaSourceProvenanceV1,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  ResolvedTaskContractV1,
  TaskContractVersionV1,
  TaskEvidenceContractV1,
  TaskReadinessFindingV1,
  TaskReadinessResultV1,
  TaskSpecificationVersionV1,
  TaskSupportingReferenceV1,
  TaskWorkContractV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import type { TaskAuthoringSummaryRecord } from '#modules/tasks/types/task_records'

export const TASK_AUTHORING_READINESS_POLICY_VERSION = 'suar.task-readiness.v1'

export interface TaskAuthoringIdentityFactory {
  nextId(): string
}

export interface TaskAuthoringClock {
  nowIso(): string
}

export type CreateTaskAuthoringPipelineResult = TaskAuthoringSummaryRecord

export interface CreateTaskAuthoringPipelineDependencies {
  readonly persistence: TaskAuthoringCreatePersistence
  readonly inheritanceReader: TaskAuthoringInheritanceReader
  readonly hasher: TaskContractContentHasher
  readonly identityFactory: TaskAuthoringIdentityFactory
  readonly clock: TaskAuthoringClock
}

const EMPTY_WORK_CONTRACT: TaskWorkContractV1 = Object.freeze({
  action: '',
  object: '',
  problemStatement: '',
  desiredOutcome: '',
  scope: Object.freeze([]),
  outOfScope: Object.freeze([]),
  deliverables: Object.freeze([]),
  acceptanceCriteria: Object.freeze([]),
  qualityRequirements: Object.freeze([]),
  constraints: Object.freeze([]),
  dependencies: Object.freeze([]),
  roleInTask: '',
  ownershipLevel: 'contributor',
  autonomyLevel: null,
  collaborationType: null,
  environment: null,
  complexityContext: Object.freeze({}),
  impactScope: Object.freeze({}),
  estimatedUsersAffected: null,
  dueAt: null,
})

const EMPTY_OPERATIONAL_EVIDENCE_CONTRACT: TaskEvidenceContractV1 = Object.freeze({
  mode: 'operational_only',
  requirements: Object.freeze([]),
  verificationMethods: Object.freeze([]),
  verifierPolicy: Object.freeze({
    reviewerIds: Object.freeze([]),
    reviewerRoleCodes: Object.freeze([]),
    minimumReviewers: 0,
    disallowSelfReview: true,
  }),
  capabilities: Object.freeze([]),
  profileEligibility: false,
  privacyClassification: 'internal',
})

const EMPTY_EVIDENCE_ENABLED_CONTRACT: TaskEvidenceContractV1 = Object.freeze({
  ...EMPTY_OPERATIONAL_EVIDENCE_CONTRACT,
  mode: 'evidence_enabled',
})

function targetPrivacy(taskVisibility: string): TvaPrivacyClassification {
  switch (taskVisibility) {
    case 'public':
      return 'public'
    case 'private':
      return 'private'
    default:
      return 'internal'
  }
}

function mergeDefined<T extends object>(defaults: T, overrides: Partial<T> | null): T {
  if (!overrides) return { ...defaults }
  const result = { ...defaults }
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      Object.assign(result, { [key]: value })
    }
  }
  return result
}

function buildEffectiveEvidence(dto: TaskAuthoringSubject): TaskEvidenceContractV1 {
  const defaults =
    dto.authoring.mode === 'evidence_enabled'
      ? EMPTY_EVIDENCE_ENABLED_CONTRACT
      : EMPTY_OPERATIONAL_EVIDENCE_CONTRACT
  return mergeDefined(defaults, dto.authoring.evidence_contract)
}

function buildSpecification(
  taskId: string,
  actorId: string,
  dto: TaskAuthoringSubject,
  specificationVersionId: string,
  versionNumber: number,
  changeClass: TaskSpecificationVersionV1['changeClass'],
  now: string,
  hasher: TaskContractContentHasher
): TaskSpecificationVersionV1 {
  const authored = dto.authoring.specification
  const richContent = authored?.rich_content ?? { type: 'doc', content: [] }
  const plainTextProjection = authored?.plain_text ?? dto.description ?? ''
  const sectionIndex = authored?.sections ?? []
  const confirmationState: TaskSpecificationVersionV1['confirmationState'] =
    dto.authoring.creator_confirmed ? 'creator_confirmed' : 'draft'
  const sourceProvenance: TvaSourceProvenanceV1 = {
    class: 'native_prework',
    sourceType: 'authored',
    sourceReferenceIds: [],
    confirmedBy: dto.authoring.creator_confirmed ? actorId : null,
    confirmedAt: dto.authoring.creator_confirmed ? now : null,
  }
  const hashInput = {
    schemaVersion: 'suar.task_specification_version.v1',
    taskId,
    versionNumber,
    richContent,
    plainTextProjection,
    sectionIndex,
    projectContextVersionId: dto.authoring.project_context_version_id,
    workPackageVersionId: dto.authoring.work_package_version_id,
    confirmationState,
    sourceProvenance,
  }

  return {
    ...hashInput,
    schemaVersion: 'suar.task_specification_version.v1',
    id: specificationVersionId,
    authorId: actorId,
    contentHash: hasher.hash(hashInput),
    changeClass,
    changeReason: null,
    createdAt: now,
  }
}

function buildReferences(
  dto: TaskAuthoringSubject,
  actorId: string,
  now: string,
  identityFactory: TaskAuthoringIdentityFactory
): TaskSupportingReferenceV1[] {
  return dto.authoring.supporting_references.map((reference) => ({
    id: identityFactory.nextId(),
    type: reference.type,
    uri: reference.uri.trim(),
    title: reference.title.trim(),
    relevantSection: reference.relevant_section.trim(),
    relation: reference.relation,
    accessState: reference.access_state,
    privacyClassification: reference.privacy_classification,
    externalVersion: reference.external_version ?? null,
    externalContentHash: reference.external_content_hash ?? null,
    addedBy: actorId,
    addedAt: now,
  }))
}

function buildResolutionLayers(input: {
  dto: TaskAuthoringSubject
  specificationVersionId: string
  projectContext: TaskWorkContractLayer | null
  workPackage: TaskWorkContractLayer | null
}) {
  const taskLayer: TaskWorkContractLayer = {
    sourceVersionId: input.specificationVersionId,
    privacyClassification: targetPrivacy(input.dto.task_visibility),
    values: input.dto.authoring.work_contract ?? {},
    clearFields: [],
  }
  const template: TaskWorkContractLayer = {
    sourceVersionId: TASK_AUTHORING_READINESS_POLICY_VERSION,
    privacyClassification: targetPrivacy(input.dto.task_visibility),
    values: {},
    clearFields: [],
  }
  return {
    targetPrivacyClassification: targetPrivacy(input.dto.task_visibility),
    ancestryVersionIds: [
      input.dto.authoring.project_context_version_id,
      input.dto.authoring.work_package_version_id,
    ].filter((value): value is string => value !== null),
    task: taskLayer,
    workPackage: input.workPackage,
    projectContext: input.projectContext,
    template,
  }
}

function readinessInputAsJson(input: {
  specification: TaskSpecificationVersionV1
  work: TaskWorkContractV1
  evidence: TaskEvidenceContractV1
  references: readonly TaskSupportingReferenceV1[]
  dto: TaskAuthoringSubject
  actorId: string
  inheritedFindings: readonly TaskReadinessFindingV1[]
  assessedAt: string
}): Record<string, unknown> {
  return {
    policyVersion: TASK_AUTHORING_READINESS_POLICY_VERSION,
    assessedAt: input.assessedAt,
    specification: {
      richContent: input.specification.richContent,
      plainText: input.specification.plainTextProjection,
      sections: input.specification.sectionIndex,
    },
    work: input.work,
    evidence: input.evidence,
    supportingReferences: input.references,
    creatorConfirmed: input.dto.authoring.creator_confirmed,
    assigneeId: input.dto.assigned_to ?? null,
    declarations: {
      constraintsAddressed: input.dto.authoring.constraints_addressed,
      dependenciesAddressed: input.dto.authoring.dependencies_addressed,
    },
    snapshotCapabilityAvailable: true,
    inheritedFindings: input.inheritedFindings,
    actorId: input.actorId,
  }
}

function assertPublishReady(dto: TaskAuthoringSubject, readiness: TaskReadinessResultV1): void {
  const ready =
    dto.authoring.mode === 'evidence_enabled'
      ? readiness.evidenceReady
      : readiness.assignmentReady ||
        (!dto.assigned_to && readiness.blockers.length === 0)
  if (!ready) {
    const blockers = readiness.blockers
      .map((finding) => `${finding.code}: ${finding.message}`)
      .join('; ')
    throw new ValidationException(`Task chưa đủ điều kiện publish: ${blockers}`)
  }
  if (dto.assigned_to && !readiness.assignmentReady) {
    throw new ValidationException('Task chưa đủ điều kiện để giao')
  }
}

function buildContract(input: {
  taskId: string
  actorId: string
  dto: TaskAuthoringSubject
  specification: TaskSpecificationVersionV1
  contractVersionId: string
  versionNumber: number
  changeClass: TaskContractVersionV1['changeClass']
  resolvedContract: ResolvedTaskContractV1
  work: TaskWorkContractV1
  evidence: TaskEvidenceContractV1
  readiness: TaskReadinessResultV1
  now: string
  hasher: TaskContractContentHasher
}): TaskContractVersionV1 {
  const hashInput = {
    schemaVersion: 'suar.task_contract_version.v1',
    taskId: input.taskId,
    taskSpecificationVersionId: input.specification.id,
    versionNumber: input.versionNumber,
    workContract: input.work,
    evidenceContract: input.evidence,
    resolvedContract: input.resolvedContract,
    readinessState: input.readiness.workState,
    creatorConfirmedBy: input.actorId,
    creatorConfirmedAt: input.now,
  }
  return {
    ...hashInput,
    schemaVersion: 'suar.task_contract_version.v1',
    id: input.contractVersionId,
    contentHash: input.hasher.hash(hashInput),
    changeClass: input.changeClass,
    changeReason: null,
    effectiveFrom: input.now,
    createdAt: input.now,
  }
}

export class CreateTaskAuthoringPipeline implements TaskAuthoringCreateCoordinator {
  constructor(private readonly dependencies: CreateTaskAuthoringPipelineDependencies) {}

  async persistInitial(
    input: CoordinateTaskAuthoringInput
  ): Promise<CreateTaskAuthoringPipelineResult> {
    if (input.dto.authoring.expected_head_revision !== 0) {
      throw new ConflictException('New Task authoring must start from head revision 0', {
        expectedHeadRevision: input.dto.authoring.expected_head_revision,
      })
    }
    return this.persist(input, 'initial')
  }

  async persistVersion(
    input: CoordinateTaskAuthoringInput
  ): Promise<CreateTaskAuthoringPipelineResult> {
    if (input.dto.authoring.expected_head_revision < 1) {
      throw new ConflictException('Task authoring version must target an existing head revision', {
        expectedHeadRevision: input.dto.authoring.expected_head_revision,
      })
    }
    return this.persist(input, 'version')
  }

  private async persist(
    input: CoordinateTaskAuthoringInput,
    persistenceMode: 'initial' | 'version'
  ): Promise<CreateTaskAuthoringPipelineResult> {
    const { dto } = input
    if (!dto.authoring.explicit || !dto.authoring.idempotency_key) {
      throw new ValidationException('Explicit Task authoring metadata is required')
    }
    if (dto.authoring.intent === 'save_draft' && dto.assigned_to) {
      throw new ValidationException('Task Draft chưa đủ điều kiện để giao')
    }

    const now = this.dependencies.clock.nowIso()
    const versionNumber = dto.authoring.expected_head_revision + 1
    const changeClass = persistenceMode === 'initial' ? 'initial' : 'clarification'
    const specificationVersionId = this.dependencies.identityFactory.nextId()
    const contractVersionId = this.dependencies.identityFactory.nextId()
    const specification = buildSpecification(
      input.taskId,
      input.actorId,
      dto,
      specificationVersionId,
      versionNumber,
      changeClass,
      now,
      this.dependencies.hasher
    )
    const references = buildReferences(dto, input.actorId, now, this.dependencies.identityFactory)
    const inheritance = await this.dependencies.inheritanceReader.readExactPins(
      {
        organizationId: dto.organization_id,
        projectId: dto.project_id,
        projectContextVersionId: dto.authoring.project_context_version_id,
        workPackageVersionId: dto.authoring.work_package_version_id,
      },
      input.trx
    )
    const resolutionInput = buildResolutionLayers({
      dto,
      specificationVersionId,
      projectContext: inheritance.projectContext,
      workPackage: inheritance.workPackage,
    })
    const resolution = resolveTaskWorkContract(resolutionInput)
    const work = mergeDefined(EMPTY_WORK_CONTRACT, resolution.resolvedWork)
    const evidence = buildEffectiveEvidence(dto)
    const inheritedFindings = [
      ...inheritance.findings,
      ...resolution.findings,
      ...resolution.warnings,
    ]
    const readinessInput = {
      policyVersion: TASK_AUTHORING_READINESS_POLICY_VERSION,
      assessedAt: now,
      specification: {
        richContent: specification.richContent,
        plainText: specification.plainTextProjection,
        sections: specification.sectionIndex,
      },
      work,
      evidence,
      supportingReferences: references,
      creatorConfirmed: dto.authoring.creator_confirmed,
      assigneeId: dto.assigned_to ?? null,
      declarations: {
        constraintsAddressed: dto.authoring.constraints_addressed,
        dependenciesAddressed: dto.authoring.dependencies_addressed,
      },
      snapshotCapabilityAvailable: true,
      inheritedFindings,
    } as const
    const readiness = assessTaskReadiness(readinessInput)
    const auditInput = readinessInputAsJson({
      specification,
      work,
      evidence,
      references,
      dto,
      actorId: input.actorId,
      inheritedFindings,
      assessedAt: now,
    })
    const requestHash = this.dependencies.hasher.hash({
      actorId: input.actorId,
      ...(persistenceMode === 'version' ? { taskId: input.taskId } : {}),
      task: dto.toObject(),
    })
    const readinessAudit = {
      assessmentInput: auditInput,
      inputHash: this.dependencies.hasher.hash(auditInput),
      resultHash: this.dependencies.hasher.hash(readiness),
      result: readiness,
    }

    if (dto.authoring.intent === 'save_draft') {
      const persistDraft =
        persistenceMode === 'initial'
          ? this.dependencies.persistence.persistInitialDraft.bind(this.dependencies.persistence)
          : this.dependencies.persistence.persistVersionDraft.bind(this.dependencies.persistence)
      await persistDraft(
        {
          organizationId: dto.organization_id,
          actorId: input.actorId,
          authoringMode: dto.authoring.mode,
          authoringIntent: dto.authoring.intent,
          idempotencyKey: dto.authoring.idempotency_key,
          requestHash,
          expectedHeadRevision: dto.authoring.expected_head_revision,
          specification,
          supportingReferences: references,
          readinessAudit,
        },
        input.trx
      )
      return {
        mode: dto.authoring.mode,
        intent: dto.authoring.intent,
        specificationVersionId,
        contractVersionId: null,
        headRevision: versionNumber,
        readiness,
        idempotencyKey: dto.authoring.idempotency_key,
        requestHash,
      }
    }

    assertPublishReady(dto, readiness)
    const resolved = buildResolvedTaskContract(
      {
        taskId: input.taskId,
        contractVersionId,
        title: dto.title,
        specification,
        resolution: resolutionInput,
        evidence,
        supportingReferences: references,
        readiness,
        inheritedFrom: {
          projectContextVersionId: dto.authoring.project_context_version_id,
          workPackageVersionId: dto.authoring.work_package_version_id,
        },
      },
      this.dependencies.hasher
    )
    if (!resolved.contract) {
      throw new ValidationException('Task Contract chưa thể resolve thành phiên bản bất biến')
    }
    const contract = buildContract({
      taskId: input.taskId,
      actorId: input.actorId,
      dto,
      specification,
      contractVersionId,
      versionNumber,
      changeClass,
      resolvedContract: resolved.contract,
      work,
      evidence,
      readiness,
      now,
      hasher: this.dependencies.hasher,
    })
    const persistContract =
      persistenceMode === 'initial'
        ? this.dependencies.persistence.persistInitialContract.bind(this.dependencies.persistence)
        : this.dependencies.persistence.persistVersionContract.bind(this.dependencies.persistence)
    await persistContract(
      {
        organizationId: dto.organization_id,
        actorId: input.actorId,
        authoringMode: dto.authoring.mode,
        authoringIntent: dto.authoring.intent,
        idempotencyKey: dto.authoring.idempotency_key,
        requestHash,
        expectedHeadRevision: dto.authoring.expected_head_revision,
        specification,
        contract,
        resolutionProvenance: resolution.provenance,
        supportingReferences: references,
        readinessAudit,
      },
      input.trx
    )

    return {
      mode: dto.authoring.mode,
      intent: dto.authoring.intent,
      specificationVersionId,
      contractVersionId,
      headRevision: versionNumber,
      readiness,
      idempotencyKey: dto.authoring.idempotency_key,
      requestHash,
    }
  }
}
