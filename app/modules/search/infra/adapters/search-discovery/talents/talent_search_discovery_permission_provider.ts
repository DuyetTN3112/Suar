import { TALENT_DISCOVERY_CONTEXTS } from './talent_search_discovery_filter_context.js'

import {
  FilterContextResolutionError,
  type FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'
import type { FilterPermissionConstraint } from '#modules/filtering/public_contracts/filter_permission_constraint'

export class TalentDiscoveryPermissionProvider {
  buildMandatoryExpression(input: {
    context: string
    principal: FilterPrincipal
  }): Promise<FilterPermissionConstraint> {
    if (!isAllowedPrincipal(input.context, input.principal)) {
      return Promise.reject(new FilterContextResolutionError())
    }
    return Promise.resolve({
      expression: {
        kind: 'group',
        combinator: 'and',
        children: [
          {
            kind: 'condition',
            field: 'permission.talent.active',
            operator: 'is_true',
            effect: 'require',
            unknown: 'exclude',
          },
          {
            kind: 'condition',
            field: 'permission.talent.searchable',
            operator: 'is_true',
            effect: 'require',
            unknown: 'exclude',
          },
        ],
      },
      // These bindings authorize the server-owned mandatory AST. They are intentionally
      // absent from the public context fields, so callers cannot select or project them.
      fieldBindings: [
        {
          field: 'permission.talent.active',
          type: 'boolean',
          operators: ['is_true'],
          effects: ['require'],
        },
        {
          field: 'permission.talent.searchable',
          type: 'boolean',
          operators: ['is_true'],
          effects: ['require'],
        },
      ],
      authorizationVersion:
        input.context === TALENT_DISCOVERY_CONTEXTS.public
          ? 'talent-public-anonymous:v1'
          : 'talent-organization-admin:v1',
    })
  }
}

function isAllowedPrincipal(
  context: string,
  principal: FilterPrincipal
): boolean {
  if (context === TALENT_DISCOVERY_CONTEXTS.public) {
    return principal.kind === 'anonymous'
  }

  return (
    context === TALENT_DISCOVERY_CONTEXTS.organization &&
    principal.kind === 'user' &&
    typeof principal.id === 'string' &&
    principal.id.length > 0 &&
    typeof principal.organizationId === 'string' &&
    principal.organizationId.length > 0 &&
    (principal.organizationRole === 'org_owner' || principal.organizationRole === 'org_admin')
  )
}
