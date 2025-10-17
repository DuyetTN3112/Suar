export interface OrganizationActionContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
  readonly requestId?: string | null
  readonly traceId?: string | null
  readonly workflowId?: string | null
}

export interface AuthenticatedOrganizationActionContext extends OrganizationActionContext {
  readonly userId: string
}

export function makeSystemOrganizationActionContext(
  systemUserId: string
): AuthenticatedOrganizationActionContext {
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
