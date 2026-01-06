export interface OrganizationSearchSyncReader {
  listNotDeletedOrganizationIds(): Promise<string[]>
}
