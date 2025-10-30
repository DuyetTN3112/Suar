export interface ProjectSearchDocumentRecord {
  projectId: string
  name: string
  description: string | null
  visibility: string
  status: string
  organizationId: string | null
  creatorId: string | null
  managerId: string | null
  ownerId: string | null
  tags: unknown[] | null
  deletedAt: string | null
  updatedAt: string
}

export interface ProjectSearchDocumentReader {
  findProjectSearchDocumentRecord(projectId: string): Promise<ProjectSearchDocumentRecord>
}
