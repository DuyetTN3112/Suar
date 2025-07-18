import type { HttpContext } from '@adonisjs/core/http'

import type { DatabaseId } from '#types/database'

export interface JoinOrganizationRequestInput {
  organizationId: DatabaseId
  responseMode: 'html' | 'json'
}

export function buildJoinOrganizationRequestInput(
  request: HttpContext['request'],
  organizationId: DatabaseId
): JoinOrganizationRequestInput {
  const contentType = request.accepts(['html', 'json'])
  const xmlHttpHeader = request.header('X-Requested-With')
  const responseMode =
    contentType === 'json' || xmlHttpHeader === 'XMLHttpRequest' ? 'json' : 'html'

  return {
    organizationId,
    responseMode,
  }
}
