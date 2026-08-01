import { AuthSystemAccessReader } from '#modules/auth/actions/ports/outbound/auth_system_access_reader'
import { canAccessSystemAdministration } from '#modules/authorization/public_contracts/system_admin_access'

export class AuthorizationAuthSystemAccessReaderAdapter extends AuthSystemAccessReader {
  async canAccessSystemAdministration(systemRole: string | null): Promise<boolean> {
    const decision = await canAccessSystemAdministration(systemRole)
    return decision.allowed
  }
}
