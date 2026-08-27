import { test } from '@japa/runner'

import { getSeededTaskSpecs } from '../../app/seed/demo_data/task_specs.js'
import { shouldSeedTaskSubmission } from '../../app/seed/demo_data/task_submission_seeder.js'

test.group('Demo task governance seed', () => {
  test('does not create submission fixtures for ordinary assignments', ({ assert }) => {
    const specs = getSeededTaskSpecs({ dense: true })
    const ordinarySpecs = specs.filter((spec) => !spec.seedGovernanceFixture)

    assert.isAbove(ordinarySpecs.length, 0)
    assert.isFalse(ordinarySpecs.some((spec) => shouldSeedTaskSubmission(spec)))
  })

  test('keeps submission fixtures limited to explicit governance scenarios', ({ assert }) => {
    const specs = getSeededTaskSpecs({ dense: true })
    const governanceSpecs = specs.filter((spec) => spec.seedGovernanceFixture)

    assert.deepEqual(
      governanceSpecs.map((spec) => spec.key),
      ['member-profile-proof', 'owner-evidence-architecture', 'owner-review-dispute-case']
    )
    assert.isTrue(governanceSpecs.every((spec) => shouldSeedTaskSubmission(spec)))
  })

  test('seeds the design-system empty-state task as final Done', ({ assert }) => {
    const spec = getSeededTaskSpecs({ dense: true }).find(
      (item) => item.title === 'Hoàn thiện trạng thái rỗng cho bảng đánh giá'
    )

    assert.exists(spec)
    assert.equal(spec?.taskStatus, 'done')
    assert.equal(spec?.status, 'done')
  })
})
