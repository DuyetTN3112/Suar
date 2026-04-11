import { test } from '@japa/runner'

import { getSeededTaskSpecs } from '../../../../../seed/demo_data/task_specs.js'

test.group('Seed task specs', () => {
  test('default seed skips generated bulk tasks', ({ assert }) => {
    const specs = getSeededTaskSpecs()

    assert.isFalse(specs.some((spec) => spec.key.includes('-bulk-')))
  })

  test('dense seed opt-in includes generated bulk tasks', ({ assert }) => {
    const specs = getSeededTaskSpecs({ dense: true })

    assert.isTrue(specs.some((spec) => spec.key.includes('-bulk-')))
  })
})
