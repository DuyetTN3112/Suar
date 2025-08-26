export interface TaskActionContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
}

export interface AuthenticatedTaskActionContext extends TaskActionContext {
  readonly userId: string
}

export function makeSystemTaskActionContext(systemUserId: string): AuthenticatedTaskActionContext {
  return {
    userId: systemUserId,
    ip: '0.0.0.0',
    userAgent: 'system',
    organizationId: null,
  }
}
