import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { TaskReadinessAuditPersistenceInput } from './task_specification_contract_types.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import TaskContractVersion from '#modules/tasks/infra/models/task-authoring/task_contract_version'
import TaskSpecificationVersion from '#modules/tasks/infra/models/task-authoring/task_specification_version'
import { taskSupportingReferenceFingerprint } from '#modules/tasks/infra/repositories/task-authoring/task_supporting_reference_fingerprint'
import type {
  TaskContractVersionV1,
  TaskReadinessResultV1,
  TaskSpecificationVersionV1,
  TaskSupportingReferenceV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'

export function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson)
  }

  if (value !== null && typeof value === 'object') {
    const normalized: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      const child = (value as Record<string, unknown>)[key]
      if (child !== undefined) {
        normalized[key] = canonicalizeJson(child)
      }
    }
    return normalized
  }

  return value
}

export function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalizeJson(left)) === JSON.stringify(canonicalizeJson(right))
}

export function assertSpecificationContractLinkage(
  specification: TaskSpecificationVersionV1,
  contract: TaskContractVersionV1
): void {
  const resolved = contract.resolvedContract
  const linkageIsConsistent =
    contract.taskId === specification.taskId &&
    contract.taskSpecificationVersionId === specification.id &&
    resolved.taskId === specification.taskId &&
    resolved.versionId === contract.id &&
    resolved.specification.versionId === specification.id &&
    resolved.specification.plainText === specification.plainTextProjection &&
    resolved.inheritedFrom.projectContextVersionId === specification.projectContextVersionId &&
    resolved.inheritedFrom.workPackageVersionId === specification.workPackageVersionId &&
    sameJson(resolved.specification.richContent, specification.richContent) &&
    sameJson(resolved.specification.sections, specification.sectionIndex) &&
    sameJson(resolved.work, contract.workContract) &&
    sameJson(resolved.evidence, contract.evidenceContract)

  if (!linkageIsConsistent) {
    throw new InvariantViolationException(
      'Task Contract persistence received inconsistent specification, inheritance, or resolved pins'
    )
  }
}

export function assertReadinessAudit(
  readinessAudit: TaskReadinessAuditPersistenceInput,
  expectedResult?: TaskReadinessResultV1
): void {
  if (expectedResult !== undefined && !sameJson(readinessAudit.result, expectedResult)) {
    throw new InvariantViolationException(
      'Task readiness audit result does not match the resolved Contract readiness result'
    )
  }
}

export function assertUniqueReferenceSemantics(
  references: readonly TaskSupportingReferenceV1[]
): void {
  const ids = new Set<string>()
  const fingerprints = new Set<string>()

  for (const reference of references) {
    const fingerprint = taskSupportingReferenceFingerprint(reference)
    if (ids.has(reference.id) || fingerprints.has(fingerprint)) {
      throw ValidationException.field(
        'supportingReferences',
        'Duplicate Supporting Reference in the same Task Specification version'
      )
    }
    ids.add(reference.id)
    fingerprints.add(fingerprint)
  }
}

export async function assertPointerTargetExists(
  taskId: string,
  specificationVersionId: string,
  contractVersionId: string | null,
  trx: TransactionClientContract
): Promise<void> {
  const specification = await TaskSpecificationVersion.query({ client: trx })
    .where('id', specificationVersionId)
    .where('task_id', taskId)
    .first()

  if (!specification) {
    throw new InvariantViolationException(
      'Task authoring head cannot point to a missing or cross-task Specification version'
    )
  }

  if (typeof contractVersionId === 'string') {
    const contract = await TaskContractVersion.query({ client: trx })
      .where('id', contractVersionId)
      .where('task_id', taskId)
      .first()
    if (!contract) {
      throw new InvariantViolationException(
        'Task authoring head cannot point to a missing or cross-task Contract version'
      )
    }
  }
}
