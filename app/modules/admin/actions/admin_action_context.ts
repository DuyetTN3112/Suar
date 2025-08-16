export interface AdminActionContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
}

export interface AuthenticatedAdminActionContext extends AdminActionContext {
  readonly userId: string
}

export function makeSystemAdminActionContext(systemUserId: string): AuthenticatedAdminActionContext {
  return {
    userId: systemUserId,
    ip: '0.0.0.0',
    userAgent: 'system',
    organizationId: null,
  }
}
