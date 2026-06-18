import { test } from '@japa/runner'

import OrganizationConsumerPortsProvider from '#composition/organizations/administration/organization_consumer_ports_provider'
import { OrganizationUserReaderWriter } from '#modules/organizations/actions/ports/outbound/access/organization_external_dependencies'

test('registers the organization resolver user dependency', ({ assert }) => {
  const registrations = new Map<unknown, () => unknown>()
  const app = {
    container: {
      singleton(token: unknown, factory: () => unknown) {
        registrations.set(token, factory)
      },
    },
  }

  new OrganizationConsumerPortsProvider(app as never).register()

  const factory = registrations.get(OrganizationUserReaderWriter)
  assert.isFunction(factory)

  const dependency = factory?.() as { updateCurrentOrganization?: unknown }
  assert.isFunction(dependency.updateCurrentOrganization)
})
