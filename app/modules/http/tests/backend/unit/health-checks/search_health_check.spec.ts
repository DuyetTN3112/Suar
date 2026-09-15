import { test } from '@japa/runner'

import { SearchHealthCheck } from '#modules/http/health_checks/search_health_check'

function searchHealthPort(
  overrides: Partial<{
    enabled: boolean
    ping: () => Promise<boolean>
  }> = {}
) {
  return {
    isEnabled: () => overrides.enabled ?? true,
    ping: overrides.ping ?? (() => Promise.resolve(true)),
    talentIndexName: () => 'talent-test',
  }
}

test.group('SearchHealthCheck', () => {
  test('does not expose dependency diagnostics in health metadata', async ({ assert }) => {
    const diagnostic = 'password=secret search endpoint=https://internal-search:9200'
    const events: unknown[] = []
    const check = new SearchHealthCheck(
      searchHealthPort({
        ping: () => Promise.reject(new Error(diagnostic)),
      }),
      {
        log: (_level, event) => {
          events.push(event)
        },
      }
    )

    const result = await check.run()

    assert.equal(result.status, 'warning')
    assert.equal(result.meta?.['enabled'], true)
    assert.equal(result.meta?.['index'], 'talent-test')
    assert.notProperty(result.meta, 'error')
    assert.notInclude(JSON.stringify(result), diagnostic)
    assert.include(JSON.stringify(events), 'password=[REDACTED]')
    assert.notInclude(JSON.stringify(events), 'password=secret')
  })
})
