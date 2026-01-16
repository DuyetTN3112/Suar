export interface TaskSearchSyncReader {
  listNotDeletedTaskIds(): Promise<string[]>
}
