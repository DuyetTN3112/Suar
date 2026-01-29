export interface TalentDirectoryBookmarkRow {
  id: string
  talent_user_id: string
  notes: string | null
  folder: string | null
  rating: number | null
}

export interface TalentDirectoryUserRow {
  id: string
  username: string
  status: string
  trust_data: unknown
  avatar_url: string | null
  bio: string | null
  profile_settings: unknown
  is_external_contributor: boolean
  external_contributor_completed_tasks_count: number
}

export interface TalentDirectoryPageReadOptions {
  q?: string
  categorySkillIds?: string[] | null
  skillIds?: string[] | null
  businessDomain?: string | null
  taskType?: string | null
  problemCategory?: string | null
  roleInTask?: string | null
  techStack?: string | null
  domainTags?: string | null
  sortBy?: 'relevance' | 'trust_score' | 'completed_tasks' | 'name'
  sortOrder?: 'asc' | 'desc'
  saved?: boolean
  minTrustScore?: number
  minCompletedTasks?: number
  recruiterUserId?: string | null
  page: number
  perPage: number
}

export interface TalentDirectoryPageReader {
  fetchTalentPage(
    options: TalentDirectoryPageReadOptions
  ): Promise<{ items: TalentDirectoryUserRow[]; total: number }>

  fetchBookmarks(
    recruiterUserId: string,
    talentUserIds: string[]
  ): Promise<Map<string, TalentDirectoryBookmarkRow>>

  countSavedBookmarks(recruiterUserId: string): Promise<number>
}
