import type {
  TaskContractVersionV1,
  TaskReadinessResultV1,
  TaskSpecificationVersionV1,
  TaskSupportingReferenceV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === 'object') {
    const source = value as Readonly<Record<string, unknown>>
    return Object.fromEntries(
      Object.keys(source)
        .sort()
        .filter((key) => source[key] !== undefined)
        .map((key) => [key, canonicalize(source[key])])
    )
  }
  return value
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right))
}

function failIntegrity(): never {
  throw new InvariantViolationException(
    'Persisted Task authoring bundle failed immutable integrity verification'
  )
}

function specificationHashInput(specification: TaskSpecificationVersionV1) {
  return {
    schemaVersion: specification.schemaVersion,
    taskId: specification.taskId,
    versionNumber: specification.versionNumber,
    richContent: specification.richContent,
    plainTextProjection: specification.plainTextProjection,
    sectionIndex: specification.sectionIndex,
    projectContextVersionId: specification.projectContextVersionId,
    workPackageVersionId: specification.workPackageVersionId,
    confirmationState: specification.confirmationState,
    sourceProvenance: specification.sourceProvenance,
  }
}

function resolvedContractHashInput(contract: TaskContractVersionV1) {
  const resolved = contract.resolvedContract
  return {
    schemaVersion: resolved.schemaVersion,
    taskId: resolved.taskId,
    versionId: resolved.versionId,
    title: resolved.title,
    specification: resolved.specification,
    work: resolved.work,
    evidence: resolved.evidence,
    supportingReferences: resolved.supportingReferences,
    inheritedFrom: resolved.inheritedFrom,
    readiness: resolved.readiness,
  }
}

function taskContractHashInput(contract: TaskContractVersionV1) {
  return {
    schemaVersion: contract.schemaVersion,
    taskId: contract.taskId,
    taskSpecificationVersionId: contract.taskSpecificationVersionId,
    versionNumber: contract.versionNumber,
    workContract: contract.workContract,
    evidenceContract: contract.evidenceContract,
    resolvedContract: contract.resolvedContract,
    readinessState: contract.readinessState,
    creatorConfirmedBy: contract.creatorConfirmedBy,
    creatorConfirmedAt: contract.creatorConfirmedAt,
  }
}

export function assertTaskSpecificationContractIntegrity(input: {
  expectedTaskId: string
  specification: TaskSpecificationVersionV1
  contract: TaskContractVersionV1 | null
  supportingReferences?: readonly TaskSupportingReferenceV1[]
  readiness?: TaskReadinessResultV1
  hasher: TaskContractContentHasher
}): void {
  const { specification, contract, hasher } = input
  if (
    specification.taskId !== input.expectedTaskId ||
    hasher.hash(specificationHashInput(specification)) !== specification.contentHash
  ) {
    failIntegrity()
  }
  if (!contract) return

  const resolved = contract.resolvedContract
  const linked =
    contract.taskId === input.expectedTaskId &&
    contract.taskSpecificationVersionId === specification.id &&
    contract.versionNumber === specification.versionNumber &&
    resolved.taskId === input.expectedTaskId &&
    resolved.versionId === contract.id &&
    resolved.specification.versionId === specification.id &&
    resolved.specification.plainText === specification.plainTextProjection &&
    resolved.inheritedFrom.projectContextVersionId === specification.projectContextVersionId &&
    resolved.inheritedFrom.workPackageVersionId === specification.workPackageVersionId &&
    sameJson(resolved.specification.richContent, specification.richContent) &&
    sameJson(resolved.specification.sections, specification.sectionIndex) &&
    sameJson(resolved.work, contract.workContract) &&
    sameJson(resolved.evidence, contract.evidenceContract) &&
    contract.readinessState === resolved.readiness.workState
  const hashesMatch =
    hasher.hash(resolvedContractHashInput(contract)) === resolved.resolvedContentHash &&
    hasher.hash(taskContractHashInput(contract)) === contract.contentHash
  const externalFactsMatch =
    (input.supportingReferences === undefined ||
      sameJson(input.supportingReferences, resolved.supportingReferences)) &&
    (input.readiness === undefined || sameJson(input.readiness, resolved.readiness))

  if (!linked || !hashesMatch || !externalFactsMatch) failIntegrity()
}
