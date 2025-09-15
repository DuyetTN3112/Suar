export interface UserAccountSnapshot {
  userId: string
  email: string | null
  username: string | null
  status: string
  systemRole: string | null
}

export interface UserAccountReader {
  findAccount(userId: string): Promise<UserAccountSnapshot | null>
}
