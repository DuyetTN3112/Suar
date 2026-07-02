import type {
  TvaChangeClass,
  TvaIsoTimestamp,
  TvaJsonObject,
  TvaJsonValue,
  TvaPrivacyClassification,
  TvaSha256,
  TvaSourceProvenanceV1,
  TvaUuid,
  TvaWorkPackageState,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export interface ProjectContextVersionV1 {
  readonly schemaVersion: 'suar.project_context_version.v1'
  readonly id: TvaUuid
  readonly organizationId: TvaUuid
  readonly projectId: TvaUuid
  readonly versionNumber: number
  readonly title: string
  readonly summary: string
  readonly richContent: TvaJsonValue
  readonly plainTextProjection: string
  readonly structuredDefaults: TvaJsonObject
  readonly activeFrom: TvaIsoTimestamp
  readonly retiredAt: TvaIsoTimestamp | null
  readonly createdBy: TvaUuid
  readonly confirmedBy: TvaUuid | null
  readonly changeClass: TvaChangeClass
  readonly changeReason?: string | null
  readonly privacyClassification: TvaPrivacyClassification
  readonly contentHash: TvaSha256
  readonly sourceProvenance: TvaSourceProvenanceV1
  readonly createdAt: TvaIsoTimestamp
}

export interface WorkPackageV1 {
  readonly schemaVersion: 'suar.work_package.v1'
  readonly id: TvaUuid
  readonly organizationId: TvaUuid
  readonly projectId: TvaUuid
  readonly key: string
  readonly title: string
  readonly summary: string
  readonly state: TvaWorkPackageState
  readonly activeVersionId: TvaUuid | null
  readonly createdBy: TvaUuid
  readonly createdAt: TvaIsoTimestamp
  readonly archivedAt: TvaIsoTimestamp | null
}

export interface WorkPackageVersionV1 {
  readonly schemaVersion: 'suar.work_package_version.v1'
  readonly id: TvaUuid
  readonly workPackageId: TvaUuid
  readonly projectId: TvaUuid
  readonly projectContextVersionId: TvaUuid | null
  readonly versionNumber: number
  readonly title: string
  readonly summary: string
  readonly richContent: TvaJsonValue
  readonly plainTextProjection: string
  readonly structuredOverrides: TvaJsonObject
  readonly authorId: TvaUuid
  readonly confirmedBy: TvaUuid | null
  readonly changeClass: TvaChangeClass
  readonly changeReason?: string | null
  readonly privacyClassification: TvaPrivacyClassification
  readonly contentHash: TvaSha256
  readonly sourceProvenance: TvaSourceProvenanceV1
  readonly createdAt: TvaIsoTimestamp
}
