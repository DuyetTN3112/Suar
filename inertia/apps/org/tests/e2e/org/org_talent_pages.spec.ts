import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_OWNER = 'tranngocduyet31@gmail.com'
const UUID_RE = /^[0-9a-f-]{36}$/i

interface SeedTalentResponse {
  data: {
    talentId: string
    talentEmail: string
    publicAccomplishment?: {
      accomplishmentId: string
      canonicalHash: string
      lifecycleRevisionId: string
      title: string
      taskId: string
      privateSourceMarker: string
    } | null
  }
}

async function expectOrgTalentsReady(page: import('@playwright/test').Page) {
  await expect(
    page.getByRole('heading', { name: /Danh bạ Talent|Organization talent directory/i })
  ).toBeVisible()
  await expect(page.getByTestId('talent-search-keyword')).toBeVisible()
}

test.describe('Org Talent Pages E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_OWNER)
  })

  // ─── HAPPY: org admin searches talent and opens detail ───
  test('org admin searches talent and opens detail', async ({ page }) => {
    const seedResponse = await page.request.post('http://127.0.0.1:3333/api/testing/seed-e2e', {
      data: { timestamp: Date.now(), publicAccomplishment: true },
    })
    expect(seedResponse.status()).toBe(200)
    const seedBody = (await seedResponse.json()) as SeedTalentResponse
    expect(seedBody.data.talentId).toMatch(UUID_RE)
    expect(seedBody.data.publicAccomplishment?.accomplishmentId).toMatch(UUID_RE)

    const publication = seedBody.data.publicAccomplishment
    expect(publication).toBeDefined()
    if (!publication) return
    await login(page, seedBody.data.talentEmail)
    const publicationRequest = {
      idempotencyKey: `org-talent-publication-${Date.now()}`,
      expectedSourceCanonicalHash: publication.canonicalHash,
      expectedLifecycleRevisionId: publication.lifecycleRevisionId,
      confirmed: true,
    }
    const publicationResponse = await page.request.post(
      `http://127.0.0.1:3333/api/v1/accomplishments/${publication.accomplishmentId}/publication`,
      { data: publicationRequest }
    )
    const publicationText = await publicationResponse.text()
    expect(publicationResponse.status(), publicationText).toBe(201)
    const publicationBody = JSON.parse(publicationText) as {
      projection: { title: string; disclosure: { redactionState: string } }
    }
    expect(publicationBody.projection.title).toBe(publication.title)
    expect(publicationBody.projection.disclosure.redactionState).toBe('generalized')
    const replay = await page.request.post(
      `http://127.0.0.1:3333/api/v1/accomplishments/${publication.accomplishmentId}/publication`,
      { data: publicationRequest }
    )
    const replayText = await replay.text()
    expect(replay.status(), replayText).toBe(201)
    const replayBody = JSON.parse(replayText) as {
      data?: { inserted?: boolean }
      inserted?: boolean
    }
    expect(replayBody.data?.inserted ?? replayBody.inserted).toBe(false)
    await login(page, E2E_OWNER)

    await page.goto('/org/talents')
    await expectOrgTalentsReady(page)
    const publicCard = page.getByTestId(`public-accomplishments-${seedBody.data.talentId}`)
    await expect(publicCard).toBeVisible()
    await expect(publicCard).toContainText('Public-safe')
    await expect(publicCard).toContainText('Verified')
    await expect(publicCard).not.toContainText(publication.privateSourceMarker)
    await expect(publicCard).not.toContainText(publication.taskId)
    await expect(publicCard).not.toContainText('reviewer')
    await expect(publicCard).not.toContainText('evidence')
    await expect(page.getByRole('link', { name: /^(Hồ sơ|Profile)$/i }).first()).toBeVisible()
    await page.screenshot({
      path: 'test-results/e2e-visual/talent-discovery/01-public-talent-directory.png',
      fullPage: true,
    })

    await expect
      .poll(async () => page.getByRole('link', { name: /^(Hồ sơ|Profile)$/i }).count())
      .toBeGreaterThan(0)

    await page.getByRole('link', { name: /^(Hồ sơ|Profile)$/i }).first().click()
    await expect(page.locator('textarea#bookmark-notes')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('recruiter sees an accomplishment retire from the public directory after owner unpublishes', async ({ page, request }) => {
    const seedResponse = await page.request.post('http://127.0.0.1:3333/api/testing/seed-e2e', {
      data: { timestamp: Date.now(), publicAccomplishment: true },
    })
    expect(seedResponse.status()).toBe(200)
    const seedBody = (await seedResponse.json()) as SeedTalentResponse
    const publication = seedBody.data.publicAccomplishment
    expect(publication).toBeDefined()
    if (!publication) return

    await login(page, seedBody.data.talentEmail)
    const publishResponse = await page.request.post(
      `http://127.0.0.1:3333/api/v1/accomplishments/${publication.accomplishmentId}/publication`,
      {
        data: {
          idempotencyKey: `org-talent-unpublish-${Date.now()}`,
          expectedSourceCanonicalHash: publication.canonicalHash,
          expectedLifecycleRevisionId: publication.lifecycleRevisionId,
          confirmed: true,
        },
      }
    )
    expect(publishResponse.status()).toBe(201)
    const published = (await publishResponse.json()) as {
      projection?: { id?: string; publicationVersion?: number }
    }
    const projectionId = published.projection?.id
    const publicationVersion = published.projection?.publicationVersion
    expect(projectionId).toMatch(UUID_RE)
    expect(publicationVersion).toBe(1)
    if (!projectionId || publicationVersion !== 1) return

    const publishDrain = await page.request.post('http://127.0.0.1:3333/api/testing/drain-domain-event-outbox')
    expect(publishDrain.status()).toBe(200)
    const publishDrainBody = (await publishDrain.json()) as { data?: { processed?: number } }
    expect(publishDrainBody.data?.processed).toBeGreaterThan(0)

    const publicSearchRequest = {
      criteria: {
        context: 'talents.discovery.public',
        schemaVersion: 1,
        text: { value: publication.title },
        page: { size: 10 },
      },
      search: { scope: 'talent', retrievalMode: 'lexical' },
    }
    const publicSearchBefore = await request.post('http://127.0.0.1:3333/api/v1/search/discovery', {
      data: publicSearchRequest,
    })
    expect(publicSearchBefore.status()).toBe(200)
    const publicSearchBeforeBody = (await publicSearchBefore.json()) as {
      hits: Array<{ entityId: string }>
      total: { value: number }
    }
    expect(publicSearchBeforeBody.hits.map(({ entityId }) => entityId)).toContain(seedBody.data.talentId)
    expect(publicSearchBeforeBody.total.value).toBeGreaterThan(0)
    expect(JSON.stringify(publicSearchBeforeBody)).not.toContain(publication.privateSourceMarker)

    await login(page, E2E_OWNER)
    await page.goto('/org/talents')
    await expectOrgTalentsReady(page)
    const publicCard = page.getByTestId(`public-accomplishments-${seedBody.data.talentId}`)
    await expect(publicCard).toBeVisible()
    await expect(publicCard).not.toContainText(publication.privateSourceMarker)
    await page.screenshot({
      path: 'test-results/e2e-visual/talent-discovery/02-before-unpublish.png',
      fullPage: true,
    })

    await login(page, seedBody.data.talentEmail)
    const unpublishResponse = await page.request.delete(
      `http://127.0.0.1:3333/api/v1/accomplishments/${publication.accomplishmentId}/publication`,
      { data: { projectionId, publicationVersion, confirmed: true } }
    )
    const unpublishText = await unpublishResponse.text()
    expect(unpublishResponse.status(), unpublishText).toBe(200)
    expect((JSON.parse(unpublishText) as { changed?: boolean }).changed).toBe(true)
    const unpublishDrain = await page.request.post('http://127.0.0.1:3333/api/testing/drain-domain-event-outbox')
    expect(unpublishDrain.status()).toBe(200)

    const publicSearchAfter = await request.post('http://127.0.0.1:3333/api/v1/search/discovery', {
      data: publicSearchRequest,
    })
    expect(publicSearchAfter.status()).toBe(200)
    const publicSearchAfterBody = (await publicSearchAfter.json()) as {
      hits: Array<{ entityId: string }>
      total: { value: number }
    }
    expect(publicSearchAfterBody.hits.map(({ entityId }) => entityId)).not.toContain(seedBody.data.talentId)
    expect(publicSearchAfterBody.total.value).toBe(0)
    expect(JSON.stringify(publicSearchAfterBody)).not.toContain(publication.privateSourceMarker)

    await login(page, E2E_OWNER)
    await page.goto('/org/talents')
    await expectOrgTalentsReady(page)
    await expect(page.getByTestId(`public-accomplishments-${seedBody.data.talentId}`)).toHaveCount(0)
    await page.screenshot({
      path: 'test-results/e2e-visual/talent-discovery/03-after-unpublish.png',
      fullPage: true,
    })
  })

  // ─── HAPPY: recruiter bookmarks talent from detail ───
  test('recruiter bookmarks talent from detail page', async ({ page }) => {
    const seedResponse = await page.request.post('http://127.0.0.1:3333/api/testing/seed-e2e', {
      data: { timestamp: Date.now(), publicAccomplishment: true },
    })
    expect(seedResponse.status()).toBe(200)
    const seedBody = (await seedResponse.json()) as SeedTalentResponse
    expect(seedBody.data.talentId).toMatch(UUID_RE)

    await page.goto('/org/talents')
    await expectOrgTalentsReady(page)

    await expect
      .poll(async () => page.getByRole('link', { name: /^(Hồ sơ|Profile)$/i }).count())
      .toBeGreaterThan(0)

    await page.getByRole('link', { name: /^(Hồ sơ|Profile)$/i }).first().click()
    await expect(page.locator('textarea#bookmark-notes')).toBeVisible()

    // Verify bookmark form fields
    await expect(page.locator('input#bookmark-folder')).toBeVisible()

    // Fill bookmark details and save
    await page.fill('textarea#bookmark-notes', 'E2E testing bookmark notes')
    await page.fill('input#bookmark-folder', 'E2E Test Group')

    const saveBtn = page
      .getByRole('button', {
        name: /Lưu talent|Cập nhật bookmark|Save talent|Update bookmark/i,
      })
      .first()
    await saveBtn.click()

    // Verify saved state is reflected in page behavior
    await expect(
      page.getByText(/Đã lưu talent này trong recruiter bookmarks|Saved in recruiter bookmarks/i)
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Cập nhật bookmark|Update bookmark/i })
    ).toBeVisible()
  })

  // ─── SAFETY: org talent shell renders stable listing state ───
  test('org talents page renders listing shell with results or empty state', async ({ page }) => {
    await page.goto('/org/talents')
    await expectOrgTalentsReady(page)

    await expect(
      page
        .getByRole('link', { name: /^(Hồ sơ|Profile)$/i })
        .first()
        .or(page.getByText(/Không tìm thấy talent nào|No talent found/i))
    ).toBeVisible()
  })

  // ─── UNHAPPY: malformed filter query does not crash ───
  test('malformed filter query does not crash page', async ({ page }) => {
    // Navigate with invalid query params
    await page.goto('/org/talents?filter=invalid&status=!!!&skill=')
    await expectOrgTalentsReady(page)

    // Page should render without crashing
    await expect(page.locator('text=500|Server Error|Lỗi hệ thống|System error')).toHaveCount(0)
  })

  // ─── UNHAPPY: empty search result renders explicit state ───
  test('empty search result renders explicit empty state', async ({ page }) => {
    await page.goto('/org/talents')
    await expectOrgTalentsReady(page)

    // Search for non-existent talent
    await page.getByTestId('talent-search-keyword').fill('ZZZZNONEXISTENT_USER_XYZ')
    await page.getByRole('button', { name: /Tìm kiếm|Search/i }).click()
    await expect(page).toHaveURL(/q=ZZZZNONEXISTENT_USER_XYZ/)

    await expect
      .poll(async () => {
        const emptyStateCount = await page
          .getByText(/Không tìm thấy talent nào|No talent found/i)
          .count()
        const resultCount = await page
          .getByRole('link', { name: /^(Hồ sơ|Profile)$/i })
          .count()
        return { emptyStateCount, resultCount }
      })
      .toEqual({ emptyStateCount: 1, resultCount: 0 })
  })
})
