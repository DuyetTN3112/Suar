import type { OffsetPagePagination } from '@/apps/user/shared/lib/pagination'

export interface UserDirectoryRecord {
  id: string
  username: string
  email: string
  system_role: string
  status: string
  reverse_review_summary?: {
    total_reviews: number
    average_rating: number | null
    peer_reviews: number
    manager_reviews: number
    anonymous_reviews: number
    last_review_at: string | null
  } | null
  organization_users?: {
    organization_id: string
    org_role: string
  }[]
  created_at?: string
}

export interface UsersProps {
  users: UserDirectoryRecord[]
  pagination: OffsetPagePagination
  filters: {
    search?: string
    system_role?: string
    status?: string
  }
  metadata: {
    roles: { value: string; label: string }[]
    statuses: { value: string; label: string }[]
  }
}

export interface PendingApprovalProps {
  users: UserDirectoryRecord[]
  pagination: OffsetPagePagination
  filters: {
    search?: string
    status?: string
  }
  metadata?: unknown
}
