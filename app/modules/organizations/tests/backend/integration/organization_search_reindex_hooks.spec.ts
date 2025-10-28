import { test } from '@japa/runner'

import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import CreateOrganizationCommand from '#modules/organizations/actions/commands/create_organization_command'
import DeleteOrganizationCommand from '#modules/organizations/actions/commands/delete_organization_command'
import UpdateOrganizationCommand from '#modules/organizations/actions/commands/update_organization_command'
import { CreateOrganizationDTO } from '#modules/organizations/actions/dtos/request/create_organization_dto'
import { DeleteOrganizationDTO } from '#modules/organizations/actions/dtos/request/delete_organization_dto'
import { UpdateOrganizationDTO } from '#modules/organizations/actions/dtos/request/update_organization_dto'
import { makeSystemOrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { SearchOrganizationsViaEngineQuery } from '#modules/search/actions/queries/search_organizations_via_engine_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory, UserFactory } from '#tests/helpers/factories'

test.group('Integration | Organization Search Reindex Hooks', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.setup(async () => {
    const { OrganizationSearchIndexRepository } = await import(
      '#modules/search/infra/organizations/organization_search_index_repository'
    )
    const repository = new OrganizationSearchIndexRepository()
    await repository.resetIndex()
    await repository.ensureIndex()
  })
  group.each.teardown(() => cleanupTestData())

  test('create command indexes organization for engine search', async ({ assert }) => {
    const user = await UserFactory.create()
    const command = new CreateOrganizationCommand(
      makeSystemOrganizationActionContext(user.id),
      notificationPublicApi
    )

    const organization = await command.execute(new CreateOrganizationDTO('Searchable Collective'))

    const result = await new SearchOrganizationsViaEngineQuery().handle({
      q: 'searchable',
      limit: 5,
    })

    assert.include(
      result.map((item) => item.organizationId),
      organization.id
    )
  }).timeout(10000)

  test('update command refreshes indexed organization fields', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner({
      name: 'Legacy Ops',
      slug: 'legacy-ops',
    })

    const updateCommand = new UpdateOrganizationCommand(makeSystemOrganizationActionContext(owner.id))
    await updateCommand.execute(
      new UpdateOrganizationDTO(org.id, 'Modern Search Ops', undefined, 'Search-first org')
    )

    const result = await new SearchOrganizationsViaEngineQuery().handle({
      q: 'modern',
      limit: 5,
    })

    assert.include(
      result.map((item) => item.organizationId),
      org.id
    )
  }).timeout(10000)

  test('delete command removes organization from engine search', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner({
      name: 'Disposable Search Org',
      slug: 'disposable-search-org',
    })

    const { searchPublicApi } = await import('#modules/search/public_contracts/search_public_api')
    await searchPublicApi.reindexOrganizationDocument(org.id)

    const deleteCommand = new DeleteOrganizationCommand(makeSystemOrganizationActionContext(owner.id))
    await deleteCommand.execute(new DeleteOrganizationDTO(org.id))

    const result = await new SearchOrganizationsViaEngineQuery().handle({
      q: 'disposable',
      limit: 5,
    })

    assert.notInclude(
      result.map((item) => item.organizationId),
      org.id
    )
  }).timeout(10000)
})
