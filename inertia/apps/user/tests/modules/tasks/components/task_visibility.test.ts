import { describe, expect, it } from 'vitest'

import {
  getTaskVisibilityAssignmentRule,
  getTaskVisibilityDescription,
  getTaskVisibilityLabel,
  getTaskVisibilityMarketplaceRule,
} from '@/apps/user/modules/tasks/lib/rules/task_visibility'

describe('task visibility helpers', () => {
  it('explains internal scope as organization-wide but not marketplace-facing', () => {
    expect(getTaskVisibilityLabel('internal')).toBe('Organization only')
    expect(getTaskVisibilityDescription('internal')).toMatch(/outside the project/i)
    expect(getTaskVisibilityAssignmentRule('internal')).toMatch(/any organization member/i)
    expect(getTaskVisibilityMarketplaceRule('internal')).toMatch(/no marketplace listing/i)
  })

  it('explains external and hybrid as marketplace-facing modes', () => {
    expect(getTaskVisibilityLabel('external')).toBe('Marketplace')
    expect(getTaskVisibilityDescription('external')).toMatch(/outside the organization/i)
    expect(getTaskVisibilityMarketplaceRule('external')).toMatch(/outside the organization/i)

    expect(getTaskVisibilityLabel('all')).toBe('Hybrid: internal + marketplace')
    expect(getTaskVisibilityDescription('all')).toMatch(/close to Marketplace/i)
    expect(getTaskVisibilityAssignmentRule('all')).toMatch(/close to Marketplace/i)
  })
})
