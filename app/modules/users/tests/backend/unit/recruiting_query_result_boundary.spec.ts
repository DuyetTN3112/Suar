import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import { SearchDiscoveryError } from '#modules/search/public_contracts/search_discovery_contract'
import { TalentDiscoveryRequestError } from '#modules/users/actions/mappers/talent-discovery/talent_discovery_request_builder'
import { UserTalentQueryFactory } from '#modules/users/actions/ports/inbound/user_talent_query_factory'
import SearchRecruitingTalentsQuery from '#modules/users/actions/queries/search/search_recruiting_talents_query'
import OrgTalentsPageController from '#modules/users/controllers/recruiting/org_talents_page_controller'
import TalentDetailController from '#modules/users/controllers/recruiting/talent_detail_controller'

const context = () => ({
  auth: { user: { id: 'recruiter-1' } },
  params: { userId: 'talent-1' },
  request: {
    input: () => undefined,
    ip: () => '127.0.0.1',
    header: () => 'unit-test',
  },
  response: {
    status: () => ({ json: () => undefined }),
    redirect: (_path?: string) => undefined,
  },
  session: { flash: () => undefined, get: () => undefined },
  inertia: { render: () => undefined },
})

class UnusedTalentQueryFactory extends UserTalentQueryFactory {
  makeSearch(): never { throw new Error('Not used by talent workspace transition') }
  makeRecruitingSearch(): never { throw new Error('Not used by talent workspace transition') }
  makeDirectoryPage(): never { throw new Error('Not used by talent workspace transition') }
  makeRecruitingDirectoryWorkspace(): never {
    throw new Error('Not used by talent workspace transition')
  }
  makeRecruitingTalentProfile(): never { throw new Error('Not used by talent workspace transition') }
  makeRecruitingTalentDiscoveryPage(): never {
    throw new Error('Not used by talent workspace transition')
  }
}

test.group('Recruiting query Result boundaries', () => {
  test('recruiting talent search preserves expected query failures', async ({ assert }) => {
    const failure = new ForbiddenException('Search unavailable')
    const query = new SearchRecruitingTalentsQuery(
      { userId: 'recruiter-1', organizationId: 'org-1', ip: '127.0.0.1', userAgent: 'test' },
      { canAccessDirectory: () => Promise.resolve(true), talentBelongsToOrganization: () => Promise.resolve(true) },
      {
        handle: () => Promise.reject(failure),
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      }
    )

    const result = await query.executeAndWrap({})

    assert.isFalse(result.isSuccess())
    assert.strictEqual(result.getError(), failure)
  })

  test('talent detail controller preserves expected query failures', async ({ assert }) => {
    const failure = new ForbiddenException('Recruiter access required')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const queries = {
      makeRecruitingTalentProfile: () => query,
    } as unknown as UserTalentQueryFactory

    let thrown: unknown
    try {
      await new TalentDetailController(queries).handle(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('directory page controller maps expected query failures to its redirect', async ({ assert }) => {
    const failure = new ForbiddenException('Recruiting directory access required')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const queries = {
      makeRecruitingTalentDiscoveryPage: () => query,
    } as unknown as UserTalentQueryFactory
    let redirectedTo: string | undefined
    const ctx = context()
    ctx.response.redirect = (path?: string) => { redirectedTo = path }

    await new OrgTalentsPageController(queries).index(ctx as never)

    assert.strictEqual(redirectedTo, '/marketplace/tasks')
  })

  test('opening talent from a project workspace returns to the current organization', async ({
    assert,
  }) => {
    const ctx = context()
    const sessionWrites: Array<[string, string]> = []
    const sessionForgets: string[] = []
    let redirectedTo: string | undefined
    ctx.session = {
      flash: () => undefined,
      get: () => undefined,
      put: (key: string, value: string) => sessionWrites.push([key, value]),
      forget: (key: string) => sessionForgets.push(key),
      commit: () => Promise.resolve(),
    }
    ctx.response.redirect = (path?: string) => {
      redirectedTo = path
    }
    Object.assign(ctx, { currentOrganizationId: 'org-1' })

    await new OrgTalentsPageController(new UnusedTalentQueryFactory()).open(ctx as never)

    assert.deepEqual(sessionWrites, [['current_organization_id', 'org-1']])
    assert.deepEqual(sessionForgets, ['current_project_id'])
    assert.strictEqual(redirectedTo, '/org/talents/talent-1')
  })

  test('directory page controller falls back when discovery search is unavailable', async ({ assert }) => {
    const fallbackPage = { talents: [], filters: {}, pagination: { mode: 'offset' } }
    let rendered: unknown
    const ctx = context()
    ctx.inertia.render = () => {
      rendered = fallbackPage
      return undefined
    }
    const queries = {
      makeRecruitingTalentDiscoveryPage: () => ({
        executeAndWrap: () => Promise.reject(new SearchDiscoveryError('SEARCH_SOURCE_UNAVAILABLE')),
      }),
      makeRecruitingDirectoryWorkspace: () => ({
        handle: () => Promise.resolve(fallbackPage),
      }),
    } as unknown as UserTalentQueryFactory

    await new OrgTalentsPageController(queries).index(ctx as never)

    assert.deepEqual(rendered, fallbackPage)
  })

  test('directory page controller falls back when the search provider throws a connection error', async ({ assert }) => {
    const fallbackPage = { talents: [], filters: {}, pagination: { mode: 'offset' } }
    let rendered = false
    const ctx = context()
    ctx.inertia.render = () => {
      rendered = true
      return undefined
    }
    const queries = {
      makeRecruitingTalentDiscoveryPage: () => ({
        executeAndWrap: () => Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:9200')),
      }),
      makeRecruitingDirectoryWorkspace: () => ({
        handle: () => Promise.resolve(fallbackPage),
      }),
    } as unknown as UserTalentQueryFactory

    await new OrgTalentsPageController(queries).index(ctx as never)

    assert.isTrue(rendered)
  })

  test('directory page controller falls back for filters unsupported by the canonical index', async ({ assert }) => {
    const fallbackPage = { talents: [], filters: {}, pagination: { mode: 'offset' } }
    let rendered = false
    const ctx = context()
    ctx.inertia.render = () => {
      rendered = true
      return undefined
    }
    const queries = {
      makeRecruitingTalentDiscoveryPage: () => ({
        executeAndWrap: () =>
          Promise.reject(new TalentDiscoveryRequestError('unsupported filter')),
      }),
      makeRecruitingDirectoryWorkspace: () => ({
        handle: () => Promise.resolve(fallbackPage),
      }),
    } as unknown as UserTalentQueryFactory

    await new OrgTalentsPageController(queries).index(ctx as never)

    assert.isTrue(rendered)
  })
})
