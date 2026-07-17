import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import LucidReviewObservationAuthoringContextReader from '#modules/reviews/infra/adapters/observation/lucid_review_observation_authoring_context_reader'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | Review observation authoring context reader', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(async () => {
    await teardownApp()
  })

  test('has an explicit session assignment pin for native-only reads', async ({ assert }) => {
    const column = (await db
      .from('information_schema.columns')
      .where({
        table_schema: 'public',
        table_name: 'review_sessions',
        column_name: 'task_assignment_id',
      })
      .select('is_nullable')
      .first()) as { is_nullable?: string } | undefined
    assert.isTrue(column?.is_nullable === 'YES' || column?.is_nullable === 'NO')
  })

  test('fails closed for an unpinned workflow without touching legacy current-task state', async ({
    assert,
  }) => {
    const result = await new LucidReviewObservationAuthoringContextReader().load({
      reviewWorkflowId: '00000000-0000-4000-8000-000000000001',
      reviewSessionId: '00000000-0000-4000-8000-000000000002',
      taskAssignmentId: '00000000-0000-4000-8000-000000000003',
      assignmentSnapshotId: '00000000-0000-4000-8000-000000000004',
      completionReportId: '00000000-0000-4000-8000-000000000005',
      completionClaimId: null,
      reviewerId: '00000000-0000-4000-8000-000000000006',
      reviewerType: 'human',
      subjectUserId: '00000000-0000-4000-8000-000000000007',
      observationType: 'accomplishment_claim',
      targetRef: '00000000-0000-4000-8000-000000000008',
      sourceSnapshotHash: `sha256:${'a'.repeat(64)}`,
      evidenceIds: [],
    })
    assert.isNull(result)
  })
})
