import { describe, expect, it } from 'vitest'

import {
  buildUserAuditHref,
  countActiveUserAuditFilters,
  userAuditEventIdFromUrl,
} from '@/apps/user/modules/audit_logs/lib/user_audit_query'

describe('user audit query helpers', () => {
  it('preserves personal filters while replacing cursor state', () => {
    expect(
      buildUserAuditHref(
        '/settings/audit-logs?search=login&resourceType=user&before=old',
        { after: 'new', event: null },
        { resetCursor: true }
      )
    ).toBe('/settings/audit-logs?search=login&resourceType=user&after=new')
  })

  it('resets cursors and deep links when personal filters change', () => {
    expect(
      buildUserAuditHref(
        '/settings/audit-logs?after=cursor&outcome=success&event=audit-1',
        { outcome: 'failure', event: null },
        { resetCursor: true }
      )
    ).toBe('/settings/audit-logs?outcome=failure')
  })

  it('opens and closes an evidence reference without dropping filter state', () => {
    const opened = buildUserAuditHref('/settings/audit-logs?search=security', {
      event: 'audit-1',
    })

    expect(opened).toBe('/settings/audit-logs?search=security&event=audit-1')
    expect(userAuditEventIdFromUrl(opened)).toBe('audit-1')
    expect(buildUserAuditHref(opened, { event: null })).toBe('/settings/audit-logs?search=security')
  })

  it('counts only active user-visible filters', () => {
    expect(
      countActiveUserAuditFilters({
        search: 'login',
        outcome: 'success',
        resourceType: '',
        from: null,
        to: undefined,
      })
    ).toBe(2)
  })

  it('drops organization and system-only query keys from personal history URLs', () => {
    expect(
      buildUserAuditHref(
        '/settings/audit-logs?action=admin.user.updated&userId=other-user&traceId=secret&search=login',
        {
          outcome: 'success',
          action: 'ignored',
        }
      )
    ).toBe('/settings/audit-logs?search=login&outcome=success')
  })
})
