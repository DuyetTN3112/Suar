export abstract class SystemUserAdminAccessAuthorizer {
  abstract authorize(userId: string, organizationId: string): Promise<void>

  abstract isAllowed(userId: string, organizationId: string): Promise<boolean>
}
