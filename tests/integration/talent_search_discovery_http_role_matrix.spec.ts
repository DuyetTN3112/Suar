import { randomUUID } from 'node:crypto'

import type { Client } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import type { TalentSearchDocument } from '#modules/search/domain/entity-search/talent_search_document'
import {
  buildSearchGenerationIndexName,
  buildTalentSearchIndexName,
} from '#modules/search/infra/adapters/index-administration/search_index_names'
import { TALENT_DISCOVERY_CONTEXTS } from '#modules/search/infra/adapters/search-discovery/talents/talent_search_discovery_filter_context'
import { TALENT_SEARCH_INDEX_MAPPINGS } from '#modules/search/infra/repositories/entity-search/talents/talent_search_index_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory, OrganizationUserFactory, UserFactory } from '#tests/helpers/factories'

function talent(id: string): TalentSearchDocument {
  return {
    user_id: id,
    username: id,
    display_name: `Talent ${id}`,
    headline: 'Search engineer',
    bio: 'Builds reliable discovery systems',
    status: 'active',
    is_searchable: true,
    is_active: true,
    skill_ids: ['skill-search'],
    skill_ids_known: true,
    skill_ids_count: 1,
    skills_text: 'Search',
    accomplishments_text: 'Discovery platform',
    business_domains: ['search-platform'],
    business_domains_known: true,
    business_domains_count: 1,
    problem_categories: ['discovery'],
    problem_categories_known: true,
    problem_categories_count: 1,
    task_types: ['backend'],
    task_types_known: true,
    task_types_count: 1,
    technologies: ['elasticsearch'],
    technologies_known: true,
    technologies_count: 1,
    trust_score: 0.9,
    completed_tasks: 10,
    reviewed_skills_count: 2,
    imported_skills_count: 0,
    under_dispute_skills_count: 0,
    latest_confidence_signal: 'high',
    updated_at: '2026-08-09T00:00:00.000Z',
  }
}

function organizationRequest() {
  return {
    criteria: {
      context: TALENT_DISCOVERY_CONTEXTS.organization,
      schemaVersion: 1,
      sort: [{ field: 'talent.trustScore', direction: 'desc' }],
      page: { size: 10 },
    },
    search: { scope: 'talent', retrievalMode: 'auto' },
  }
}

test.group('Integration | Talent Search Discovery HTTP role matrix', (group) => {
  let client: Client
  const aliasName = buildTalentSearchIndexName()
  const physicalIndexName = buildSearchGenerationIndexName(
    buildTalentSearchIndexName(),
    `http_${randomUUID().replaceAll('-', '')}`
  )
  let previousAliasIndices: string[] = []

  group.setup(async () => {
    await setupApp()
    ;({ searchClient: client } = await import('#platform/search/elasticsearch_client'))
    try {
      previousAliasIndices = Object.keys(await client.indices.getAlias({ name: aliasName }))
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode !== 404) throw error
    }
    if (previousAliasIndices.length > 0) {
      await client.indices.updateAliases({
        actions: previousAliasIndices.map((index) => ({ remove: { index, alias: aliasName } })),
      })
    }
    await client.indices.create({
      index: physicalIndexName,
      mappings: TALENT_SEARCH_INDEX_MAPPINGS,
      aliases: { [aliasName]: { is_write_index: true } },
    })
    const document = talent('talent-http-owner-visible')
    await client.index({ index: aliasName, id: document.user_id, refresh: 'wait_for', document })
  })

  group.each.teardown(async () => {
    await cleanupTestData()
  })

  group.teardown(async () => {
    await client.indices.updateAliases({
      actions: [{ remove: { index: physicalIndexName, alias: aliasName } }],
    }).catch(() => undefined)
    await client.indices.delete({ index: physicalIndexName }, { ignore: [404] })
    if (previousAliasIndices.length > 0) {
      await client.indices.updateAliases({
        actions: previousAliasIndices.map((index) => ({ add: { index, alias: aliasName } })),
      })
    }
    await teardownApp()
  })

  test('allows an organization owner through the real session and Search HTTP route', async ({
    client: http,
    assert,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()
    const response = await http.post('/api/v1/search/discovery').loginAs(owner).json(organizationRequest())

    assert.equal(response.status(), 200, JSON.stringify(response.body()))
    const body = response.body() as { hits: Array<{ entityId: string }> }
    assert.deepEqual(body.hits.map(({ entityId }) => entityId), [
      'talent-http-owner-visible',
    ])
  })

  test('allows an organization admin and denies a member through the same route', async ({
    client: http,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const admin = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: admin.id,
      org_role: 'org_admin',
    })
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
    })

    const allowed = await http.post('/api/v1/search/discovery').loginAs(admin).json(organizationRequest())
    allowed.assertStatus(200)

    const denied = await http.post('/api/v1/search/discovery').loginAs(member).json(organizationRequest())
    denied.assertStatus(401)
    denied.assertBodyContains({ code: 'FILTER_CONTEXT_UNAVAILABLE' })
  })

  test('denies anonymous and authenticated users without an organization context', async ({
    client: http,
  }) => {
    const anonymous = await http.post('/api/v1/search/discovery').json(organizationRequest())
    anonymous.assertStatus(401)
    anonymous.assertBodyContains({ code: 'FILTER_CONTEXT_UNAVAILABLE' })

    const user = await UserFactory.create()
    const missingOrganization = await http
      .post('/api/v1/search/discovery')
      .loginAs(user)
      .json(organizationRequest())
    missingOrganization.assertStatus(401)
    missingOrganization.assertBodyContains({ code: 'FILTER_CONTEXT_UNAVAILABLE' })
  })

  test('renders the canonical Talent cursor/search contract through the real Inertia route', async ({
    client: http,
    assert,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()
    const response = await http
      .get('/org/talents')
      .loginAs(owner)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    assert.equal(response.status(), 200, JSON.stringify(response.body()))
    const body = response.body() as {
      props: {
        pagination: { mode: string; cursor?: { nextCursor?: string | null } }
        search: { scope: string }
        authority: { total: { state: string } }
      }
    }
    assert.equal(body.props.pagination.mode, 'cursor')
    assert.equal(body.props.pagination.cursor?.nextCursor, null)
    assert.equal(body.props.search.scope, 'talent')
    assert.equal(body.props.authority.total.state, 'authoritative')
  })

  test('applies a canonical taxonomy filter through the real Inertia route', async ({
    client: http,
    assert,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()
    const response = await http
      .get('/org/talents?business_domain=search-platform&sort_by=trust_score&sort_order=desc')
      .loginAs(owner)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    assert.equal(response.status(), 200, JSON.stringify(response.body()))
    const body = response.body() as {
      props: {
        filters: { business_domain?: string }
        pagination: { mode: string }
        search: { inputMode: string }
      }
    }
    assert.equal(body.props.filters.business_domain, 'search-platform')
    assert.equal(body.props.pagination.mode, 'cursor')
    assert.equal(body.props.search.inputMode, 'filter')
  })
})
