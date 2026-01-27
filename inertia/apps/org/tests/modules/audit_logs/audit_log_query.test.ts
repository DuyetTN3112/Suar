import { describe, expect, it } from 'vitest'

import {
  buildOrganizationAuditHref,
  countActiveOrganizationAuditFilters,
  organizationAuditTargetHref,
} from '@/apps/org/modules/audit_logs/lib/audit_log_query'

describe('organization audit query helpers', () => {
  it('preserves filters while replacing the cursor', () => {
    expect(
      buildOrganizationAuditHref(
        '/org/audit-logs?search=ngoc&resourceType=task&before=old-cursor',
        { after: 'new-cursor', event: null },
        { resetCursor: true }
      )
    ).toBe('/org/audit-logs?search=ngoc&resourceType=task&after=new-cursor')
  })

  it('clears both cursors when filters change', () => {
    expect(
      buildOrganizationAuditHref(
        '/org/audit-logs?after=cursor&outcome=success&event=audit-1',
        { outcome: 'failure', event: null },
        { resetCursor: true }
      )
    ).toBe('/org/audit-logs?outcome=failure')
  })

  it('adds and removes a deep-linked event without dropping investigation state', () => {
    const opened = buildOrganizationAuditHref('/org/audit-logs?search=task&outcome=success', {
      event: 'audit-1',
    })
    expect(opened).toBe('/org/audit-logs?search=task&outcome=success&event=audit-1')
    expect(buildOrganizationAuditHref(opened, { event: null })).toBe(
      '/org/audit-logs?search=task&outcome=success'
    )
  })

  it('counts only active filters', () => {
    expect(
      countActiveOrganizationAuditFilters({
        search: 'task',
        outcome: 'success',
        action: '',
        from: null,
      })
    ).toBe(2)
  })

  it('links only supported organization-owned targets', () => {
    expect(organizationAuditTargetHref({ type: 'task', id: 'task/1' })).toBe(
      '/org/tasks/task%2F1'
    )
    expect(organizationAuditTargetHref({ type: 'project', id: 'project-1' })).toBe(
      '/org/projects/project-1'
    )
    expect(organizationAuditTargetHref({ type: 'organization', id: 'org-1' })).toBe(
      '/org/settings'
    )
    expect(organizationAuditTargetHref({ type: 'user', id: 'user-1' })).toBeNull()
  })
})
