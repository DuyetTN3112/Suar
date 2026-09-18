import type { TaskWorkContractResolutionResult } from '#modules/tasks/domain/task-authoring/task_contract_resolution'
import type TaskAuthoringHead from '#modules/tasks/infra/models/task-authoring/task_authoring_head'
import type TaskContractVersion from '#modules/tasks/infra/models/task-authoring/task_contract_version'
import type TaskReadinessAssessment from '#modules/tasks/infra/models/task-authoring/task_readiness_assessment'
import type TaskSpecificationVersion from '#modules/tasks/infra/models/task-authoring/task_specification_version'
import type TaskEvidenceRequirement from '#modules/tasks/infra/models/task-requirements/task_evidence_requirement'
import type TaskSupportingReference from '#modules/tasks/infra/models/task-requirements/task_supporting_reference'
import type {
  TvaJsonObject,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  TaskContractVersionV1,
  TaskReadinessResultV1,
  TaskSpecificationVersionV1,
  TaskSupportingReferenceV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'

export interface TaskReadinessAuditPersistenceInput {
  readonly assessmentInput: TvaJsonObject
  readonly inputHash: TvaSha256
  readonly resultHash: TvaSha256
  readonly result: TaskReadinessResultV1
}

export interface PersistTaskSpecificationDraftInput {
  readonly specification: TaskSpecificationVersionV1
  readonly supportingReferences: readonly TaskSupportingReferenceV1[]
  readonly readinessAudit: TaskReadinessAuditPersistenceInput
  readonly expectedHeadRevision: number | null
}

export interface PersistTaskSpecificationContractBundleInput {
  readonly specification: TaskSpecificationVersionV1
  readonly contract: TaskContractVersionV1
  readonly resolutionProvenance?: TaskWorkContractResolutionResult['provenance']
  readonly readinessAudit: TaskReadinessAuditPersistenceInput
  readonly expectedHeadRevision: number | null
}

export interface PersistedTaskSpecificationDraft {
  readonly specification: TaskSpecificationVersion
  readonly supportingReferences: readonly TaskSupportingReference[]
  readonly readinessAssessment: TaskReadinessAssessment
  readonly head: TaskAuthoringHead
}

export interface PersistedTaskSpecificationContractBundle extends PersistedTaskSpecificationDraft {
  readonly contract: TaskContractVersion
  readonly evidenceRequirements: readonly TaskEvidenceRequirement[]
}

export interface CurrentTaskSpecificationContractBundle {
  readonly head: TaskAuthoringHead
  readonly specification: TaskSpecificationVersion
  readonly contract: TaskContractVersion | null
  readonly supportingReferences: readonly TaskSupportingReference[]
  readonly evidenceRequirements: readonly TaskEvidenceRequirement[]
  readonly latestReadinessAssessment: TaskReadinessAssessment | null
}
