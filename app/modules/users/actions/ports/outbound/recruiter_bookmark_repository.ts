import type { UserTransaction } from './user_transaction.js'

export interface RecruiterBookmarkRecord {
  id: string
  recruiter_user_id: string
  talent_user_id: string
  notes: string | null
  folder: string
  rating: number | null
  created_at: string | Date
  updated_at: string | Date
}

export interface RecruiterBookmarkWorkspaceRow {
  id: string
  notes: string | null
  folder: string | null
  rating: number | null
  created_at: string | Date | null
  talent_id: string
  talent_username: string
  talent_status: string
  talent_trust_data: unknown
}

export interface RecruiterBookmarkListItem extends RecruiterBookmarkRecord {
  talent_username: string
}

export interface RecruiterBookmarkWorkspaceInput {
  recruiterUserId: string
  search: string | null
  folder: string | null
  offset: number
  limit: number
}

export interface RecruiterBookmarkRepository {
  findOwned(
    bookmarkId: string,
    recruiterUserId: string,
    transaction?: UserTransaction
  ): Promise<RecruiterBookmarkRecord | null>
  findByRecruiterAndTalent(
    recruiterUserId: string,
    talentUserId: string,
    transaction?: UserTransaction
  ): Promise<RecruiterBookmarkRecord | null>
  create(
    data: Omit<RecruiterBookmarkRecord, 'id' | 'created_at' | 'updated_at'>,
    transaction: UserTransaction
  ): Promise<RecruiterBookmarkRecord>
  update(
    bookmarkId: string,
    recruiterUserId: string,
    data: Partial<Pick<RecruiterBookmarkRecord, 'notes' | 'folder' | 'rating'>>,
    transaction: UserTransaction
  ): Promise<RecruiterBookmarkRecord | null>
  delete(
    bookmarkId: string,
    recruiterUserId: string,
    transaction: UserTransaction
  ): Promise<boolean>
  listByRecruiter(recruiterUserId: string): Promise<RecruiterBookmarkListItem[]>
  listWorkspace(
    input: RecruiterBookmarkWorkspaceInput
  ): Promise<{ rows: RecruiterBookmarkWorkspaceRow[]; total: number }>
}
