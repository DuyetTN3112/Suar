import { test } from '@japa/runner'

import { getOrdinaryTaskReviewSeedState } from '../../../../../seed/demo_data/task_review_workflow_seeder.js'

test.group('Task review workflow seed policy', () => {
  test('keeps every completed task newly imported into awaiting review', ({ assert }) => {
    assert.deepEqual(getOrdinaryTaskReviewSeedState(), {
      status: 'awaiting_review',
      completedReviewCount: 0,
    })
  })
})
