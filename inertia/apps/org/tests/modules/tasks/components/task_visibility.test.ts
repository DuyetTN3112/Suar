import { describe, expect, it } from 'vitest'

import {
  getTaskVisibilityAssignmentRule,
  getTaskVisibilityDescription,
  getTaskVisibilityLabel,
  getTaskVisibilityMarketplaceRule,
} from '@/apps/org/modules/tasks/lib/rules/task_visibility'

describe('task visibility helpers', () => {
  it('explains project and organization scopes separately', () => {
    expect(getTaskVisibilityLabel('project')).toBe('Project only')
    expect(getTaskVisibilityDescription('project')).toMatch(/project members/i)
    expect(getTaskVisibilityLabel('internal')).toBe('Entire organization')
    expect(getTaskVisibilityDescription('internal')).toMatch(/organization/i)
    expect(getTaskVisibilityAssignmentRule('internal')).toMatch(/organization members/i)
    expect(getTaskVisibilityMarketplaceRule('internal')).toMatch(/no public marketplace listing/i)
  })

  it('explains external and hybrid as marketplace-facing modes', () => {
    expect(getTaskVisibilityLabel('external')).toBe('Marketplace')
    expect(getTaskVisibilityDescription('external')).toMatch(/outside the organization/i)
    expect(getTaskVisibilityMarketplaceRule('external')).toMatch(/outside the organization/i)

    expect(getTaskVisibilityLabel('all')).toBe('Organization + outside contributors via Marketplace')
    expect(getTaskVisibilityDescription('all')).toMatch(/organization.*people outside the organization/i)
    expect(getTaskVisibilityAssignmentRule('all')).toMatch(/organization members/i)
  })
})
