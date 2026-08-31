import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

interface CacheTaskSeed {
  organizationId: string
  projectId: string
  taskId: string
  ownerEmail: string
  memberEmail: string
  ownerId: string
  memberId: string
  timestamp: number
}

function normalizeFailure(value: unknown, fallbackMessage: string): Error {
  return value instanceof Error ? value : new Error(fallbackMessage)
}

async function seedCacheTaskFlow(page: Page): Promise<CacheTaskSeed> {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 10)
  const response = await page.request.post(`${BASE_URL}/api/testing/seed-cache-task-flow`, {
    data: { timestamp, nonce },
  })
  if (response.status() !== 201) {
    throw new Error(
      `Cache task seed returned HTTP ${String(response.status())}: ${await response.text()}`
    )
  }

  const body = (await response.json()) as { data?: CacheTaskSeed }
  if (!body.data) {
    throw new Error('Cache task seed returned no data')
  }
  return body.data
}

async function cleanupCacheTaskFlow(page: Page, timestamp: number): Promise<void> {
  const response = await page.request.post(`${BASE_URL}/api/testing/seed-cleanup`, {
    data: { timestamp },
  })
  if (response.status() !== 200) {
    throw new Error(
      `Cache task cleanup returned HTTP ${String(response.status())}: ${await response.text()}`
    )
  }
}

async function readCacheHitCount(page: Page): Promise<number> {
  const apiKey = process.env['METRICS_API_KEY']
  if (!apiKey) {
    throw new Error('METRICS_API_KEY is required for the cache Redis E2E role-play')
  }

  const response = await page.request.get(`${BASE_URL}/metrics/cache`, {
    headers: { 'x-api-key': apiKey },
  })
  expect(response.status()).toBe(200)

  const metrics = await response.text()
  const match = metrics.match(/^suar_cache_reads_total\{outcome="hit"\}\s+([0-9.]+)$/m)
  if (!match?.[1]) {
    throw new Error('Cache hit counter is missing from the authenticated metrics response')
  }

  return Number(match[1])
}

async function openTaskBoard(page: Page): Promise<void> {
  const board = page.locator('section.task-board-surface')
  let lastError: unknown

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await page.goto('/tasks', { waitUntil: 'domcontentloaded' })
      if (!response || response.status() >= 400) {
        throw new Error(`Task board navigation returned HTTP ${String(response?.status() ?? 0)}`)
      }
      await expect(board).toBeVisible()
      return
    } catch (error) {
      lastError = error
      if (attempt === 3) break
    }
  }

  const bodyText = await page
    .locator('body')
    .innerText()
    .catch(() => '')
  throw new Error(
    `Task board did not render at ${page.url()} (title=${await page.title().catch(() => 'unknown')}): ${bodyText.slice(0, 1200)}`,
    { cause: lastError }
  )
}

async function readTaskListGenerationDigest(page: Page, organizationId: string): Promise<string> {
  const response = await page.request.post(`${BASE_URL}/api/testing/cache-task-list-generation`, {
    data: { organizationId },
  })
  expect(response.status()).toBe(200)

  const body = (await response.json()) as {
    data?: {
      generationDigest?: string
    }
  }
  const generationDigest = body.data?.generationDigest
  if (!generationDigest) {
    throw new Error('Task-list generation probe returned no digest')
  }
  return generationDigest
}

async function assignTask(page: Page, taskId: string, memberId: string): Promise<void> {
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  if (!csrfToken) {
    throw new Error('Owner task surface did not expose a CSRF token')
  }

  const response = await page.request.put(`${BASE_URL}/tasks/${taskId}`, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': csrfToken,
      'X-Inertia': 'true',
      'X-Requested-With': 'XMLHttpRequest',
    },
    data: { assigned_to: memberId },
  })
  if (response.status() !== 200) {
    throw new Error(
      `Task assignment returned HTTP ${String(response.status())}: ${await response.text()}`
    )
  }
}

async function waitForProcessedTaskInvalidation(
  page: Page,
  taskId: string,
  operation: 'INSERT' | 'UPDATE' = 'UPDATE'
): Promise<void> {
  await expect
    .poll(
      async () => {
        const response = await page.request.post(
          `${BASE_URL}/api/testing/cache-invalidation-status`,
          { data: { taskId, operation } }
        )
        expect(response.status()).toBe(200)
        const body = (await response.json()) as {
          data?: {
            status?: string | null
          }
        }
        return body.data?.status ?? 'missing'
      },
      {
        message: 'the independent E2E invalidation worker must ACK the task mutation',
        timeout: 15_000,
        intervals: [100, 250, 500],
      }
    )
    .toBe('processed')
}

function cacheSeedScopeIds(seed: CacheTaskSeed): string[] {
  return [seed.organizationId, seed.projectId, seed.taskId, seed.ownerId, seed.memberId]
}

async function waitForDrainedCacheInvalidationScopes(
  page: Page,
  scopeIds: string[]
): Promise<void> {
  await expect
    .poll(
      async () => {
        const response = await page.request.post(
          `${BASE_URL}/api/testing/cache-invalidation-scope-status`,
          { data: { scopeIds } }
        )
        expect(response.status()).toBe(200)
        const body = (await response.json()) as {
          data?: {
            counts?: {
              pending?: number
              leased?: number
              deadLetter?: number
            }
          }
        }
        const counts = body.data?.counts
        if ((counts?.deadLetter ?? 0) > 0) {
          throw new Error('Cache invalidation cleanup produced a dead-letter row')
        }
        return (counts?.pending ?? 0) + (counts?.leased ?? 0)
      },
      {
        message: 'the E2E invalidation worker must drain cleanup-generated rows',
        timeout: 30_000,
        intervals: [100, 250, 500],
      }
    )
    .toBe(0)
}

