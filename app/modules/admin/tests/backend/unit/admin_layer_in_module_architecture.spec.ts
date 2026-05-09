import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { test } from '@japa/runner'

const ADMIN_FEATURES = [
  'audit_logs',
  'dashboard',
  'disputes',
  'organizations',
  'packages',
  'permissions',
  'proficiency',
  'reviews',
  'users',
] as const

test.group('Unit | Admin layer-in-module architecture', () => {
  test('keeps command and query bases local to every feature module', ({ assert }) => {
    const adminRoot = join(process.cwd(), 'app/modules/admin')

    for (const feature of ADMIN_FEATURES) {
      const featureRoot = join(adminRoot, feature)

      assert.isTrue(
        existsSync(join(featureRoot, `actions/commands/${feature}/base_command.ts`)),
        `${feature} must own actions/command/base_command.ts`
      )
      assert.isTrue(
        existsSync(join(featureRoot, `actions/queries/${feature}/base_query.ts`)),
        `${feature} must own actions/query/base_query.ts`
      )
    }
  })

  test('does not expose layer-first or shared roots', ({ assert }) => {
    const adminRoot = join(process.cwd(), 'app/modules/admin')

    assert.isFalse(existsSync(join(adminRoot, 'actions')))
    assert.isFalse(existsSync(join(adminRoot, 'controllers')))
    assert.isFalse(existsSync(join(adminRoot, 'shared')))
  })
})
