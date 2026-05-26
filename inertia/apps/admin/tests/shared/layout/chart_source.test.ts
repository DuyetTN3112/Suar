import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const sourcePath = resolve(
  process.cwd(),
  'inertia/apps/admin/shared/components/charts/ibcs_column_chart.svelte'
)

describe('admin chart source', () => {
  it('keeps mobile labels readable instead of breaking every word fragment', () => {
    const source = readFileSync(sourcePath, 'utf8')

    expect(source).toContain('width: max-content')
    expect(source).toContain('max-width: 4rem')
    expect(source).toContain('overflow-wrap: normal')
    expect(source).toContain('word-break: normal')
    expect(source).not.toContain('overflow-wrap: anywhere')
  })
})
