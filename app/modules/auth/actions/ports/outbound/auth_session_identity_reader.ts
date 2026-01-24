export interface AuthSessionIdentity {
  id: string
  email: string | null
  system_role: string
  current_organization_id: string | null
  status: string
  deleted_at: unknown | null
}

export abstract class AuthSessionIdentityReader {
  abstract findById(userId: string): Promise<AuthSessionIdentity | null>
}
