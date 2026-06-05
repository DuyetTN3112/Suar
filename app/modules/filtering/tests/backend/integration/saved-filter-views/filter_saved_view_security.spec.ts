/*
 * The saved-view command declarations in this dirty relocation tree expose `handle` as `any`.
 * Keep the security assertions executable while the shared command contracts are migrated.
 */
/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { savedViewAuthorization as composedSavedViewAuthorization } from '#composition/filtering/filter-runtime/filtering_composition'
import { CreateFilterAlertCommand } from '#modules/filtering/actions/commands/filter-alert/create_filter_alert_command'
import { CreateSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/create_saved_filter_view_command'
import { ShareSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/share_saved_filter_view_command'
import { FilterSavedViewAccessError } from '#modules/filtering/actions/ports/outbound/filter_saved_view_authorization'
import { GetFilterAlertQuery } from '#modules/filtering/actions/queries/filter-alert/get_filter_alert_query'
import { ExecuteSavedFilterViewQuery } from '#modules/filtering/actions/queries/saved-filter-views/execute_saved_filter_view_query'
import { GetSavedFilterViewQuery } from '#modules/filtering/actions/queries/saved-filter-views/get_saved_filter_view_query'
import type { SavedFilterSemanticState } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import { LucidFilterTransactionRunner } from '#modules/filtering/infra/adapters/filtering-runtime/lucid_filter_transaction_runner'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import { PostgresFilterSavedViewAuthorization } from '#modules/filtering/infra/adapters/saved-filter-views/postgres_filter_saved_view_authorization'
import { PostgresFilterAlertRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_alert_repository'
import { PostgresFilterSavedViewRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_saved_view_repository'
import type { FilterContextProvider } from '#modules/filtering/public_contracts/filter_context_provider'
import type { FilterContextDefinition } from '#modules/filtering/public_contracts/filter_contracts'
import type { QueryCriteriaResponse } from '#modules/filtering/public_contracts/filter_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Saved filter view security', (group) => {

const context = { key: 'security.saved-view', owner: 'filtering', schemaVersion: 1 } as const
const hiddenValue = 'private-membership-revocation-probe'

const contextProvider: FilterContextProvider = {
  getEffectiveDefinition: (): Promise<FilterContextDefinition> =>
    Promise.resolve({
      key: context.key,
      version: context.schemaVersion,
      resource: 'saved-view-security',
      ownerModule: context.owner,
      capabilities: {
        text: false,
        facets: false,
        nestedGroups: true,
        preferences: false,
        relativeTime: false,
        savedViews: true,
        sharedViews: true,
        alerts: true,
        emptyRequest: false,
        pagination: 'offset',
        maxDepth: 1,
        maxConditions: 5,
      },
      fields: [],
      sorts: [],
      defaultSort: [],
      executionProfile: 'fake-search',
      degradationPolicy: 'fail_closed',
      limits: {
        maxPageSize: 10,
        maxFacetRequests: 0,
        maxProjectionFields: 5,
        maxSorts: 0,
        maxSetValues: 5,
        maxTextLength: 32,
        maxRelationDepth: 0,
        maxCost: 10,
      },
    }),
}

const semanticState: SavedFilterSemanticState = {
  filter: {
    kind: 'condition',
    field: 'security.classification',
    operator: 'eq',
    effect: 'require',
    value: { kind: 'scalar', value: hiddenValue },
    unknown: 'exclude',
  },
  textQuery: null,
  sort: [],
  projection: [],
}


  group.setup(async () => {
    await setupApp()
  })
  group.each.teardown(async () => {
    await db.from('filter_alerts').delete()
    await db.from('filter_saved_view_grants').delete()
    await db.from('filter_saved_views').delete()
    await cleanupTestData()
  })
  group.teardown(async () => {
    await teardownApp()
  })

  test('live filtering composition denies organization creation to a non-member', async ({
    assert,
  }) => {
    const outsider = await UserFactory.create()
    const organization = await OrganizationFactory.create()

    const allowed = await composedSavedViewAuthorization.canCreate({
      principal: {
        kind: 'user',
        id: outsider.id,
        organizationId: organization.id,
      },
      owner: { type: 'organization', id: organization.id },
    })

    assert.isFalse(allowed)
  })

  test('does not return shared criteria after organization membership is removed', async ({
    assert,
  }) => {
    const owner = await UserFactory.create()
    const organization = await OrganizationFactory.create({ owner_id: owner.id })
    await OrganizationUserFactory.create({
      organization_id: organization.id,
      user_id: owner.id,
      org_role: 'org_owner',
    })
    const reader = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: organization.id,
      user_id: reader.id,
      org_role: 'org_member',
    })

    const ownerPrincipal = { kind: 'user' as const, id: owner.id, organizationId: organization.id }
    const repository = new PostgresFilterSavedViewRepository()
    const authorization = new PostgresFilterSavedViewAuthorization()
    const create = new CreateSavedFilterViewCommand(
      new LucidFilterTransactionRunner(),
      repository,
      authorization,
      contextProvider,
      new NodeFilterHashGenerator(),
      () => new Date().toISOString(),
      testId
    )
    const record = await create.handle({
      principal: ownerPrincipal,
      owner: { type: 'user', id: owner.id },
      name: 'Membership revocation security probe',
      description: null,
      visibility: 'organization',
      organizationId: organization.id,
      teamId: null,
      context,
      semanticState,
      presentationState: {},
      isDefault: false,
      isPinned: false,
      alertState: { status: 'disabled', reason: null },
    })
    await db.table('filter_saved_view_grants').insert({
      saved_view_id: record.view.id,
      grantee_type: 'organization',
      grantee_id: organization.id,
      can_read: true,
      can_edit: false,
      can_share: false,
      can_subscribe: false,
      created_by: owner.id,
      revoked_at: null,
    })

    const get = new GetSavedFilterViewQuery(repository, authorization)
    const readerPrincipal = {
      kind: 'user' as const,
      id: reader.id,
      organizationId: organization.id,
    }
    assert.isNotNull(
      await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', reader.id)
        .where('status', 'approved')
        .first()
    )
    assert.isNotNull(
      await db
        .from('filter_saved_view_grants')
        .where('saved_view_id', record.view.id)
        .where('grantee_type', 'organization')
        .where('grantee_id', organization.id)
        .where('can_read', true)
        .whereNull('revoked_at')
        .first()
    )
    const beforeRevoke = await get.execute({ principal: readerPrincipal, viewId: record.view.id })
    const beforeFilter = beforeRevoke.view.semanticState.filter
    assert.isTrue(beforeFilter?.kind === 'condition')
    if (beforeFilter?.kind === 'condition') {
      assert.deepEqual(beforeFilter.value, { kind: 'scalar', value: hiddenValue })
    }

    await db
      .from('organization_users')
      .where('organization_id', organization.id)
      .where('user_id', reader.id)
      .delete()

    let error: unknown
    try {
      await get.execute({ principal: readerPrincipal, viewId: record.view.id })
    } catch (caught) {
      error = caught
    }

    assert.instanceOf(error, FilterSavedViewAccessError)
    assert.notInclude(JSON.stringify(error), hiddenValue)
  })

  test('denies a known private saved-view id from a foreign organization without disclosing criteria', async ({
    assert,
  }) => {
    const owner = await UserFactory.create()
    const ownerOrganization = await OrganizationFactory.create({ owner_id: owner.id })
    await OrganizationUserFactory.create({
      organization_id: ownerOrganization.id,
      user_id: owner.id,
      org_role: 'org_owner',
    })
    const foreignUser = await UserFactory.create()
    const foreignOrganization = await OrganizationFactory.create({ owner_id: foreignUser.id })
    await OrganizationUserFactory.create({
      organization_id: foreignOrganization.id,
      user_id: foreignUser.id,
      org_role: 'org_owner',
    })

    const repository = new PostgresFilterSavedViewRepository()
    const authorization = new PostgresFilterSavedViewAuthorization()
    const create = new CreateSavedFilterViewCommand(
      new LucidFilterTransactionRunner(),
      repository,
      authorization,
      contextProvider,
      new NodeFilterHashGenerator(),
      () => new Date().toISOString(),
      testId
    )
    const record = await create.handle({
      principal: { kind: 'user', id: owner.id, organizationId: ownerOrganization.id },
      owner: { type: 'user', id: owner.id },
      name: 'Foreign tenant private id probe',
      description: null,
      visibility: 'private',
      organizationId: null,
      teamId: null,
      context,
      semanticState,
      presentationState: {},
      isDefault: false,
      isPinned: false,
      alertState: { status: 'disabled', reason: null },
    })

    const get = new GetSavedFilterViewQuery(repository, authorization)
    const error = await get
      .execute({
        principal: { kind: 'user', id: foreignUser.id, organizationId: foreignOrganization.id },
        viewId: record.view.id,
      })
      .catch((caught: unknown) => caught)

    assert.instanceOf(error, FilterSavedViewAccessError)
    assert.notInclude(JSON.stringify(error), hiddenValue)
    assert.notInclude(JSON.stringify(error), record.view.id)
  })

  test('fails closed for execute and alert access after page-load membership revocation', async ({
    assert,
  }) => {
    const owner = await UserFactory.create()
    const organization = await OrganizationFactory.create({ owner_id: owner.id })
    await OrganizationUserFactory.create({
      organization_id: organization.id,
      user_id: owner.id,
      org_role: 'org_owner',
    })
    const reader = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: organization.id,
      user_id: reader.id,
      org_role: 'org_member',
    })

    const ownerPrincipal = { kind: 'user' as const, id: owner.id, organizationId: organization.id }
    const readerPrincipal = {
      kind: 'user' as const,
      id: reader.id,
      organizationId: organization.id,
    }
    const repository = new PostgresFilterSavedViewRepository()
    const authorization = new PostgresFilterSavedViewAuthorization()
    const create = new CreateSavedFilterViewCommand(
      new LucidFilterTransactionRunner(),
      repository,
      authorization,
      contextProvider,
      new NodeFilterHashGenerator(),
      () => new Date().toISOString(),
      testId
    )
    const record = await create.handle({
      principal: ownerPrincipal,
      owner: { type: 'user', id: owner.id },
      name: 'Execute and alert revocation probe',
      description: null,
      visibility: 'organization',
      organizationId: organization.id,
      teamId: null,
      context,
      semanticState,
      presentationState: {},
      isDefault: false,
      isPinned: false,
      alertState: { status: 'disabled', reason: null },
    })
    await db.table('filter_saved_view_grants').insert({
      saved_view_id: record.view.id,
      grantee_type: 'organization',
      grantee_id: organization.id,
      can_read: true,
      can_edit: false,
      can_share: false,
      can_subscribe: true,
      created_by: owner.id,
      revoked_at: null,
    })

    const get = new GetSavedFilterViewQuery(repository, authorization)
    const loadedAtPageTime = await get.execute({
      principal: readerPrincipal,
      viewId: record.view.id,
    })
    assert.equal(loadedAtPageTime.view.id, record.view.id)

    const criteriaCalls: string[] = []
    const execute = new ExecuteSavedFilterViewQuery(repository, authorization, contextProvider, {
      execute: <T>(): Promise<QueryCriteriaResponse<T>> => {
        criteriaCalls.push('executed')
        return Promise.resolve({
          context: context.key,
          schemaVersion: context.schemaVersion,
          canonicalCriteria: {
            context: context.key,
            schemaVersion: context.schemaVersion,
            page: { size: 20 },
            sort: [],
          },
          hits: [] as T[],
          total: { value: 0, relation: 'eq' },
          facets: [],
          suggestions: [],
          diagnostics: [],
          page: {},
          execution: {
            provider: 'reference',
            degraded: false,
            partial: false,
            requestId: 'revocation-probe',
          },
        })
      },
    })

    const alertCommand = new CreateFilterAlertCommand(
      repository,
      new PostgresFilterAlertRepository(),
      authorization,
      contextProvider
    )
    const alertQuery = new GetFilterAlertQuery(
      repository,
      new PostgresFilterAlertRepository(),
      authorization
    )
    const ownerAlert = await alertCommand.handle({
      principal: ownerPrincipal,
      viewId: record.view.id,
      intervalMinutes: 30,
      timezone: 'UTC',
      policy: {
        hasSubscriptionPermission: true,
        contextAlertsEnabled: true,
        providerState: 'healthy',
        totalRelation: 'eq',
        queryCost: 0,
        maxQueryCost: 10,
      },
      now: new Date().toISOString(),
      alertId: testId(),
    })
    const loadedAlertAtPageTime = await alertQuery.execute({
      principal: readerPrincipal,
      viewId: record.view.id,
    })
    assert.equal(loadedAlertAtPageTime.alert.id, ownerAlert.alert.id)

    await db
      .from('organization_users')
      .where('organization_id', organization.id)
      .where('user_id', reader.id)
      .delete()

    await assert.rejects(
      () =>
        execute.execute({
          principal: readerPrincipal,
          viewId: record.view.id,
          requestId: 'revoked-after-page-load',
          page: { size: 20, cursor: 'cursor-from-page-load' },
        }),
      FilterSavedViewAccessError
    )
    assert.deepEqual(criteriaCalls, [])

    await assert.rejects(
      () => alertQuery.execute({ principal: readerPrincipal, viewId: record.view.id }),
      FilterSavedViewAccessError
    )
    await assert.rejects(
      () =>
        alertCommand.handle({
          principal: readerPrincipal,
          viewId: record.view.id,
          intervalMinutes: 30,
          timezone: 'UTC',
          policy: {
            hasSubscriptionPermission: true,
            contextAlertsEnabled: true,
            providerState: 'healthy',
            totalRelation: 'eq',
            queryCost: 0,
            maxQueryCost: 10,
          },
          now: new Date().toISOString(),
          alertId: testId(),
        }),
      FilterSavedViewAccessError
    )
  })

  test('does not share with a stale organization after the actor loses membership', async ({
    assert,
  }) => {
    const owner = await UserFactory.create()
    const organization = await OrganizationFactory.create({ owner_id: owner.id })
    await OrganizationUserFactory.create({
      organization_id: organization.id,
      user_id: owner.id,
      org_role: 'org_owner',
    })

    const ownerPrincipal = { kind: 'user' as const, id: owner.id, organizationId: organization.id }
    const repository = new PostgresFilterSavedViewRepository()
    const authorization = new PostgresFilterSavedViewAuthorization()
    const transactions = new LucidFilterTransactionRunner()
    const create = new CreateSavedFilterViewCommand(
      transactions,
      repository,
      authorization,
      contextProvider,
      new NodeFilterHashGenerator(),
      () => new Date().toISOString(),
      testId
    )
    const share = new ShareSavedFilterViewCommand(
      transactions,
      repository,
      authorization,
      contextProvider,
      new NodeFilterHashGenerator(),
      () => new Date().toISOString()
    )
    const record = await create.handle({
      principal: ownerPrincipal,
      owner: { type: 'user', id: owner.id },
      name: 'Stale organization share probe',
      description: null,
      visibility: 'private',
      organizationId: null,
      teamId: null,
      context,
      semanticState,
      presentationState: {},
      isDefault: false,
      isPinned: false,
      alertState: { status: 'disabled', reason: null },
    })

    await db
      .from('organization_users')
      .where('organization_id', organization.id)
      .where('user_id', owner.id)
      .delete()

    await assert.rejects(
      () =>
        share.handle({
          principal: ownerPrincipal,
          viewId: record.view.id,
          expectedLockVersion: record.lockVersion,
          visibility: 'organization',
          organizationId: organization.id,
          teamId: null,
          grants: [
            {
              target: { type: 'organization', id: organization.id },
              read: true,
              edit: false,
              share: false,
              subscribe: false,
            },
          ],
        }),
      FilterSavedViewAccessError
    )

    assert.isNull(
      await db.from('filter_saved_view_grants').where('saved_view_id', record.view.id).first()
    )
    const unchanged = await repository.findById(record.view.id)
    assert.equal(unchanged?.view.visibility, 'private')
    assert.equal(unchanged?.lockVersion, record.lockVersion)
  })

  test('allows a member owner to share a private view with their approved organization', async ({
    assert,
  }) => {
    const owner = await UserFactory.create()
    const organization = await OrganizationFactory.create({ owner_id: owner.id })
    await OrganizationUserFactory.create({
      organization_id: organization.id,
      user_id: owner.id,
      org_role: 'org_owner',
    })
    const reader = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: organization.id,
      user_id: reader.id,
      org_role: 'org_member',
    })

    const ownerPrincipal = { kind: 'user' as const, id: owner.id, organizationId: organization.id }
    const repository = new PostgresFilterSavedViewRepository()
    const authorization = new PostgresFilterSavedViewAuthorization()
    const transactions = new LucidFilterTransactionRunner()
    const create = new CreateSavedFilterViewCommand(
      transactions,
      repository,
      authorization,
      contextProvider,
      new NodeFilterHashGenerator(),
      () => new Date().toISOString(),
      testId
    )
    const share = new ShareSavedFilterViewCommand(
      transactions,
      repository,
      authorization,
      contextProvider,
      new NodeFilterHashGenerator(),
      () => new Date().toISOString()
    )
    const record = await create.handle({
      principal: ownerPrincipal,
      owner: { type: 'user', id: owner.id },
      name: 'Approved organization share probe',
      description: null,
      visibility: 'private',
      organizationId: null,
      teamId: null,
      context,
      semanticState,
      presentationState: {},
      isDefault: false,
      isPinned: false,
      alertState: { status: 'disabled', reason: null },
    })

    const shared = await share.handle({
      principal: ownerPrincipal,
      viewId: record.view.id,
      expectedLockVersion: record.lockVersion,
      visibility: 'organization',
      organizationId: organization.id,
      teamId: null,
      grants: [
        {
          target: { type: 'organization', id: organization.id },
          read: true,
          edit: false,
          share: false,
          subscribe: false,
        },
      ],
    })

    assert.equal(shared.view.visibility, 'organization')
    assert.isFalse(
      await authorization.canShareWith({
        principal: ownerPrincipal,
        record: shared,
        target: { type: 'team', id: organization.id },
      })
    )
    const readerView = await new GetSavedFilterViewQuery(repository, authorization).execute({
      principal: { kind: 'user', id: reader.id, organizationId: organization.id },
      viewId: record.view.id,
    })
    assert.equal(readerView.view.id, record.view.id)
    assert.equal(readerView.view.semanticState.filter?.kind, 'condition')
  })
})
