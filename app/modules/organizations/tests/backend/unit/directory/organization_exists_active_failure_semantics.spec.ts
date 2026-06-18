import { test } from '@japa/runner'

import Organization from '#modules/organizations/infra/models/directory/organization'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/directory/organization_repository'

test.group('OrganizationRepository.existsActive failure semantics', () => {
  test('propagates database failures instead of reporting that the organization is absent', async ({
    assert,
  }) => {
    const databaseFailure = new Error('simulated organization database outage')
    const ownQueryDescriptor = Object.getOwnPropertyDescriptor(Organization, 'query')

    Object.defineProperty(Organization, 'query', {
      configurable: true,
      value: () => {
        throw databaseFailure
      },
    })

    try {
      await assert.rejects(
        () => OrganizationRepository.existsActive('organization-id'),
        /simulated organization database outage/
      )
    } finally {
      if (ownQueryDescriptor) {
        Object.defineProperty(Organization, 'query', ownQueryDescriptor)
      } else {
        Reflect.deleteProperty(Organization, 'query')
      }
    }
  })
})
