import {
  assertPublishReady,
  buildContract,
  buildEffectiveEvidence,
  buildReferences,
  buildResolutionLayers,
  buildSpecification,
  EMPTY_WORK_CONTRACT,
  mergeDefined,
  readinessInputAsJson,
  TASK_AUTHORING_READINESS_POLICY_VERSION,
  type TaskAuthoringClock,
  type TaskAuthoringIdentityFactory,
} from './task_authoring_pipeline_builders.js'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type {
  CoordinateTaskAuthoringInput,
  TaskAuthoringCreateCoordinator,
} from '#modules/tasks/actions/ports/outbound/task-authoring/task_authoring_create_coordinator'
import type { TaskAuthoringCreatePersistence } from '#modules/tasks/actions/ports/outbound/task-authoring/task_authoring_create_persistence'
import type { TaskAuthoringInheritanceReader } from '#modules/tasks/actions/ports/outbound/task-authoring/task_authoring_inheritance_reader'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import {
  buildResolvedTaskContract,
  resolveTaskWorkContract,
} from '#modules/tasks/domain/task-authoring/task_contract_resolution'
import { assessTaskReadiness } from '#modules/tasks/domain/task-authoring/task_readiness_kernel'
import type { TaskAuthoringSummaryRecord } from '#modules/tasks/types/task_records'

export {
  TASK_AUTHORING_READINESS_POLICY_VERSION,
  type TaskAuthoringClock,
  type TaskAuthoringIdentityFactory,
} from './task_authoring_pipeline_builders.js'

export type CreateTaskAuthoringPipelineResult = TaskAuthoringSummaryRecord

export interface CreateTaskAuthoringPipelineDependencies {
  readonly persistence: TaskAuthoringCreatePersistence
  readonly inheritanceReader: TaskAuthoringInheritanceReader
  readonly hasher: TaskContractContentHasher
  readonly identityFactory: TaskAuthoringIdentityFactory
  readonly clock: TaskAuthoringClock
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
