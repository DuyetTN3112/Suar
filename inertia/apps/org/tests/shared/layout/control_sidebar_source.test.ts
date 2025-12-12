import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const sourcePath = resolve(
  process.cwd(),
  'inertia/apps/org/shared/components/layout/control_sidebar.svelte'
)

describe('org control sidebar source', () => {
  it('keeps mobile off-canvas behavior for the organization shell', () => {
    const source = readFileSync(sourcePath, 'utf8')

    expect(source).toContain('@media (max-width: 900px)')
    expect(source).toContain('transform: translateX(-108%)')
    expect(source).toContain('.control-sidebar[data-open="true"]')
  })
})
