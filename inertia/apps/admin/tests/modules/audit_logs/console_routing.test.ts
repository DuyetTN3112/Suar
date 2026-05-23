import { describe, expect, it } from 'vitest'

import {
  buildAuditLogPageHref,
  readWorkspaceViewFromUrl,
} from '@/apps/admin/modules/audit_logs/console_routing'

describe('admin audit log routing helpers', () => {
  it('reads known workspace view from url and falls back to overview', () => {
    expect(readWorkspaceViewFromUrl('/admin/audit-logs?view=stream')).toBe('stream')
    expect(readWorkspaceViewFromUrl('/admin/audit-logs?view=evidence&page=2')).toBe('evidence')
    expect(readWorkspaceViewFromUrl('/admin/audit-logs?view=payload&page=2')).toBe('payload')
    expect(readWorkspaceViewFromUrl('/admin/audit-logs?view=payload&after=cursor-1')).toBe('payload')
    expect(readWorkspaceViewFromUrl('/admin/audit-logs')).toBe('overview')
    expect(readWorkspaceViewFromUrl('/admin/audit-logs?view=unknown')).toBe('overview')
  })

  it('builds audit log href while preserving workspace view and filters', () => {
    expect(
      buildAuditLogPageHref({
        view: 'stream',
        search: 'trace-1',
        action: 'resolve',
        resourceType: 'review_dispute',
        userId: 'user-1',
        from: '2026-07-01',
        to: '2026-07-05',
        page: 3,
      })
    ).toBe(
      '/admin/audit-logs?view=stream&search=trace-1&action=resolve&resource_type=review_dispute&user_id=user-1&from=2026-07-01&to=2026-07-05&page=3'
    )
  })

  it('prefers cursor over page when building older-window href', () => {
    expect(
      buildAuditLogPageHref({
        view: 'stream',
        search: 'trace-1',
        page: 3,
        after: 'cursor-abc',
      })
    ).toBe('/admin/audit-logs?view=stream&search=trace-1&after=cursor-abc')
  })

  it('builds newer-window href with before cursor', () => {
    expect(
      buildAuditLogPageHref({
        view: 'stream',
        search: 'trace-1',
        page: 3,
        before: 'cursor-newer',
      })
    ).toBe('/admin/audit-logs?view=stream&search=trace-1&before=cursor-newer')
  })
})
