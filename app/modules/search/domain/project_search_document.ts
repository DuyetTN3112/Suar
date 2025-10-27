export interface ProjectSearchDocument {
  project_id: string
  name: string
  description: string | null
  visibility: 'public' | 'private' | 'team'
  status: string
  organization_id: string
  creator_id: string
  manager_id: string | null
  owner_id: string | null
  tags_text: string
  deleted_at: string | null
  updated_at: string
}

export interface ProjectSearchHit {
  projectId: string
  score: number
}
