export interface OrganizationActor {
  id: string
  username: string | null
  email: string | null
  systemRole: string | null
}

export interface OrganizationActorLookup {
  findOrganizationActor(userId: string): Promise<OrganizationActor | null>
}
