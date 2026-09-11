import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

interface SeededSearchContext {
  ownerEmail: string
  taskId: string
  taskTitle: string
  timestamp: number
}

interface DiscoveryRequest {
  criteria: {
    context: 'tasks.discovery.public'
    schemaVersion: 1
    text: { value: string }
    requestedFacets: Array<{ field: 'task.difficulty'; countMode: 'constrained' }>
    page: { size: number; cursor?: string }
  }
  search: { scope: 'task'; retrievalMode: 'lexical' }
}

interface DiscoveryBody {
  hits: Array<{ entityId: string; presentation?: { title: string } }>
  total: { value: number; relation: string }
  facets: Array<{
    field: string
    values: Array<{ value: string; count: number; countRelation?: string }>
  }>
  page: { nextCursor?: string }
  execution: { provider: string; degraded: boolean; partial: boolean }
  authority: { total: { state: string } }
  search: { diagnostics: Array<{ code: string; severity: string }> }
}

interface DiscoveryErrorBody {
  code?: string
  error?: string
}

interface AliasIntegrityFaultControlBody {
  data?: {
    operation?: 'enabled' | 'restored'
    faultIndexName?: string
    backingIndexCount?: number
    faultIndexPresent?: boolean
  }
}

interface CursorClockControlBody {
  data?: {
    operation?: 'advanced' | 'restored'
  }
}

async function seedSearchContext(page: Page, searchMarker: string): Promise<SeededSearchContext> {
  const timestamp = Date.now()
  const response = await page.request.post('/api/testing/seed-marketplace-application-flow', {
    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    data: {
      timestamp,
      nonce: Math.random().toString(36).slice(2, 10),
      withApplication: false,
      searchMarker,
    },
  })
  const body = (await response.json()) as { data?: Partial<SeededSearchContext> }

  expect(response.ok(), JSON.stringify(body)).toBe(true)
  if (!body.data?.ownerEmail || !body.data.taskId || !body.data.taskTitle) {
    throw new Error('RP-FST-09 seed returned incomplete identifiers')
  }

  return {
    ownerEmail: body.data.ownerEmail,
    taskId: body.data.taskId,
    taskTitle: body.data.taskTitle,
    timestamp,
  }
}

async function cleanupSearchContexts(page: Page, seeded: readonly SeededSearchContext[]) {
  const tokens = [...new Set(seeded.map(({ timestamp }) => timestamp))]
  if (tokens.length === 0) return

  const response = await page.request.post('/api/testing/seed-cleanup', {
    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    data: { tokens },
  })
  const body = await response.text()
  expect(response.ok(), body).toBe(true)
}

function makeDiscoveryRequest(query: string, size: number, cursor?: string): DiscoveryRequest {
  return {
    criteria: {
      context: 'tasks.discovery.public',
      schemaVersion: 1,
      text: { value: query },
      requestedFacets: [{ field: 'task.difficulty', countMode: 'constrained' }],
      page: cursor === undefined ? { size } : { size, cursor },
    },
    search: { scope: 'task', retrievalMode: 'lexical' },
  }
}

