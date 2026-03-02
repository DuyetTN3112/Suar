export interface ProjectSearchSyncReader {
  listNotDeletedProjectIds(): Promise<string[]>
}
