import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildMarketplaceApplicationRouteRequest,
  buildMarketplaceMatchScoreRouteRequest,
  buildMarketplaceTaskRouteRequest,
} from '#modules/marketplace/controllers/mappers/request/marketplace-application/marketplace_route_request_mapper'

test.group('Unit | Marketplace route request mapper', () => {
  test('trims a valid marketplace task route id', ({ assert }) => {
    assert.deepEqual(buildMarketplaceTaskRouteRequest({ taskId: ' task-1 ' }), {
      taskId: 'task-1',
    })
  })

  test('rejects non-string or missing marketplace task route ids', ({ assert }) => {
    for (const params of [{ taskId: 42 }, { taskId: null }, {}, null]) {
      assert.throws(() => buildMarketplaceTaskRouteRequest(params), ValidationException)
    }
  })

  test('trims a valid marketplace application route id', ({ assert }) => {
    assert.deepEqual(buildMarketplaceApplicationRouteRequest({ applicationId: ' app-1 ' }), {
      applicationId: 'app-1',
    })
  })

  test('rejects non-string or missing marketplace application route ids', ({ assert }) => {
    for (const params of [{ applicationId: 42 }, { applicationId: '' }, {}, undefined]) {
      assert.throws(() => buildMarketplaceApplicationRouteRequest(params), ValidationException)
    }
  })

  test('maps both route ids required by the match score endpoint', ({ assert }) => {
    assert.deepEqual(
      buildMarketplaceMatchScoreRouteRequest({
        taskId: ' task-1 ',
        applicationId: ' application-1 ',
      }),
      { taskId: 'task-1', applicationId: 'application-1' }
    )
  })

  test('rejects incomplete match score route params', ({ assert }) => {
    for (const params of [
      { taskId: 'task-1' },
      { applicationId: 'application-1' },
      { taskId: 42, applicationId: 'application-1' },
      { taskId: 'task-1', applicationId: [] },
    ]) {
      assert.throws(() => buildMarketplaceMatchScoreRouteRequest(params), ValidationException)
    }
  })
})
