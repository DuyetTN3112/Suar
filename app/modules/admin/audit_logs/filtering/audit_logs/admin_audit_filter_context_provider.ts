import {
  resolveAdminAuditAuthorization,
  type AdminAuditAuthorizationReader,
} from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_permission_provider'
import type {
  FilterContextProvider,
  FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'

type FilterContextDefinition = Awaited<ReturnType<FilterContextProvider['getEffectiveDefinition']>>

export const ADMIN_AUDIT_FILTER_CONTEXT = 'audit.admin.investigation'
export const ADMIN_AUDIT_FILTER_EXECUTION_PROFILE = 'postgres.audit.admin.investigation.v1'

const SCALAR_OPERATORS = ['eq', 'neq', 'in', 'not_in', 'exists', 'missing'] as const
const DATE_OPERATORS = ['before', 'after', 'between', 'within_last'] as const
const STRICT_EFFECTS = ['require', 'exclude'] as const
const FACET_MODES = ['constrained', 'self_excluding'] as const

function scalarField(
  key: string,
  options: {
    facetable?: boolean
    sortable?: boolean
    valueSearch?: boolean
  } = {}
): FilterContextDefinition['fields'][number] {
  return {
    key,
    type: 'scalar',
    operators: SCALAR_OPERATORS,
    effects: STRICT_EFFECTS,
    defaultUnknown: 'exclude',
    facetable: options.facetable ?? false,
    sortable: options.sortable ?? false,
    projectable: true,
    preference: false,
    valueSearch: options.valueSearch ?? false,
    facetCountModes: options.facetable ? FACET_MODES : [],
    cost: 1,
  }
}

export function adminAuditFilterDefinition(): FilterContextDefinition {
  return {
    key: ADMIN_AUDIT_FILTER_CONTEXT,
    version: 1,
    resource: 'audit_event',
    ownerModule: 'admin',
    capabilities: {
      text: true,
      facets: true,
      nestedGroups: true,
      preferences: false,
      relativeTime: true,
      savedViews: true,
      sharedViews: false,
      alerts: false,
      emptyRequest: true,
      pagination: 'offset',
      maxDepth: 4,
      maxConditions: 32,
    },
    fields: [
      scalarField('audit.action', { facetable: true, valueSearch: true }),
      scalarField('audit.resourceType', { facetable: true, valueSearch: true }),
      scalarField('audit.resourceId'),
      scalarField('audit.actorId'),
      scalarField('audit.outcome', { facetable: true }),
      scalarField('audit.severity', { facetable: true }),
      scalarField('audit.requestId'),
      scalarField('audit.traceId'),
      {
        key: 'audit.createdAt',
        type: 'date_time',
        operators: DATE_OPERATORS,
        effects: STRICT_EFFECTS,
        defaultUnknown: 'exclude',
        facetable: false,
        sortable: true,
        projectable: true,
        preference: false,
        valueSearch: false,
        facetCountModes: [],
        cost: 1,
      },
      scalarField('audit.integrityState', { facetable: true }),
    ],
    sorts: [{ field: 'audit.createdAt', directions: ['asc', 'desc'] }],
    defaultSort: [{ field: 'audit.createdAt', direction: 'desc' }],
    executionProfile: ADMIN_AUDIT_FILTER_EXECUTION_PROFILE,
    degradationPolicy: 'fail_closed',
    limits: {
      maxPageSize: 100,
      maxFacetRequests: 8,
      maxProjectionFields: 10,
      maxSorts: 1,
      maxSetValues: 100,
      maxTextLength: 256,
      maxRelationDepth: 0,
      maxCost: 160,
    },
    presentationHints: {
      filterOnly: true,
      stagedCommit: true,
      sensitivePayload: 'never_search_or_facet',
    },
  }
}

export class AdminAuditFilterContextProvider implements FilterContextProvider {
  constructor(private readonly authorizationReader: AdminAuditAuthorizationReader) {}

  async getEffectiveDefinition(input: {
    context: string
    principal: FilterPrincipal
  }): Promise<FilterContextDefinition> {
    await resolveAdminAuditAuthorization(
      this.authorizationReader,
      input.context,
      input.principal,
      ADMIN_AUDIT_FILTER_CONTEXT
    )
    return structuredClone(adminAuditFilterDefinition())
  }
}
