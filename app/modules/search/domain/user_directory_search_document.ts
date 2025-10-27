export interface UserDirectorySearchDocument {
  user_id: string
  username: string
  email: string | null
  status: string
  deleted_at: string | null
  updated_at: string
}

export interface UserDirectorySearchHit {
  userId: string
  score: number
}
