export interface UserDirectorySearchDocumentRecord {
  userId: string
  username: string
  email: string
  status: string
  deletedAt: string | null
  updatedAt: string
}

export interface UserDirectorySearchDocumentReader {
  findUserDirectorySearchDocumentRecord(userId: string): Promise<UserDirectorySearchDocumentRecord>
}
