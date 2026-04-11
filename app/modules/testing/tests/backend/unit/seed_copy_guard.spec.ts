import { test } from '@japa/runner'

import { SEED_ORGANIZATIONS_SPECS } from '../../../../../seed/demo_data/organization_seeds_specs.js'
import { assertNoBannedSeedCopy, collectVisibleSeedCopy } from '../../../../../seed/demo_data/seed_copy_guard.js'
import { getSeededTaskSpecs } from '../../../../../seed/demo_data/task_specs.js'
import { SEED_USERS_SPECS } from '../../../../../seed/demo_data/user_seeds_specs.js'

test.group('Seed copy guard', () => {
  test('rejects visible copy that exposes seed/test scaffolding', ({ assert }) => {
    assert.throws(
      () =>
        assertNoBannedSeedCopy([
          {
            source: 'tasks.description',
            key: 'bad-copy',
            text: 'Seed scenario visible to local QA.',
          },
        ]),
      /bad-copy/
    )
  })

  test('current visible demo copy is product-realistic', () => {
    assertNoBannedSeedCopy(
      collectVisibleSeedCopy({
        organizations: SEED_ORGANIZATIONS_SPECS,
        users: SEED_USERS_SPECS,
        tasks: getSeededTaskSpecs({ dense: true }),
      })
    )
  })
})
