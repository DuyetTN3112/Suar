import type { CanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

export interface TaskReaderPort {
  /**
   * Reads basic information about a task to be displayed on the marketplace.
   */
  getMarketplaceTaskDetails(taskId: string): Promise<{
    id: string
    projectId: string
    title: string
    description: string
    status: string
    requiredSkills?: string[]
    visibility: 'external' | 'all'
  } | null>

  /**
   * Lists tasks that are eligible to be shown on the marketplace.
   */
  listEligibleTasks(params: {
    viewerId: string
    organizationId?: string
    skillTags?: string[]
    limit?: number
    offset?: number
  }): Promise<{
    data: { id: string; title: string; projectId: string }[]
    pagination: CanonicalPagePagination
  }>
}
