export interface ProjectRecentActivity {
  id: string
  user_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  created_at: Date
  username: string | null
}

export interface ProjectAuditActivityReader {
  listRecentProjectActivity(projectId: string, limit: number): Promise<ProjectRecentActivity[]>

  getLastProjectActivityByUsers(
    projectId: string,
    userIds: string[]
  ): Promise<Map<string, Date | null>>
}
