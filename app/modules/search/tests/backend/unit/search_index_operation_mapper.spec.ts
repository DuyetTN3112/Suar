import { test } from '@japa/runner'

import {
  safeSearchIndexOperationDiagnostic,
  searchIndexOperatorAuditContext,
} from '#modules/search/controllers/mappers/request/index-administration/search_index_operation_mapper'

test.group('', () => {
  test('maps the authorized operator to transport audit context', ({ assert }) => {
    const context = searchIndexOperatorAuditContext(
      {
        id: 'search-admin',
        systemRole: 'system_admin',
        actorType: 'service',
        authenticationProvenance: 'runtime_environment',
      },
      'workflow-123'
    )

    assert.deepEqual(context, {
      userId: 'search-admin',
      ip: '0.0.0.0',
      userAgent: 'search-index-operations-cli:workflow-123',
      organizationId: null,
      actorRoleSurface: 'system_admin',
      requestId: null,
      traceId: null,
      workflowId: 'workflow-123',
    })
  })

  test('formats only the safe error class and code', ({ assert }) => {
    assert.equal(
      safeSearchIndexOperationDiagnostic({
        name: 'SearchIndexAdministrationError',
        code: 'SEARCH_INDEX_STALE_PLAN',
        message: 'sensitive upstream detail',
      }),
      'class=SearchIndexAdministrationError code=SEARCH_INDEX_STALE_PLAN'
    )
    assert.equal(
      safeSearchIndexOperationDiagnostic(new Error('sensitive failure')),
      'class=Error code=UNCLASSIFIED'
    )
  })

})
