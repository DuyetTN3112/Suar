export interface UserActionContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
}

export interface AuthenticatedUserActionContext extends UserActionContext {
  readonly userId: string
}

export function makeSystemUserActionContext(systemUserId: string): AuthenticatedUserActionContext {
  return {
    userId: systemUserId,
    ip: '0.0.0.0',
    userAgent: 'system',
    organizationId: null,
  }
}
