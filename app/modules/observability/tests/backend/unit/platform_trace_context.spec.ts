import { test } from '@japa/runner'

import { buildPlatformTraceContext, createCorrelationKey } from '#modules/observability/public_contracts/platform_trace_context'

test.group('Unit | Platform Trace Context', () => {
  test('falls back from traceId to requestId and keeps workflow metadata', ({ assert }) => {
    const trace = buildPlatformTraceContext({
      requestId: 'req-42',
      workflow: 'global_search',
      frontendSubmissionId: 'frontend-1',
    })

    assert.equal(trace.id, 'req-42')
    assert.equal(trace.workflow_id, 'global_search')
    assert.equal(trace.frontend_submission_id, 'frontend-1')
  })

  test('creates stable hashed correlation keys', ({ assert }) => {
    const keyA = createCorrelationKey(['command_menu', 'elastic'])
    const keyB = createCorrelationKey(['command_menu', 'elastic'])

    assert.equal(keyA, keyB)
    assert.lengthOf(keyA, 64)
  })
})
