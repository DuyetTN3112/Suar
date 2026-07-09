import { describe, expect, it } from 'vitest'

import {
  getTaskVisibilityAssignmentRule,
  getTaskVisibilityDescription,
  getTaskVisibilityLabel,
  getTaskVisibilityMarketplaceRule,
} from '@/apps/user/modules/tasks/lib/rules/task_visibility'

describe('task visibility helpers', () => {
  it('explains internal scope as organization-wide but not marketplace-facing', () => {
    expect(getTaskVisibilityLabel('internal')).toBe('Chỉ trong tổ chức')
    expect(getTaskVisibilityDescription('internal')).toMatch(/ngoài project/i)
    expect(getTaskVisibilityAssignmentRule('internal')).toMatch(/bất kỳ thành viên tổ chức/i)
    expect(getTaskVisibilityMarketplaceRule('internal')).toMatch(/không có listing marketplace/i)
  })

  it('explains external and hybrid as marketplace-facing modes', () => {
    expect(getTaskVisibilityLabel('external')).toBe('Marketplace')
    expect(getTaskVisibilityDescription('external')).toMatch(/ngoài tổ chức/i)
    expect(getTaskVisibilityMarketplaceRule('external')).toMatch(/public cho bên ngoài tổ chức/i)

    expect(getTaskVisibilityLabel('all')).toBe('Hybrid: nội bộ + marketplace')
    expect(getTaskVisibilityDescription('all')).toMatch(/gần giống Marketplace/i)
    expect(getTaskVisibilityAssignmentRule('all')).toMatch(/gần giống Marketplace/i)
  })
})
