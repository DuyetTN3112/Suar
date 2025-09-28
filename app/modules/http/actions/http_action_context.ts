export interface HttpActionContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
  readonly requestId?: string | null
  readonly traceId?: string | null
  readonly workflowId?: string | null
}

export interface AuthenticatedHttpActionContext extends HttpActionContext {
  readonly userId: string
}

export function makeSystemHttpActionContext(systemUserId: string): AuthenticatedHttpActionContext {
  return {
    userId: systemUserId,
    ip: '0.0.0.0',
    userAgent: 'system',
    organizationId: null,
  }
}
