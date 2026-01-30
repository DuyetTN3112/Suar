export interface SocialWebSessionHandle {
  loginIdentity(identity: unknown, remember: boolean): Promise<void>
  setCurrentOrganizationId(organizationId: string): void
}

export abstract class SocialWebSessionLogin {
  abstract login(
    session: SocialWebSessionHandle,
    userId: string,
    remember: boolean,
    currentOrganizationId: string | null
  ): Promise<void>
}
