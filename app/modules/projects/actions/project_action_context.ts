export interface ProjectActionContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
}

export interface AuthenticatedProjectActionContext extends ProjectActionContext {
  readonly userId: string
}

export function makeSystemProjectActionContext(
  systemUserId: string
): AuthenticatedProjectActionContext {
  return {
    userId: systemUserId,
    ip: '0.0.0.0',
    userAgent: 'system',
    organizationId: null,
  }
}
