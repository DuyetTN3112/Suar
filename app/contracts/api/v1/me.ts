export interface MeOrganizationResponse {
  id: string
  name: string
  logo: string | null
  orgRole: string | null
  status: string | null
}

export interface MeResponse {
  id: string
  email: string | null
  username: string
  avatarUrl: string | null
  systemRole: string
  currentOrganizationId: string | null
  currentOrganizationRole: string | null
  organizations: MeOrganizationResponse[]
}
