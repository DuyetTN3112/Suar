import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildAddTaskSubmissionEvidenceRequest,
  buildDeleteTaskSubmissionEvidenceRequest,
  buildListTaskSubmissionEvidenceRequest,
} from '#modules/tasks/controllers/mappers/request/task-submissions/task_submission_evidence_request_mapper'

test.group('', () => {
  test('maps canonical and legacy evidence fields', ({ assert }) => {
    assert.deepEqual(
      buildAddTaskSubmissionEvidenceRequest(
        { submissionId: ' submission-1 ' },
        {
          evidence_type: 'pull_request',
          url: 'https://example.test/evidence',
          title: 'Demo',
          description: null,
        }
      ),
      {
        submission_id: 'submission-1',
        evidence_type: 'pull_request',
        url: 'https://example.test/evidence',
        title: 'Demo',
        description: null,
      }
    )
  })

  test('rejects malformed evidence route and body values before the command boundary', ({ assert }) => {
    const invalidInputs: Array<[unknown, unknown]> = [
      [{}, { evidenceType: 'pull_request', url: 'https://example.test' }],
      [{ submissionId: 42 }, { evidenceType: 'pull_request', url: 'https://example.test' }],
      [{ submissionId: 'submission-1' }, { evidenceType: 'unknown', url: 'https://example.test' }],
      [{ submissionId: 'submission-1' }, { evidenceType: 'pull_request', url: '' }],
      [{ submissionId: 'submission-1' }, { evidenceType: 'pull_request', url: 42 }],
      [{ submissionId: 'submission-1' }, { evidenceType: 'pull_request', url: 'https://example.test', title: 42 }],
    ]

    for (const [params, payload] of invalidInputs) {
      assert.throws(
        () => buildAddTaskSubmissionEvidenceRequest(params, payload),
        ValidationException
      )
    }
  })

  test('requires both route identifiers when deleting evidence', ({ assert }) => {
    assert.deepEqual(
      buildDeleteTaskSubmissionEvidenceRequest({
        submissionId: ' submission-1 ',
        evidenceId: ' evidence-1 ',
      }),
      { evidence_id: 'evidence-1' }
    )

    assert.throws(
      () => buildDeleteTaskSubmissionEvidenceRequest({ submissionId: 'submission-1' }),
      ValidationException
    )
    assert.throws(
      () =>
        buildDeleteTaskSubmissionEvidenceRequest({
          submissionId: 'submission-1',
          evidenceId: '',
        }),
      ValidationException
    )
  })

  test('maps the submission route for the evidence index query', ({ assert }) => {
    assert.deepEqual(
      buildListTaskSubmissionEvidenceRequest({ submissionId: ' submission-1 ' }),
      { submissionId: 'submission-1' }
    )
  })

  test('rejects malformed submission route params before the evidence query', ({ assert }) => {
    for (const params of [{}, { submissionId: 42 }, { submissionId: null }, { submissionId: '' }]) {
      assert.throws(() => buildListTaskSubmissionEvidenceRequest(params), ValidationException)
    }
  })


})