async function discover(
  page: Page,
  request: DiscoveryRequest
): Promise<{ status: number; body: DiscoveryBody | DiscoveryErrorBody }> {
  return page.evaluate(async (payload) => {
    const response = await fetch('/api/v1/search/discovery', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return {
      status: response.status,
      body: (await response.json()) as DiscoveryBody | DiscoveryErrorBody,
    }
  }, request)
}

async function controlAliasIntegrityFault(
  page: Page,
  operation: 'enable' | 'restore',
  timestamp: number,
  nonce: string
): Promise<AliasIntegrityFaultControlBody> {
  const response = await page.request.post(
    '/api/testing/seed-search-alias-integrity-fault-roleplay',
    {
      headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      data: { timestamp, nonce, operation },
    }
  )
  const body = (await response.json()) as AliasIntegrityFaultControlBody
  expect(response.ok(), JSON.stringify(body)).toBe(true)
  return body
}

async function controlCursorClock(
  page: Page,
  operation: 'advance' | 'restore',
  timestamp: number,
  nonce: string
): Promise<CursorClockControlBody> {
  const response = await page.request.post('/api/testing/seed-search-cursor-clock-roleplay', {
    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    data: { timestamp, nonce, operation },
  })
  const body = (await response.json()) as CursorClockControlBody
  expect(response.ok(), JSON.stringify(body)).toBe(true)
  return body
}

test.describe('Filter/Search/Taxonomy — RP-FST-09 degraded/stale/recovery roleplay', () => {
  test('shows healthy Search, rejects a tampered cursor, and recovers from a fresh request', async ({
    page,
  }) => {
    const searchMarker = `rpFst09${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
    const seeded: SeededSearchContext[] = []
    try {
      for (let index = 0; index < 3; index += 1) {
        seeded.push(await seedSearchContext(page, searchMarker))
      }
      const firstSeed = seeded[0]
      if (!firstSeed) throw new Error('RP-FST-09 did not produce a seed')

      await login(page, firstSeed.ownerEmail)
      await page.goto(`/search?q=${encodeURIComponent(searchMarker)}`)
      await expect(
        page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })
      ).toBeVisible()
      await expect(
        page.getByRole('link').filter({ hasText: firstSeed.taskTitle }).first()
      ).toBeVisible()

      const healthy = await discover(page, makeDiscoveryRequest(searchMarker, 50))
      expect(healthy.status, JSON.stringify(healthy.body)).toBe(200)
      const healthyBody = healthy.body as DiscoveryBody
      const seededTaskIds = new Set(seeded.map(({ taskId }) => taskId))
      const healthyHitIds = healthyBody.hits.map(({ entityId }) => entityId)
      expect(
        healthyHitIds.every((entityId) => seededTaskIds.has(entityId)),
        `healthy Search returned an unexpected task: ${JSON.stringify(healthyHitIds)}`
      ).toBe(true)
      expect(new Set(healthyHitIds)).toEqual(seededTaskIds)
      expect(healthyBody.total.relation).toBe('eq')
      expect(healthyBody.total.value).toBe(healthyHitIds.length)
      expect(healthyBody.authority.total.state).toBe('authoritative')
      expect(healthyBody.execution.degraded).toBe(false)
      expect(healthyBody.execution.partial).toBe(false)
      expect(healthyBody.facets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'task.difficulty',
            values: expect.any(Array),
          }),
        ])
      )
      expect(healthyBody.search.diagnostics).toEqual([])

      const firstPage = await discover(page, makeDiscoveryRequest(searchMarker, 1))
      expect(firstPage.status, JSON.stringify(firstPage.body)).toBe(200)
      const firstPageBody = firstPage.body as DiscoveryBody
      const cursor = firstPageBody.page.nextCursor
      expect(cursor, 'healthy Search must issue an opaque cursor').toBeTruthy()
      if (!cursor) throw new Error('healthy Search did not issue a cursor')

      const tamperedCursor = `${cursor.slice(0, -1)}${cursor.endsWith('x') ? 'y' : 'x'}`
      const tampered = await discover(page, makeDiscoveryRequest(searchMarker, 1, tamperedCursor))
      expect(tampered.status).toBe(400)
      expect((tampered.body as DiscoveryErrorBody).code).toBe('SEARCH_CURSOR_INVALID')

      const recovered = await discover(page, makeDiscoveryRequest(searchMarker, 1))
      expect(recovered.status, JSON.stringify(recovered.body)).toBe(200)
      const recoveredBody = recovered.body as DiscoveryBody
      expect(recoveredBody.hits[0]?.entityId).toBe(firstPageBody.hits[0]?.entityId)
      expect(recoveredBody.authority.total.state).toBe('authoritative')
      expect(recoveredBody.execution.degraded).toBe(false)
      expect(recoveredBody.execution.partial).toBe(false)

      await page.screenshot({
        path: 'test-results/e2e-visual/filter-search-taxonomy/rp-fst-09/chromium/desktop/search-healthy-recovered.png',
        fullPage: true,
      })
    } finally {
      await cleanupSearchContexts(page, seeded)
    }
  })

  test('fails closed on an alias-integrity fault and recovers after the fault control is restored', async ({
    page,
  }) => {
    const searchMarker = `rpFst09Fault${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
    const seeded = await seedSearchContext(page, searchMarker)
    await login(page, seeded.ownerEmail)
    await page.goto(`/search?q=${encodeURIComponent(searchMarker)}&type=task`)
    await expect(
      page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })
    ).toBeVisible()

    const timestamp = Date.now()
    const nonce = `rp-fst-09-${Math.random().toString(36).slice(2, 10)}`
    try {
      const enabled = await controlAliasIntegrityFault(page, 'enable', timestamp, nonce)
      expect(enabled.data?.operation).toBe('enabled')
      expect(enabled.data?.backingIndexCount).toBe(2)
      expect(enabled.data?.faultIndexPresent).toBe(true)

      await page.goto(`/search?q=${encodeURIComponent(searchMarker)}&type=task`)
      const availability = page.getByRole('status', { name: /Search availability/i })
      await expect(availability).toContainText(/compatibility mode/i)
      await expect(availability).toContainText(/canonical Discovery source is unavailable/i)

      const unavailable = await discover(page, makeDiscoveryRequest(searchMarker, 10))
      expect(unavailable.status).toBe(503)
      expect(unavailable.body as DiscoveryErrorBody).toMatchObject({
        code: 'SEARCH_SOURCE_UNAVAILABLE',
      })

      const restored = await controlAliasIntegrityFault(page, 'restore', timestamp, nonce)
      expect(restored.data?.operation).toBe('restored')
      expect(restored.data?.backingIndexCount).toBe(1)
      expect(restored.data?.faultIndexPresent).toBe(false)

      const recovered = await discover(page, makeDiscoveryRequest(searchMarker, 10))
      expect(recovered.status, JSON.stringify(recovered.body)).toBe(200)
      const recoveredBody = recovered.body as DiscoveryBody
      expect(recoveredBody.hits.map(({ entityId }) => entityId)).toEqual([seeded.taskId])
      expect(recoveredBody.authority.total.state).toBe('authoritative')
      expect(recoveredBody.execution.degraded).toBe(false)
      expect(recoveredBody.execution.partial).toBe(false)
    } finally {
      try {
        await controlAliasIntegrityFault(page, 'restore', timestamp, nonce)
      } finally {
        await cleanupSearchContexts(page, [seeded])
      }
    }
  })

  test('surfaces an expired PIT cursor and recovers from a fresh request', async ({ page }) => {
    const searchMarker = `rpFst09Pit${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
    const seeded: SeededSearchContext[] = []
    try {
      for (let index = 0; index < 3; index += 1) {
        seeded.push(await seedSearchContext(page, searchMarker))
      }
      const firstSeed = seeded[0]
      if (!firstSeed) throw new Error('RP-FST-09 PIT fixture did not produce a seed')

      await login(page, firstSeed.ownerEmail)
      await page.goto(`/search?q=${encodeURIComponent(searchMarker)}`)
      await expect(
        page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })
      ).toBeVisible()

      const firstPage = await discover(page, makeDiscoveryRequest(searchMarker, 1))
      expect(firstPage.status, JSON.stringify(firstPage.body)).toBe(200)
      const firstPageBody = firstPage.body as DiscoveryBody
      const cursor = firstPageBody.page.nextCursor
      expect(cursor, 'PIT fixture must issue an opaque cursor').toBeTruthy()
      if (!cursor) throw new Error('PIT fixture did not issue a cursor')

      const timestamp = Date.now()
      const nonce = `rp-fst-09-pit-${Math.random().toString(36).slice(2, 10)}`
      await controlCursorClock(page, 'advance', timestamp, nonce)

      const expired = await discover(page, makeDiscoveryRequest(searchMarker, 1, cursor))
      expect(expired.status).toBe(400)
      expect((expired.body as DiscoveryErrorBody).code).toBe('SEARCH_CURSOR_EXPIRED')

      const restored = await controlCursorClock(page, 'restore', timestamp, nonce)
      expect(restored.data?.operation).toBe('restored')

      const recovered = await discover(page, makeDiscoveryRequest(searchMarker, 1))
      expect(recovered.status, JSON.stringify(recovered.body)).toBe(200)
      const recoveredBody = recovered.body as DiscoveryBody
      expect(recoveredBody.hits[0]?.entityId).toBe(firstPageBody.hits[0]?.entityId)
      expect(recoveredBody.authority.total.state).toBe('authoritative')
      expect(recoveredBody.execution.degraded).toBe(false)
      expect(recoveredBody.execution.partial).toBe(false)
    } finally {
      try {
        const timestamp = Date.now()
        const nonce = `rp-fst-09-pit-cleanup-${Math.random().toString(36).slice(2, 10)}`
        await controlCursorClock(page, 'restore', timestamp, nonce)
      } finally {
        await cleanupSearchContexts(page, seeded)
      }
    }
  })

  test('recovers from an expired cursor through the Search Center UI', async ({ page }) => {
    const searchMarker = `rpFst09UiPit${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
    const seeded: SeededSearchContext[] = []
    let clockControl: { timestamp: number; nonce: string } | null = null
    try {
      for (let index = 0; index < 3; index += 1) {
        seeded.push(await seedSearchContext(page, searchMarker))
      }
      const firstSeed = seeded[0]
      if (!firstSeed) throw new Error('RP-FST-09 UI PIT fixture did not produce a seed')

      await login(page, firstSeed.ownerEmail)
      await page.goto(`/search?q=${encodeURIComponent(searchMarker)}&type=task`)
      await expect(
        page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })
      ).toBeVisible()

      const firstPage = await discover(page, makeDiscoveryRequest(searchMarker, 1))
      expect(firstPage.status, JSON.stringify(firstPage.body)).toBe(200)
      const cursor = (firstPage.body as DiscoveryBody).page.nextCursor
      expect(cursor, 'UI PIT fixture must issue an opaque cursor').toBeTruthy()
      if (!cursor) throw new Error('UI PIT fixture did not issue a cursor')

      clockControl = {
        timestamp: Date.now(),
        nonce: `rp-fst-09-ui-pit-${Math.random().toString(36).slice(2, 10)}`,
      }
      await controlCursorClock(page, 'advance', clockControl.timestamp, clockControl.nonce)

      await page.goto(
        `/search?q=${encodeURIComponent(searchMarker)}&type=task&cursor=${encodeURIComponent(cursor)}`
      )
      await expect(page.getByRole('status', { name: /Search cursor status/i })).toContainText(
        /no longer available|không còn khả dụng/i
      )

      const restored = await controlCursorClock(
        page,
        'restore',
        clockControl.timestamp,
        clockControl.nonce
      )
      expect(restored.data?.operation).toBe('restored')
      clockControl = null

      const freshSearch = page.getByRole('button', { name: /Start a fresh search|Tìm kiếm mới/i })
      await freshSearch.click()
      await page.waitForURL((url) => !url.searchParams.has('cursor'))
      await expect(
        page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })
      ).toBeVisible()
      await expect(page.getByRole('link').first()).toBeVisible()

      await page.screenshot({
        path: 'test-results/e2e-visual/filter-search-taxonomy/rp-fst-09/chromium/desktop/search-cursor-fresh-retry.png',
        fullPage: true,
      })
    } finally {
      try {
        if (clockControl !== null) {
          await controlCursorClock(page, 'restore', clockControl.timestamp, clockControl.nonce)
        }
      } finally {
        await cleanupSearchContexts(page, seeded)
      }
    }
  })

  test('fails closed when a cursor meets an unavailable source and retries fresh', async ({
    page,
  }) => {
    const searchMarker = `rpFst09UiUnavailable${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
    const seeded: SeededSearchContext[] = []
    const timestamp = Date.now()
    const nonce = `rp-fst-09-ui-unavailable-${Math.random().toString(36).slice(2, 10)}`
    try {
      for (let index = 0; index < 3; index += 1) {
        seeded.push(await seedSearchContext(page, searchMarker))
      }
      const firstSeed = seeded[0]
      if (!firstSeed) throw new Error('RP-FST-09 unavailable fixture did not produce a seed')

      await login(page, firstSeed.ownerEmail)
      await page.goto(`/search?q=${encodeURIComponent(searchMarker)}&type=task`)
      await expect(
        page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })
      ).toBeVisible()

      const firstPage = await discover(page, makeDiscoveryRequest(searchMarker, 1))
      expect(firstPage.status, JSON.stringify(firstPage.body)).toBe(200)
      const cursor = (firstPage.body as DiscoveryBody).page.nextCursor
      expect(cursor, 'UI unavailable fixture must issue an opaque cursor').toBeTruthy()
      if (!cursor) throw new Error('UI unavailable fixture did not issue a cursor')

      const enabled = await controlAliasIntegrityFault(page, 'enable', timestamp, nonce)
      expect(enabled.data?.operation).toBe('enabled')
      expect(enabled.data?.faultIndexPresent).toBe(true)

      await page.goto(
        `/search?q=${encodeURIComponent(searchMarker)}&type=task&cursor=${encodeURIComponent(cursor)}`
      )
      const availability = page.getByRole('status', { name: /Search availability/i })
      await expect(availability).toContainText(/compatibility mode|chế độ tương thích/i)
      await expect(availability).toContainText(/canonical Discovery source is unavailable/i)
      await expect(page.getByRole('button', { name: /Retry search|Thử tìm lại/i })).toBeVisible()

      const restored = await controlAliasIntegrityFault(page, 'restore', timestamp, nonce)
      expect(restored.data?.operation).toBe('restored')

      await page.getByRole('button', { name: /Retry search|Thử tìm lại/i }).click()
      await page.waitForURL((url) => !url.searchParams.has('cursor'))
      await expect(
        page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })
      ).toBeVisible()
      await expect(page.getByRole('link').first()).toBeVisible()
    } finally {
      try {
        await controlAliasIntegrityFault(page, 'restore', timestamp, nonce)
      } finally {
        await cleanupSearchContexts(page, seeded)
      }
    }
  })
})
