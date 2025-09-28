export interface AuditActionContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
  readonly requestId?: string | null
  readonly traceId?: string | null
  readonly workflowId?: string | null
}

export interface AuthenticatedAuditActionContext extends AuditActionContext {
  readonly userId: string
}

export function makeSystemAuditActionContext(systemUserId: string): AuthenticatedAuditActionContext {
  return {
    userId: systemUserId,
    ip: '0.0.0.0',
    userAgent: 'system',
    organizationId: null,
    requestId: null,
    traceId: null,
    workflowId: null,
  }
}
