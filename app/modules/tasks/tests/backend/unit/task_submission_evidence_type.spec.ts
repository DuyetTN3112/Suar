import { test } from '@japa/runner'

import AddTaskSubmissionEvidenceCommand from '#modules/tasks/actions/commands/task-submissions/add_task_submission_evidence_command'
import SubmitTaskSubmissionCommand from '#modules/tasks/actions/commands/task-submissions/submit_task_submission_command'
import {
  isTaskSubmissionEvidenceType,
  TASK_SUBMISSION_EVIDENCE_TYPES,
} from '#modules/tasks/domain/task-submissions/task_submission_rules'

test.group('Unit | Task submission evidence types', () => {
  test('accepts every canonical evidence type', ({ assert }) => {
    for (const evidenceType of TASK_SUBMISSION_EVIDENCE_TYPES) {
      assert.isTrue(isTaskSubmissionEvidenceType(evidenceType))
    }
  })

  test('rejects values outside the runtime contract', ({ assert }) => {
    for (const value of ['source_code', '', null, undefined, 1, {}]) {
      assert.isFalse(isTaskSubmissionEvidenceType(value))
    }
  })

  test('add-evidence command rejects an invalid runtime type before dependency work', async ({
    assert,
  }) => {
    const command = new AddTaskSubmissionEvidenceCommand({} as never, {} as never)

    await assert.rejects(
      () =>
        command.execute({
          submission_id: 'submission-1',
          evidence_type: 'source_code' as never,
          url: 'https://example.com/evidence',
        }),
      /Unsupported task submission evidence type/
    )
  })

  test('submit command rejects an invalid runtime type before transaction work', async ({
    assert,
  }) => {
    const command = new SubmitTaskSubmissionCommand(
      {} as never,
      {} as never,
      {} as never,
      {} as never
    )

    await assert.rejects(
      () =>
        command.execute({
          task_id: 'task-1',
          summary: 'Summary',
          submit: true,
          evidences: [
            {
              evidence_type: 'source_code' as never,
              url: 'https://example.com/evidence',
            },
          ],
        }),
      /Unsupported task submission evidence type/
    )
  })
})
