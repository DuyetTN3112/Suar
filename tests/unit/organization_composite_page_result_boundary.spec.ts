import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationPortfolioQueryFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_portfolio_query_factory'
import ListOrganizationsController from '#modules/organizations/controllers/directory/list_organizations_controller'
import ShowOrganizationController from '#modules/organizations/controllers/directory/show_organization_controller'

const makeContext = () => ({
  auth: { user: { id: 'user-1' } },
  request: {
    input: (_key: string, fallback?: unknown) => fallback,
    ip: () => '127.0.0.1',
    header: () => 'unit-test',
  },
  session: { get: () => undefined },
  inertia: { render: () => undefined },
  params: { organizationId: 'org-1' },
})

test.group('Organization composite page Result boundaries', () => {
  test('show page controller unwraps the composite query Result contract', async ({ assert }) => {
    const failure = new NotFoundException('Organization not found')
    const queries = {
      makeShowPage: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationPortfolioQueryFactory

    let thrown: unknown
    try {
      await new ShowOrganizationController(queries).handle(makeContext() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('list page controller unwraps the composite query Result contract', async ({ assert }) => {
    const failure = new NotFoundException('Organization list unavailable')
    const queries = {
      makeIndexPage: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationPortfolioQueryFactory

    let thrown: unknown
    try {
      await new ListOrganizationsController(queries).handle(makeContext() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
