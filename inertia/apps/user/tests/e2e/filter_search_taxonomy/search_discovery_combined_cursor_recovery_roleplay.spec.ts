import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

interface SeededSearchContext {
  ownerEmail: string
  taskId: string
  taskTitle: string
}

interface DiscoveryPayload {
  criteria: {
    context: 'tasks.discovery.public'
    schemaVersion: 1
    text: { value: string }
    filter: {
      kind: 'condition'
      field: 'task.marketplaceEligible'
      operator: 'is_true'
      effect: 'require'
      unknown: 'exclude'
    }
    preferences: Array<{
      effect: 'prefer'
      weight: 5
      expression: {
        kind: 'condition'
        field: 'task.role'
        operator: 'eq'
        effect: 'require'
        unknown: 'exclude'
        value: { kind: 'scalar'; value: 'sole_contributor' }
      }
    }>
    page: { size: number; cursor?: string }
  }
  search: { scope: 'task'; retrievalMode: 'auto' }
}

interface DiscoveryResponse {
  hits: Array<{ entityId: string; title?: string }>
  total: { value: number; relation: string }
  page: { nextCursor?: string }
  canonicalCriteria: DiscoveryPayload['criteria']
  search: { inputMode: string }
  authority: { total: { state: string } }
}

interface BrowserResponse<T> {
  status: number
  body: T
}

async function seedSearchContext(page: Page, searchMarker: string): Promise<SeededSearchContext> {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 10)
  const response = await page.request.post('/api/testing/seed-marketplace-application-flow', {
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    data: { timestamp, nonce, withApplication: false, searchMarker },
  })
  const body = await response.json() as {
    data?: Partial<SeededSearchContext>
  }

  expect(response.ok(), JSON.stringify(body)).toBe(true)
  if (!body.data?.ownerEmail || !body.data.taskId || !body.data.taskTitle) {
    throw new Error('Search Discovery role-play seed returned incomplete identifiers')
  }

  return {
    ownerEmail: body.data.ownerEmail,
    taskId: body.data.taskId,
    taskTitle: body.data.taskTitle,
  }
}

function makePayload(text: string, size: number, cursor?: string): DiscoveryPayload {
  return {
    criteria: {
      context: 'tasks.discovery.public',
      schemaVersion: 1,
      text: { value: text },
      filter: {
        kind: 'condition',
        field: 'task.marketplaceEligible',
        operator: 'is_true',
        effect: 'require',
        unknown: 'exclude',
      },
      preferences: [
        {
          effect: 'prefer',
          weight: 5,
          expression: {
            kind: 'condition',
            field: 'task.role',
            operator: 'eq',
            effect: 'require',
            unknown: 'exclude',
            value: { kind: 'scalar', value: 'sole_contributor' },
          },
        },
      ],
      page: cursor === undefined ? { size } : { size, cursor },
    },
    search: { scope: 'task', retrievalMode: 'auto' },
  }
}

async function discover(
  page: Page,
  payload: DiscoveryPayload
): Promise<BrowserResponse<DiscoveryResponse | { code?: string; error?: string }>> {
  return page.evaluate(async (request) => {
    const response = await fetch('/api/v1/search/discovery', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    return {
      status: response.status,
      body: (await response.json()) as DiscoveryResponse | { code?: string; error?: string },
    }
  }, payload)
}

test.describe('Filter/Search/Taxonomy — authenticated Search Discovery roleplay', () => {
  test('combines q, strict eligibility, preference ranking, and recovers from a bad cursor', async ({ page }) => {
    await page.goto('/marketplace/tasks')
    const searchMarker = `zxq${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
    const seeded = [
      await seedSearchContext(page, searchMarker),
      await seedSearchContext(page, searchMarker),
      await seedSearchContext(page, searchMarker),
    ]
    const firstSeed = seeded[0]
    if (!firstSeed) throw new Error('Search Discovery role-play did not produce a first seed')
    await login(page, firstSeed.ownerEmail)

    await page.goto('/search')
    await expect(page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })).toBeVisible()

    const query = searchMarker
    const targetIds = seeded.map(({ taskId }) => taskId)
    const baseline = makePayload(query, 50)
    delete (baseline.criteria as { filter?: unknown }).filter
    delete (baseline.criteria as { preferences?: unknown }).preferences
    const baselineResponse = await discover(page, baseline)
    expect(
      baselineResponse.status,
      `canonical task baseline failed before structured criteria: ${JSON.stringify(baselineResponse.body)}`
    ).toBe(200)

    let indexed: BrowserResponse<DiscoveryResponse | { code?: string; error?: string }> | undefined

    let indexedCount = 0
    const indexingDeadline = Date.now() + 20_000
    while (Date.now() < indexingDeadline && indexedCount < targetIds.length) {
      indexed = await discover(page, makePayload(query, 50))
      if (indexed.status === 200) {
        const body = indexed.body as DiscoveryResponse
        indexedCount = targetIds.filter((taskId) => body.hits.some((hit) => hit.entityId === taskId)).length
      }
      if (indexedCount < targetIds.length) await page.waitForTimeout(1_000)
    }
    expect(
      indexedCount,
      `seeded documents were not discoverable: status=${indexed?.status ?? 'unknown'} body=${JSON.stringify(indexed?.body)}`
    ).toBe(targetIds.length)

    expect(indexed?.status).toBe(200)
    const indexedBody = indexed?.body as DiscoveryResponse
    expect(indexedBody.canonicalCriteria.text.value).toBe(query)
    expect(indexedBody.canonicalCriteria.filter.field).toBe('task.marketplaceEligible')
    expect(indexedBody.canonicalCriteria.preferences[0]?.expression.field).toBe('task.role')
    expect(indexedBody.search.inputMode).toBe('combined')
    expect(indexedBody.authority.total.state).toBe('authoritative')
    expect(
      indexedBody.hits.every((hit) => targetIds.includes(hit.entityId)),
      `unexpected hits=${JSON.stringify(indexedBody.hits)} targetIds=${JSON.stringify(targetIds)}`
    ).toBe(true)

    const firstPage = await discover(page, makePayload(query, 1))
    expect(firstPage.status).toBe(200)
    const firstBody = firstPage.body as DiscoveryResponse
    expect(firstBody.page.nextCursor, 'seeded results must produce a real cursor').toBeTruthy()

    const nextPage = await discover(page, makePayload(query, 1, firstBody.page.nextCursor))
    expect(nextPage.status).toBe(200)
    const nextBody = nextPage.body as DiscoveryResponse
    expect(nextBody.hits[0]?.entityId).not.toBe(firstBody.hits[0]?.entityId)

    const cursor = firstBody.page.nextCursor as string
    const tamperedCursor = `${cursor.slice(0, -1)}${cursor.endsWith('x') ? 'y' : 'x'}`
    const invalid = await discover(page, makePayload(query, 1, tamperedCursor))
    expect(invalid.status).toBe(400)
    expect((invalid.body as { code?: string }).code).toBe('SEARCH_CURSOR_INVALID')

    const recovered = await discover(page, makePayload(query, 1))
    expect(recovered.status).toBe(200)
    expect((recovered.body as DiscoveryResponse).hits[0]?.entityId).toBe(firstBody.hits[0]?.entityId)

    await page.screenshot({
      path: 'test-results/e2e-visual/filter-search-taxonomy/rp-fst-03/chromium/desktop/search-discovery-combined-cursor-recovery.png',
      fullPage: true,
    })
  })
})
