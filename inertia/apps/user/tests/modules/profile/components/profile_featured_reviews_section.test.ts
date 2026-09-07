import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const sourcePath = resolve(
  process.cwd(),
  'inertia/apps/user/modules/profile/components/profile_featured_reviews_section.svelte'
)

describe('ProfileFeaturedReviewsSection layout source', () => {
  it('keeps review lanes and their cards aligned when content heights differ', () => {
    const source = readFileSync(sourcePath, 'utf8')

    expect(source).toContain('lg:items-stretch')
    expect(source).toContain('flex h-full flex-col')
    expect(source).toContain('min-h-[168px]')
    expect(source).toContain('mt-auto')
    expect(source).toContain('min-h-[72px]')
  })
})
