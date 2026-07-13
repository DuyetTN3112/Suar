import { test } from '@japa/runner'

import { REVIEW_OBSERVATION_V1_FIXTURE } from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildCreateReviewObservationDTO } from '#modules/reviews/controllers/mappers/request/observation/create_review_observation_request_mapper'

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const context = (body: Record<string, unknown>) => ({ request: { all: () => body } }) as never

test.group('Create review observation request mapper', () => {
  test('maps the versioned observation envelope and exact evidence relations', ({ assert }) => {
    const dto = buildCreateReviewObservationDTO(
      context({
        idempotencyKey: 'obs-1',
        completionReportId: '00000000-0000-4000-8000-000000000001',
        completionClaimId: null,
        evidenceSufficiency: 'adequate',
        rationaleClassification: 'internal',
        observation: REVIEW_OBSERVATION_V1_FIXTURE,
        evidenceRelations: [{ evidenceId: REVIEW_OBSERVATION_V1_FIXTURE.evidenceRefs[0], relation: 'supports' }],
      })
    )

    assert.equal(dto.idempotencyKey, 'obs-1')
    assert.deepEqual(dto.evidenceRelations, [{ evidenceId: REVIEW_OBSERVATION_V1_FIXTURE.evidenceRefs[0], relation: 'supports' }])
    assert.equal(dto.observation.schemaVersion, 'suar.review_observation.v1')
  })

  test('reports canonical indexed issues for malformed envelope entries', ({ assert }) => {
    try {
      buildCreateReviewObservationDTO(
        context({
          idempotencyKey: 42,
          completionReportId: 'not-a-uuid',
          observation: {},
          evidenceRelations: [{ evidenceId: 42, relation: 'invalid' }],
        })
      )
      assert.fail('Expected malformed observation envelope to be rejected')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.deepEqual((error as ValidationException).issues.map((issue) => issue.path), [
        'observation.schemaVersion',
        'observation',
        'evidenceRelations.0.relation',
        'evidenceRelations.0.evidenceId',
        'idempotencyKey',
        'completionReportId',
        'evidenceSufficiency',
        'rationaleClassification',
      ])
    }
  })
})

