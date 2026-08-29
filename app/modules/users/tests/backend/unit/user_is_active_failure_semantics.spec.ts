import { test } from '@japa/runner'

import User from '#modules/users/infra/models/profile/user'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import { UserRepositoryImpl } from '#modules/users/infra/repositories/profile/user_repository_impl'

test.group('User active-query failure semantics', () => {
  test('both query implementations propagate database failures instead of reporting inactive', async ({
    assert,
  }) => {
    const databaseFailure = new Error('simulated user database outage')
    const ownQueryDescriptor = Object.getOwnPropertyDescriptor(User, 'query')

    Object.defineProperty(User, 'query', {
      configurable: true,
      value: () => {
        throw databaseFailure
      },
    })

    try {
      await assert.rejects(
        () => userModelQueries.isActive('user-id'),
        /simulated user database outage/
      )
      await assert.rejects(
        () => new UserRepositoryImpl().isActive('user-id'),
        /simulated user database outage/
      )
    } finally {
      if (ownQueryDescriptor) {
        Object.defineProperty(User, 'query', ownQueryDescriptor)
      } else {
        Reflect.deleteProperty(User, 'query')
      }
    }
  })
})
