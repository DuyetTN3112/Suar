import type {
  AdminAuditEventRecord,
  AdminAuditSurface,
  AdminAuditTargetReferenceSet,
} from './admin_audit_event_reader.js'

export interface AdminAuditActorProjection {
  id: string
  username: string
}

export interface AdminAuditSearchProjection {
  matchedActorUserIds: string[]
  organizationScopedTargets: AdminAuditTargetReferenceSet[]
  matchedTargets: AdminAuditTargetReferenceSet[]
}

/**
 * Consumer-owned boundary for the cross-domain labels and search candidates
 * displayed by the Admin audit console.
 */
export abstract class AdminAuditProjectionReader {
  abstract buildSearchProjection(input: {
    surface: AdminAuditSurface
    organizationId?: string
    search?: string
  }): Promise<AdminAuditSearchProjection>

  abstract findActorsByIds(ids: string[]): Promise<AdminAuditActorProjection[]>

  abstract resolveTargetLabels(input: {
    events: AdminAuditEventRecord[]
    surface: AdminAuditSurface
    organizationId?: string
  }): Promise<Map<string, string>>
}
