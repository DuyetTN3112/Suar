import type { AuthorizedSearchIndexOperator } from '#modules/search/actions/dtos/search_index_operator'

export function searchIndexOperatorAuditContext(
  operator: AuthorizedSearchIndexOperator,
  workflowId: string
) {
  return {
    userId: operator.id,
    ip: '0.0.0.0',
    userAgent: `search-index-operations-cli:${workflowId}`,
    organizationId: null,
    actorRoleSurface: operator.systemRole,
    requestId: null,
    traceId: null,
    workflowId,
  }
}

export function safeSearchIndexOperationDiagnostic(error: unknown): string {
  const errorClass =
    typeof error === 'object' && error !== null && 'name' in error && typeof error.name === 'string'
      ? error.name
      : 'UnknownError'
  const errorCode =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : 'UNCLASSIFIED'
  return `class=${errorClass} code=${errorCode}`
}
