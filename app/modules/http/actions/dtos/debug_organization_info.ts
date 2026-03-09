export interface DebugOrganizationInfo {
  user_id: string
  username: string | null
  user_current_organization_id: string | null
  session_organization_id: string | undefined
  organizations: Record<string, unknown>[]
}
