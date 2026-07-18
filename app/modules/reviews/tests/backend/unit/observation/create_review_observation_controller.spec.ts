import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import type { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import CreateReviewObservationController from '#modules/reviews/controllers/observation/create_review_observation_controller'
import { REVIEW_OBSERVATION_V1_FIXTURE } from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'

test.group('Create review observation controller', () => {
  test('executes the observation command and redirects to the review task room', async ({ assert }) => {
    const calls: string[] = []
    let redirectPath: string | null = null
    const actions = {
      makeCreateReviewObservationCommand() {
        return {
          executeAndWrap() {
            calls.push('execute')
            return Promise.resolve(Result.ok({ observationId: 'observation-1' }))
          },
        }
      },
    } as unknown as ReviewActionFactory

    const ctx = {
      params: { workflowId: REVIEW_OBSERVATION_V1_FIXTURE.reviewWorkflowId },
      auth: { user: { id: REVIEW_OBSERVATION_V1_FIXTURE.reviewerId, current_organization_id: 'org-1' } },
      currentOrganizationId: 'org-1',
      request: {
        all: () => ({
          idempotencyKey: 'obs-1',
          completionReportId: '00000000-0000-4000-8000-000000000001',
          completionClaimId: null,
          evidenceSufficiency: 'adequate',
          rationaleClassification: 'internal',
          observation: REVIEW_OBSERVATION_V1_FIXTURE,
          evidenceRelations: [
            { evidenceId: REVIEW_OBSERVATION_V1_FIXTURE.evidenceRefs[0], relation: 'supports' },
          ],
        }),
        input: (name: string) =>
          ({
            project_id: 'project-1',
            task_id: 'task-1',
            redirect_to: '/projects/project-1/reviews/tasks?task_id=task-1',
          })[name],
        ip: () => '127.0.0.1',
        header: () => 'test-agent',
      },
      session: { flash() {} },
      response: {
        redirect() {
          return { toPath: (path: string) => { redirectPath = path } }
        },
      },
    }

    await new CreateReviewObservationController(actions).handle(ctx as never)

    assert.deepEqual(calls, ['execute'])
    assert.equal(redirectPath, '/projects/project-1/reviews/tasks?task_id=task-1')
  })
})
