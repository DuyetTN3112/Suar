import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildAcknowledgeTaskAssignmentInput,
  buildRequestTaskAssignmentClarificationInput,
} from '#modules/tasks/controllers/mappers/request/task-assignment/task_assignment_interaction_request_mapper'

const ASSIGNMENT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

test.group('', () => {
  test('maps a canonical acknowledgement input', ({ assert }) => {
    assert.deepEqual(
      buildAcknowledgeTaskAssignmentInput(
        { assignmentId: ASSIGNMENT_ID },
        {
          assignmentId: ASSIGNMENT_ID,
          snapshotId: 'snapshot-1',
          snapshotHash: 'sha256:abc',
          contractVersionHead: 2,
          idempotencyKey: 'ack-1',
        }
      ),
      {
        assignmentId: ASSIGNMENT_ID,
        snapshotId: 'snapshot-1',
        snapshotHash: 'sha256:abc',
        contractVersionHead: 2,
        idempotencyKey: 'ack-1',
      }
    )
  })

  test('aggregates route mismatch and wrong-type issues before the command boundary', ({ assert }) => {
    try {
      buildRequestTaskAssignmentClarificationInput(
        { assignmentId: ASSIGNMENT_ID },
        { assignmentId: 'other', contractVersionHead: '2', reason: 42 }
      )
      assert.fail('Expected malformed assignment interaction input to be rejected')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.deepEqual((error as ValidationException).issues.map((issue) => issue.path), [
        'assignmentId',
        'contractVersionHead',
        'snapshotId',
        'snapshotHash',
        'idempotencyKey',
        'reason',
      ])
    }
  })


})
