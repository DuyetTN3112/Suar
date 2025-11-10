export interface SettingActionContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
}

export interface AuthenticatedSettingActionContext extends SettingActionContext {
  readonly userId: string
}

export function makeSystemSettingActionContext(
  systemUserId: string
): AuthenticatedSettingActionContext {
  return {
    userId: systemUserId,
    ip: '0.0.0.0',
    userAgent: 'system',
    organizationId: null,
  }
}
