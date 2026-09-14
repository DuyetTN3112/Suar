import { describe, expect, it } from 'vitest'

import { isNavUrlActive } from '@/apps/user/shared/components/navigation_helpers'

describe('project navigation active state', () => {
  it('does not keep the project overview active when a project focus tab is selected', () => {
    expect(isNavUrlActive('/projects/project-1?focus=roles', '/projects/project-1')).toBe(false)
    expect(isNavUrlActive('/projects/project-1?focus=roles', '/projects/project-1?focus=roles')).toBe(true)
  })
})
