export interface UserSearchSyncReader {
  listActiveUserIds(): Promise<string[]>
  listNotDeletedUserIds(): Promise<string[]>
}
