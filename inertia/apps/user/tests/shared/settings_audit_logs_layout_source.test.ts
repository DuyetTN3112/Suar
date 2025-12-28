import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const settingsAuditLogSources = [
  {
    sourcePath: 'inertia/apps/user/modules/settings/audit_logs.svelte',
    layoutImport: "import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'",
    layoutTag: 'AppLayout',
    pageTag: '<AuditLogPage',
    pageSourcePath: 'inertia/apps/user/modules/audit_logs/audit_log_page.svelte',
  },
  {
    sourcePath: 'inertia/apps/org/modules/settings/audit_logs.svelte',
    layoutImport: "import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'",
    layoutTag: 'OrganizationLayout',
    pageTag: '<UserAuditLogPage',
    pageSourcePath: 'inertia/apps/org/modules/audit_logs/user_audit_log_page.svelte',
  },
] as const

function readSource(sourcePath: string): string {
  return readFileSync(resolve(process.cwd(), sourcePath), 'utf8')
}

describe('settings audit log layout source guard', () => {
  it('delegates layout ownership to the scoped activity page', () => {
    for (const { sourcePath, layoutImport, layoutTag, pageTag } of settingsAuditLogSources) {
      const source = readSource(sourcePath)

      expect(source).toContain(pageTag)
      expect(source).not.toContain(layoutImport)
      expect(source).not.toContain(`<${layoutTag}`)
      expect(source).not.toContain(`</${layoutTag}>`)
    }
  })

  it('does not ship forensic fields to personal activity pages', () => {
    for (const { pageSourcePath } of settingsAuditLogSources) {
      const source = readSource(pageSourcePath)

      for (const forbiddenField of [
        'AdminAuditLogItem',
        'Raw payload',
        'requestId',
        'traceId',
        'ipAddress',
        'userAgent',
        'details.oldValues',
        'details.newValues',
      ]) {
        expect(source).not.toContain(forbiddenField)
      }
    }
  })
})
