import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import AllOrganizationsController from '#modules/organizations/controllers/directory/all_organizations_controller'
import ApiListOrganizationsController from '#modules/organizations/controllers/directory/api_list_organizations_controller'
import ShowOrganizationController from '#modules/organizations/controllers/directory/show_organization_controller'

function requestWithValues(values: Record<string, unknown>) {
  return {
    input: (key: string, defaultValue?: unknown) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : defaultValue,
    header: () => null,
    ip: () => '127.0.0.1',
  }
}

test.group('Unit | Organization directory controller validation', () => {
  test('api list controller rejects invalid q before query execution', async ({ assert }) => {
    const controller = new ApiListOrganizationsController({
      makeAllOrganizationsQuery: () => {
        throw new Error('query_must_not_run')
      },
    } as never)

    for (const q of ['x'.repeat(201), ['bad']]) {
      await assert.rejects(
        () => controller.handle({ request: requestWithValues({ q }) } as never),
        ValidationException
      )
    }
  })

  test('show controller rejects an empty organization route id before query execution', async ({
    assert,
  }) => {
    const controller = new ShowOrganizationController({
      makeShowPage: () => {
        throw new Error('query_must_not_run')
      },
    } as never)

    await assert.rejects(
      () =>
        controller.handle({
          auth: { user: { id: 'user-1' } },
          params: { organizationId: '   ' },
          request: requestWithValues({}),
          session: { get: () => null },
          inertia: { render: () => undefined },
        } as never),
      ValidationException
    )
  })

  test('all-organizations controller rejects an oversized search before query execution', async ({
    assert,
  }) => {
    const controller = new AllOrganizationsController({
      makeAllOrganizationsQuery: () => {
        throw new Error('query_must_not_run')
      },
    } as never)

    for (const search of ['x'.repeat(201), ['bad']]) {
      await assert.rejects(
        () =>
          controller.handle({
            auth: { user: { id: 'user-1' } },
            request: requestWithValues({ search }),
            session: { get: () => null },
            inertia: { render: () => undefined },
            currentOrganizationId: null,
            currentOrganizationRole: null,
          } as never),
        ValidationException
      )
    }
  })

  test('show controller rejects invalid pagination aliases before query execution', async ({
    assert,
  }) => {
    const controller = new ShowOrganizationController({
      makeShowPage: () => {
        throw new Error('query_must_not_run')
      },
    } as never)

    for (const values of [{ perPage: '0' }, { per_page: '101' }, { limit: ['bad'] }]) {
      await assert.rejects(
        () =>
          controller.handle({
            auth: { user: { id: 'user-1' } },
            params: { organizationId: 'org-1' },
            request: requestWithValues(values),
            session: { get: () => null },
            inertia: { render: () => undefined },
          } as never),
        ValidationException
      )
    }
  })
})
