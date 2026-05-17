import type { WorkspaceView } from '@/apps/admin/modules/audit_logs/console_view'

interface BuildAuditLogPageHrefOptions {
  readonly view: WorkspaceView
  readonly search?: string
  readonly action?: string
  readonly resourceType?: string
  readonly userId?: string
  readonly from?: string
  readonly to?: string
  readonly page?: number
  readonly after?: string
  readonly before?: string
}

const WORKSPACE_VIEWS: WorkspaceView[] = ['overview', 'stream', 'evidence', 'payload']

export function readWorkspaceViewFromUrl(url: string): WorkspaceView {
  const view = new URLSearchParams(url.split('?')[1] ?? '').get('view')

  if (view && WORKSPACE_VIEWS.includes(view as WorkspaceView)) {
    return view as WorkspaceView
  }

  return 'overview'
}

export function buildAuditLogPageHref({
  view,
  search,
  action,
  resourceType,
  userId,
  from,
  to,
  page,
  after,
  before,
}: BuildAuditLogPageHrefOptions): string {
  const params = new URLSearchParams()

  params.set('view', view)

  if (search) params.set('search', search)
  if (action) params.set('action', action)
  if (resourceType) params.set('resource_type', resourceType)
  if (userId) params.set('user_id', userId)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (after) {
    params.set('after', after)
  } else if (before) {
    params.set('before', before)
  } else if (page) {
    params.set('page', String(page))
  }

  return `/admin/audit-logs?${params.toString()}`
}