async function purgeProcessedCacheInvalidationScopes(
  page: Page,
  scopeIds: string[]
): Promise<void> {
  const response = await page.request.post(
    `${BASE_URL}/api/testing/cache-invalidation-scope-cleanup`,
    { data: { scopeIds } }
  )
  if (response.status() !== 200) {
    throw new Error(
      `Cache invalidation scope cleanup returned HTTP ${String(response.status())}: ${await response.text()}`
    )
  }
}

test.describe('Cache Redis multi-actor role-play', () => {
  test('hits real Redis, isolates actors, and delivers assignment through the durable outbox', async ({
    browser,
    page,
  }, testInfo) => {
    testInfo.setTimeout(90_000)
    expect(process.env['CACHE_INTEGRATION_DRIVER']).toBe('redis')

    const seeded = await seedCacheTaskFlow(page)
    const otherSeeded = await seedCacheTaskFlow(page)
    await waitForProcessedTaskInvalidation(page, otherSeeded.taskId, 'INSERT')
    const ownerContext = await browser.newContext()
    const memberContext = await browser.newContext()
    const otherOwnerContext = await browser.newContext()
    const ownerPage = await ownerContext.newPage()
    const memberPage = await memberContext.newPage()
    const otherOwnerPage = await otherOwnerContext.newPage()
    const seededTaskTitle = new RegExp(`^Seed Cache Task ${seeded.timestamp}-`)
    const otherSeededTaskTitle = new RegExp(`^Seed Cache Task ${otherSeeded.timestamp}-`)
    let executionFailure: unknown

    try {
      await login(ownerPage, seeded.ownerEmail, { organizationId: seeded.organizationId })
      await openTaskBoard(ownerPage)
      await expect(ownerPage.getByText(seededTaskTitle).first()).toBeVisible()

      const hitsAfterWarmRead = await readCacheHitCount(ownerPage)
      await openTaskBoard(ownerPage)
      await expect(ownerPage.getByText(seededTaskTitle).first()).toBeVisible()
      const hitsAfterRepeatedRead = await readCacheHitCount(ownerPage)

      expect(hitsAfterRepeatedRead).toBeGreaterThan(hitsAfterWarmRead)

      await login(memberPage, seeded.memberEmail, { organizationId: seeded.organizationId })
      await openTaskBoard(memberPage)
      await expect(memberPage.getByText(seededTaskTitle)).toHaveCount(0)

      await login(otherOwnerPage, otherSeeded.ownerEmail, {
        organizationId: otherSeeded.organizationId,
      })
      await openTaskBoard(otherOwnerPage)
      await expect(otherOwnerPage.getByText(otherSeededTaskTitle).first()).toBeVisible()
      await expect(otherOwnerPage.getByText(seededTaskTitle)).toHaveCount(0)

      const organizationGenerationBefore = await readTaskListGenerationDigest(
        ownerPage,
        seeded.organizationId
      )
      const otherOrganizationGenerationBefore = await readTaskListGenerationDigest(
        otherOwnerPage,
        otherSeeded.organizationId
      )

      await assignTask(ownerPage, seeded.taskId, seeded.memberId)
      await waitForProcessedTaskInvalidation(ownerPage, seeded.taskId)
      const organizationGenerationAfter = await readTaskListGenerationDigest(
        ownerPage,
        seeded.organizationId
      )
      const otherOrganizationGenerationAfter = await readTaskListGenerationDigest(
        otherOwnerPage,
        otherSeeded.organizationId
      )
      expect(organizationGenerationAfter).not.toBe(organizationGenerationBefore)
      expect(otherOrganizationGenerationAfter).toBe(otherOrganizationGenerationBefore)

      await login(memberPage, seeded.memberEmail, { organizationId: seeded.organizationId })
      await openTaskBoard(memberPage)
      await expect(memberPage.getByText(seededTaskTitle).first()).toBeVisible()

      await login(otherOwnerPage, otherSeeded.ownerEmail, {
        organizationId: otherSeeded.organizationId,
      })
      await openTaskBoard(otherOwnerPage)
      await expect(otherOwnerPage.getByText(otherSeededTaskTitle).first()).toBeVisible()
      await expect(otherOwnerPage.getByText(seededTaskTitle)).toHaveCount(0)
      await expect(memberPage.locator('body')).not.toContainText('Server Error')
    } catch (error) {
      executionFailure = error
    }

    const contextResults = await Promise.allSettled([
      ownerContext.close(),
      memberContext.close(),
      otherOwnerContext.close(),
    ])
    const cleanupResults = await Promise.allSettled([
      cleanupCacheTaskFlow(page, seeded.timestamp),
      cleanupCacheTaskFlow(page, otherSeeded.timestamp),
    ])
    const cleanupFailure = cleanupResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    )
    if (!cleanupFailure) {
      const scopeIds = [...cacheSeedScopeIds(seeded), ...cacheSeedScopeIds(otherSeeded)]
      await waitForDrainedCacheInvalidationScopes(page, scopeIds)
      await purgeProcessedCacheInvalidationScopes(page, scopeIds)
    }

    if (executionFailure !== undefined) {
      throw normalizeFailure(executionFailure, 'Cache Redis role-play failed')
    }
    const contextFailure = contextResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    )
    if (contextFailure) {
      throw normalizeFailure(contextFailure.reason, 'Browser context cleanup failed')
    }
    if (cleanupFailure) {
      throw normalizeFailure(cleanupFailure.reason, 'Seed cleanup failed')
    }
  })
})
