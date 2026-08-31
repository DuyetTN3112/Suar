import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationPortfolioQueryFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_portfolio_query_factory'
import ShowOrganizationApiController from '#modules/organizations/controllers/directory/show_organization_api_controller'
import type { OrganizationProjectDetailQueryFactory } from '#modules/organizations/actions/ports/inbound/projects/organization_project_detail_query_factory'
import OrgShowProjectController from '#modules/organizations/controllers/projects/show_project_controller'

test.group('Organization detail query Result boundaries', () => {
  test('organization detail API unwraps the query Result contract', async ({ assert }) => {
    const failure = new NotFoundException('Organization not found')
    const queries = {
      makeDetail: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationPortfolioQueryFactory
    const ctx = {
      auth: { user: { id: 'user-1' } },
      params: { organizationId: 'org-1' },
      request: { ip: () => '127.0.0.1', header: () => 'unit-test' },
      session: { get: () => undefined },
    }

    let thrown: unknown
    try {
      await new ShowOrganizationApiController(queries).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('project detail page unwraps the query Result contract', async ({ assert }) => {
    const failure = new NotFoundException('Project not found')
    const queries = {
      make: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationProjectDetailQueryFactory
    const ctx = {
      params: { projectId: 'project-1' },
      request: { input: () => undefined, ip: () => '127.0.0.1', header: () => 'unit-test' },
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
      session: { get: () => undefined },
      response: { redirect: () => undefined },
    }

    let thrown: unknown
    try {
      await new OrgShowProjectController(queries).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
