import { readFileSync } from 'node:fs'

import { test } from '@japa/runner'

const PUBLIC_BARREL = 'app/modules/observability/public_contracts/platform_observability.ts'

test.group('Architecture | Observability public surface', () => {
  test('does not export concrete logger classes or runtime singleton instances', ({ assert }) => {
    const source = readFileSync(PUBLIC_BARREL, 'utf8')

    assert.notMatch(source, /export\s+(?:default\s+)?class\s+Platform(?:Audit|Operational|Workflow)Logger/)
    assert.notMatch(source, /new\s+Platform(?:Audit|Operational|Workflow)Logger/)
  })
})
