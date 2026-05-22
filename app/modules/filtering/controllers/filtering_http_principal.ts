import type { HttpContext } from '@adonisjs/core/http'

import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
import { resolveCurrentOrganizationId } from '#modules/http/boundary/http_execution_context'

export function filteringPrincipalFromHttp(ctx: HttpContext): FilterPrincipal {
  const user = ctx.auth.user
  if (!user) return { kind: 'anonymous' }

  const organizationId = resolveCurrentOrganizationId(ctx)
  return {
    kind: 'user',
    id: user.id,
    ...(organizationId === null ? {} : { organizationId }),
    ...(ctx.currentOrganizationRole === undefined
      ? {}
      : { organizationRole: ctx.currentOrganizationRole }),
  }
}
