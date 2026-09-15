import type { SavedFilterSemanticState } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import type { FilterContextProvider } from '#modules/filtering/public_contracts/filter_context_provider'
import type { FilterContextDefinition } from '#modules/filtering/public_contracts/filter_contracts'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
} from '#tests/helpers/factories'

export const securityContext = { key: 'security.saved-view', owner: 'filtering', schemaVersion: 1 } as const
export const hiddenValue = 'private-membership-revocation-probe'

export const securityContextProvider: FilterContextProvider = {
  getEffectiveDefinition: (): Promise<FilterContextDefinition> =>
    Promise.resolve({
      key: securityContext.key,
      version: securityContext.schemaVersion,
      resource: 'saved-view-security',
      ownerModule: securityContext.owner,
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

export const securitySemanticState: SavedFilterSemanticState = {
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

export async function createSecurityOrgAndMembers() {
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
  return { owner, organization, reader }
}
