import type { HttpContext } from '@adonisjs/core/http'


export interface JoinOrganizationRequestInput {
  organizationId: string
  responseMode: 'html' | 'json'
}

export function buildJoinOrganizationRequestInput(
  request: HttpContext['request'],
  organizationId: string
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
