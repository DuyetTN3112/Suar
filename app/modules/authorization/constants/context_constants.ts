export const INTERFACE_CONTEXT_TYPES = {
  SYSTEM_ADMIN: 'system_admin',
  ORGANIZATION: 'organization',
  USER: 'user',
} as const

export type InterfaceContextType =
  (typeof INTERFACE_CONTEXT_TYPES)[keyof typeof INTERFACE_CONTEXT_TYPES]
