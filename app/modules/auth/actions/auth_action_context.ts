export interface AuthActionContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
}

export interface AuthenticatedAuthActionContext extends AuthActionContext {
  readonly userId: string
}

export function makeSystemAuthActionContext(systemUserId: string): AuthenticatedAuthActionContext {
  return {
    userId: systemUserId,
    ip: '0.0.0.0',
    userAgent: 'system',
    organizationId: null,
  }
}
