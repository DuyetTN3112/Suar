export interface AuthWebSessionUser {
  id: string
  status: string
  deleted_at: unknown | null
}

export abstract class AuthWebSessionUserReader {
  abstract findById(userId: string): Promise<AuthWebSessionUser | null>
}
