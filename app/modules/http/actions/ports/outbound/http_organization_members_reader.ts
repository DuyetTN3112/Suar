export interface HttpOrganizationMemberRecord {
  id: string
  org_role: string
  role_name: string
  joined_at: string
  user: {
    id: string
    username: string
    email: string | null
  }
}

export interface HttpOrganizationMembersResult {
  organization: Record<string, unknown>
  members: HttpOrganizationMemberRecord[]
}

export interface HttpOrganizationMembersReader {
  read(rawOrganizationId: string, rawQuery?: string): Promise<HttpOrganizationMembersResult>
}
