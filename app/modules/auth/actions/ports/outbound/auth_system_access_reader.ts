export abstract class AuthSystemAccessReader {
  abstract canAccessSystemAdministration(systemRole: string | null): Promise<boolean>
}
