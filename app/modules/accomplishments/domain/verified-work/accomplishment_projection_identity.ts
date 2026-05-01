import type { VerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import type {
  TvaOwnershipLevel,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export interface AccomplishmentContentHasher {
  hash(value: unknown): TvaSha256
}

export interface AccomplishmentProjectionSourceReference {
  readonly id: string
  readonly hash: TvaSha256
}

export interface AccomplishmentSemanticBoundary {
  readonly action: string
  readonly object: string
  readonly ownershipLevel: TvaOwnershipLevel
  readonly deliverableIds: readonly string[]
  readonly criterionResultIds: readonly string[]
  readonly evidenceIds: readonly string[]
}

export interface AccomplishmentProjectionIdentityInput {
  readonly taskAssignmentId: string
  readonly assignmentSnapshotId: string
  readonly assignmentSnapshotHash: TvaSha256
  readonly completionReportId: string
  readonly completionReportHash: TvaSha256
  readonly subjectUserId: string
  readonly completionClaims: readonly AccomplishmentProjectionSourceReference[]
  readonly reviewWorkflowId: string
  readonly reviewObservations: readonly AccomplishmentProjectionSourceReference[]
  readonly semanticBoundary: AccomplishmentSemanticBoundary
  readonly policyVersion: string
}

export interface AccomplishmentProjectionIdentity {
  readonly projectionKey: string
  readonly sourceHash: TvaSha256
  readonly accomplishmentId: string
}

function sortReferences(
  references: readonly AccomplishmentProjectionSourceReference[]
): AccomplishmentProjectionSourceReference[] {
  return [...references].sort(
    (left, right) => left.id.localeCompare(right.id) || left.hash.localeCompare(right.hash)
  )
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort()
}

export function deterministicUuidFromSha256(hash: TvaSha256): string {
  const characters = hash.slice('sha256:'.length, 'sha256:'.length + 32).split('')
  characters[12] = '8'
  characters[16] = '8'
  const hex = characters.join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export function buildAccomplishmentProjectionIdentity(
  input: AccomplishmentProjectionIdentityInput,
  hasher: AccomplishmentContentHasher
): AccomplishmentProjectionIdentity {
  const canonicalSource = {
    schemaVersion: 'suar.accomplishment_projection_identity.v1',
    taskAssignmentId: input.taskAssignmentId,
    assignmentSnapshotId: input.assignmentSnapshotId,
    assignmentSnapshotHash: input.assignmentSnapshotHash,
    completionReportId: input.completionReportId,
    completionReportHash: input.completionReportHash,
    subjectUserId: input.subjectUserId,
    completionClaims: sortReferences(input.completionClaims),
    reviewWorkflowId: input.reviewWorkflowId,
    reviewObservations: sortReferences(input.reviewObservations),
    semanticBoundary: {
      action: input.semanticBoundary.action,
      object: input.semanticBoundary.object,
      ownershipLevel: input.semanticBoundary.ownershipLevel,
      deliverableIds: sortedUnique(input.semanticBoundary.deliverableIds),
      criterionResultIds: sortedUnique(input.semanticBoundary.criterionResultIds),
      evidenceIds: sortedUnique(input.semanticBoundary.evidenceIds),
    },
    policyVersion: input.policyVersion,
  }
  const sourceHash = hasher.hash(canonicalSource)
  return {
    projectionKey: `vwa:v1:${sourceHash.slice('sha256:'.length)}`,
    sourceHash,
    accomplishmentId: deterministicUuidFromSha256(sourceHash),
  }
}

export function hashVerifiedAccomplishmentPayload(
  payload: VerifiedWorkAccomplishmentV1,
  hasher: AccomplishmentContentHasher
): TvaSha256 {
  const { canonicalHash: _canonicalHash, ...canonicalContent } = payload
  return hasher.hash(canonicalContent)
}
