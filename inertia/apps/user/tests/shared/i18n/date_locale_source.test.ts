import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const dateLocaleConsumers = [
  'inertia/apps/user/shared/components/layout/notification_dropdown.svelte',
  'inertia/apps/org/shared/components/layout/notification_dropdown.svelte',
  'inertia/apps/admin/shared/components/layout/notification_dropdown.svelte',
  'inertia/apps/user/modules/notifications/index.svelte',
  'inertia/apps/org/modules/notifications/index.svelte',
  'inertia/apps/user/modules/projects/components/project_create_foundation_step.svelte',
  'inertia/apps/org/modules/projects/components/project_create_foundation_step.svelte',
  'inertia/apps/user/modules/profile/invitations.svelte',
  'inertia/apps/org/modules/profile/invitations.svelte',
  'inertia/apps/user/modules/tasks/utils/task_formatter.svelte.ts',
  'inertia/apps/org/modules/tasks/utils/task_formatter.svelte.ts',
] as const

function readSource(sourcePath: string): string {
  return readFileSync(resolve(process.cwd(), sourcePath), 'utf8')
}

describe('date locale source guard', () => {
  it('keeps date-fns formatting tied to the active app locale', () => {
    for (const sourcePath of dateLocaleConsumers) {
      const source = readSource(sourcePath)

      expect(source).toContain('dateFnsLocale')
      expect(source).not.toContain('locale: vi')
      expect(source).not.toContain("from 'date-fns/locale'")
    }
  })
})
