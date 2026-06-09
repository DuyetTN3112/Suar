import type {
  CurrentApplicantMarketplaceApplication,
  MarketplaceApplicationForReview,
  MarketplaceApplicationPage,
  MarketplaceApplicationScore,
  MarketplaceApplicationStatus,
  RankedMarketplaceApplication,
} from '#modules/marketplace/actions/dtos/marketplace-application/marketplace_application'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

function mapMarketplaceTaskApplicationsListItem(application: MarketplaceApplicationForReview) {
  return {
    id: application.id,
    task_id: application.taskId,
    task: application.task
      ? {
          id: application.task.id,
          title: application.task.title,
          status: application.task.status,
        }
      : null,
    ...(application.applicant
      ? {
          user: {
            id: application.applicant.id,
            username: application.applicant.username,
            email: application.applicant.email,
          },
        }
      : {}),
    status: application.applicationStatus,
    cover_letter: application.message,
    portfolio_links: [...application.portfolioLinks],
    estimated_duration: null,
    created_at: application.appliedAt ?? '',
    candidate_source: application.candidateSource,
  }
}

type OrganizationMarketplaceApplicationsInboxItem = ReturnType<
  typeof mapOrganizationMarketplaceApplicationsInboxItem
>

function applicationTimestamp(application: MarketplaceApplicationForReview): number {
  return timestampValue(application.appliedAt)
}

function timestampValue(value: string | null): number {
  const timestamp = Date.parse(value ?? '')
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function mapOrganizationMarketplaceApplicationsInboxItem(application: MarketplaceApplicationForReview) {
  return {
    task_id: application.taskId,
    task: application.task
      ? {
          id: application.task.id,
          title: application.task.title,
          status: application.task.status,
        }
      : null,
    status: application.applicationStatus,
    project_name: null as string | null,
    pending_count: application.applicationStatus === 'pending' ? 1 : 0,
    total_count: 1,
    newest_application_at: application.appliedAt ?? '',
    candidate_sources: [application.candidateSource],
  }
}

function mergeOrganizationMarketplaceApplicationsInboxItem(
  item: OrganizationMarketplaceApplicationsInboxItem,
  application: MarketplaceApplicationForReview
) {
  item.total_count += 1
  if (application.applicationStatus === 'pending') {
    item.pending_count += 1
  }
  if (!item.candidate_sources.includes(application.candidateSource)) {
    item.candidate_sources.push(application.candidateSource)
  }
  if (
    application.appliedAt &&
    applicationTimestamp(application) > timestampValue(item.newest_application_at)
  ) {
    item.newest_application_at = application.appliedAt
  }
}

function mapOrganizationMarketplaceApplicationsInboxItems(
  applications: MarketplaceApplicationForReview[]
) {
  const byTaskId = new Map<string, OrganizationMarketplaceApplicationsInboxItem>()

  for (const application of applications) {
    const item = byTaskId.get(application.taskId)
    if (item) {
      mergeOrganizationMarketplaceApplicationsInboxItem(item, application)
      continue
    }

    byTaskId.set(application.taskId, mapOrganizationMarketplaceApplicationsInboxItem(application))
  }

  return [...byTaskId.values()].sort((first, second) => {
    return timestampValue(second.newest_application_at) - timestampValue(first.newest_application_at)
  })
}

function applicationStatusEventLabel(status: MarketplaceApplicationStatus): string | undefined {
  switch (status) {
    case 'approved':
      return 'Đã được chọn'
    case 'rejected':
      return 'Đã bị từ chối'
    case 'withdrawn':
      return 'Đã rút đề xuất'
    case 'pending':
      return undefined
  }
}

function buildApplicationLifecycleEvents(
  status: MarketplaceApplicationStatus,
  createdAt: string,
  reviewedAt: string | null
): { label: string }[] {
  const events = [{ label: `Đã gửi đề xuất: ${createdAt}` }]
  const statusEventLabel = applicationStatusEventLabel(status)

  if (statusEventLabel) {
    events.push({
      label: reviewedAt ? `${statusEventLabel}: ${reviewedAt}` : statusEventLabel,
    })
  }

  return events
}

function mapMyMarketplaceApplicationListItem(application: CurrentApplicantMarketplaceApplication) {
  const createdAt = application.appliedAt ?? ''
  const reviewedAt = application.reviewedAt

  return {
    id: application.id,
    task_id: application.taskId,
    ...(application.task
      ? {
          task: {
            id: application.task.id,
            title: application.task.title,
            status: application.task.status,
          },
        }
      : {}),
    status: application.applicationStatus,
    cover_letter: application.message,
    portfolio_links: [...application.portfolioLinks],
    rejection_reason: application.rejectionReason,
    estimated_duration: null,
    created_at: createdAt,
    updated_at: reviewedAt ?? createdAt,
    organization_name: application.task?.organizationName ?? null,
    project_name: application.task?.projectName ?? null,
    withdrawn_at: application.applicationStatus === 'withdrawn' ? reviewedAt : null,
    lifecycle_events: buildApplicationLifecycleEvents(
      application.applicationStatus,
      createdAt,
      reviewedAt
    ),
    can_withdraw: application.applicationStatus === 'pending',
  }
}

export function mapMarketplaceApplicationMatchScoreApiBody(result: MarketplaceApplicationScore) {
  return { data: result }
}

export function mapMarketplaceTaskApplicationsRankingApiBody(
  results: RankedMarketplaceApplication[]
) {
  return { data: results }
}

export function mapMarketplaceTaskApplicationsPageProps(
  result: MarketplaceApplicationPage<MarketplaceApplicationForReview>,
  taskId: string,
  statusFilter: string | undefined,
  shellMode: 'app' | 'organization' = 'app'
) {
  return {
    shellMode,
    taskId,
    applications: result.data.map(mapMarketplaceTaskApplicationsListItem),
    pagination: toCanonicalPagePagination(result.meta),
    statusFilter: statusFilter ?? 'all',
  }
}

export function mapMyMarketplaceApplicationsPageProps(
  result: MarketplaceApplicationPage<CurrentApplicantMarketplaceApplication>,
  statusFilter: string | undefined
) {
  return {
    applications: result.data.map(mapMyMarketplaceApplicationListItem),
    pagination: toCanonicalPagePagination(result.meta),
    statusFilter: statusFilter ?? 'all',
  }
}

export function mapOrganizationMarketplaceApplicationsPageProps(
  result: MarketplaceApplicationPage<MarketplaceApplicationForReview>,
  statusFilter: string | undefined
) {
  return {
    shellMode: 'organization' as const,
    applications: mapOrganizationMarketplaceApplicationsInboxItems(result.data),
    pagination: toCanonicalPagePagination(result.meta),
    statusFilter: statusFilter ?? 'pending',
  }
}
