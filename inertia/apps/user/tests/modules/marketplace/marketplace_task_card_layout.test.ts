import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const cardSources = [
  'inertia/apps/user/modules/marketplace/components/marketplace_task_card.svelte',
  'inertia/apps/org/modules/marketplace/components/marketplace_task_card.svelte',
]

describe('MarketplaceTaskCard layout source', () => {
  it('keeps marketplace actions in the main content column', () => {
    for (const sourcePath of cardSources) {
      const source = readFileSync(resolve(process.cwd(), sourcePath), 'utf8')

      expect(source).not.toContain('xl:grid-cols-[minmax(0,1fr)_260px]')
      expect(source).not.toContain('<aside')
      expect(source).not.toContain("task.marketplace_card.join")
    }
  })
})
