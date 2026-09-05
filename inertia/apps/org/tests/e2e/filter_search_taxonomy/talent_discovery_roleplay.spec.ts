import { expect, test } from '@playwright/test'

import { captureFilterSearchTaxonomyEvidence } from '../../shared/e2e/filter_search_taxonomy_evidence.js'
import { login } from '../../shared/e2e/helpers.js'

const E2E_OWNER = 'tranngocduyet31@gmail.com'

interface InertiaTalentPage {
  props?: {
    talents?: Array<{ id?: string; username?: string }>
    filters?: Record<string, unknown>
    pagination?: {
      mode?: string
      total?: number
    }
    search?: Record<string, unknown>
  }
}

interface TalentDiscoveryRoleplaySeed {
  data?: {
    skillId?: string
    strongMatchTalentIds?: string[]
    decoyTalentIds?: string[]
    matchingTalentCount?: number
    excludedTalentCount?: number
  }
}

test.describe('Filter/Search/Taxonomy — organization Talent discovery roleplay', () => {
  test('applies a filter through the visible org UI and records the server consequence', async ({
    page,
  }, testInfo) => {
    await login(page, E2E_OWNER)
    const seed = await page.request.post('/api/testing/seed-e2e', {
      data: { timestamp: Date.now(), publicAccomplishment: false },
    })
    expect(seed.status(), await seed.text()).toBe(200)

    await page.goto('/org/talents')
    await expect(
      page.getByRole('heading', { name: /Organization talent directory|Danh bạ Talent/i })
    ).toBeVisible()
    await expect(page.getByTestId('talent-business-domain')).toBeVisible()

    const navigation = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/org/talents') &&
        response.headers()['x-inertia'] === 'true'
    )
    await page.getByTestId('talent-business-domain').selectOption('fintech')
    await page.getByRole('button', { name: /Search|Tìm kiếm/i }).click()
    const response = await navigation
    const responseBody = await response.text()
    expect(response.status(), responseBody).toBe(200)

    const body = JSON.parse(responseBody) as InertiaTalentPage
    expect(body.props?.filters?.business_domain).toBe('fintech')
    expect(body.props?.pagination?.mode).toBe('cursor')
    await expect(page).toHaveURL(/business_domain=fintech/)
    await expect(page.locator('body')).not.toContainText(/500|Server Error|Lỗi hệ thống/i)

    await captureFilterSearchTaxonomyEvidence(page, testInfo, {
      journeyId: 'RP-FST-03',
      actor: E2E_OWNER,
      route: '/org/talents?business_domain=fintech',
      criteria: { business_domain: 'fintech' },
      backend: {
        status: response.status(),
        consequence: 'Inertia props echo the selected business_domain and render the filtered page.',
        responseContract: 'org.talents.cursor-page',
      },
      result: {
        count: body.props?.talents?.length ?? 0,
        visibleState: (body.props?.talents?.length ?? 0) > 0 ? 'results' : 'empty-state',
      },
      screenshotPath:
        'test-results/e2e-visual/filter-search-taxonomy/rp-fst-03/chromium/desktop/talent-filter-only.png',
    })
  })

  test('exposes the canonical Talent Search Discovery cursor/secondary contract', async ({
    page,
  }) => {
    await login(page, E2E_OWNER)
    const seed = await page.request.post('/api/testing/seed-e2e', {
      data: { timestamp: Date.now(), publicAccomplishment: false },
    })
    expect(seed.status(), await seed.text()).toBe(200)
    await page.goto('/org/talents')
    await expect(page.getByTestId('talent-search-keyword')).toBeVisible()

    const navigation = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/org/talents') &&
        response.headers()['x-inertia'] === 'true'
    )
    await page.getByTestId('talent-search-keyword').fill('talent-discovery-roleplay')
    await page.getByRole('button', { name: /Search|Tìm kiếm/i }).click()
    const response = await navigation
    expect(response.status()).toBe(200)

    const body = (await response.json()) as InertiaTalentPage
    expect(
      body.props?.pagination?.mode,
      'The user-visible Talent route must expose canonical cursor pagination.'
    ).toBe('cursor')
    expect(
      body.props?.search,
      'The org Talent page must expose Search Discovery authority/secondary metadata.'
    ).toBeDefined()
  })

  test('submits two seeded skills as one same-talent contains-all filter', async ({ page }) => {
    await login(page, E2E_OWNER)
    const seed = await page.request.post('/api/testing/seed-e2e', {
      data: { timestamp: Date.now(), publicAccomplishment: false, multiSkill: true },
    })
    expect(seed.status(), await seed.text()).toBe(200)
    const seedBody = (await seed.json()) as { data?: { talentSkillIds?: string[] } }
    const talentSkillIds = seedBody.data?.talentSkillIds ?? []
    expect(talentSkillIds).toHaveLength(2)

    await page.goto('/org/talents')
    const skillFilter = page.getByTestId('talent-skill-filter')
    await expect(skillFilter).toHaveAttribute('multiple')
    await skillFilter.selectOption(talentSkillIds)

    const navigation = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/org/talents') &&
        response.headers()['x-inertia'] === 'true'
    )
    await page.getByRole('button', { name: /Search|Tìm kiếm/i }).click()
    const response = await navigation
    expect(response.status()).toBe(200)
    const body = (await response.json()) as InertiaTalentPage
    expect([...((body.props?.filters?.skill_ids as string[] | undefined) ?? [])].sort()).toEqual(
      [...talentSkillIds].sort()
    )
    expect(body.props?.pagination?.mode).toBe('cursor')
  })

  test('round-trips multi-skill proficiency and availability filters through Inertia', async ({
    page,
  }) => {
    await login(page, E2E_OWNER)
    const seed = await page.request.post('/api/testing/seed-e2e', {
      data: {
        timestamp: Date.now(),
        publicAccomplishment: false,
        multiSkill: true,
        availableFrom: '2026-09-15',
      },
    })
    expect(seed.status(), await seed.text()).toBe(200)
    const seedBody = (await seed.json()) as { data?: { talentSkillIds?: string[] } }
    const talentSkillIds = seedBody.data?.talentSkillIds ?? []
    expect(talentSkillIds).toHaveLength(2)

    await page.goto('/org/talents')
    await page.getByTestId('talent-skill-filter').selectOption(talentSkillIds)
    await page.getByTestId('talent-min-proficiency').selectOption('l7')
    await page.getByTestId('talent-available-before').fill('2026-10-01')

    const navigation = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/org/talents') &&
        response.headers()['x-inertia'] === 'true'
    )
    await page.getByRole('button', { name: /Search|Tìm kiếm/i }).click()
    const response = await navigation
    const body = (await response.json()) as InertiaTalentPage

    expect(response.status()).toBe(200)
    expect(body.props?.filters?.min_proficiency).toBe('l7')
    expect(body.props?.filters?.available_before).toBe('2026-10-01')
    expect(body.props?.pagination?.mode).toBe('cursor')
    const finalUrl = new URL(page.url())
    expect(finalUrl.searchParams.get('min_proficiency')).toBe('l7')
    expect(finalUrl.searchParams.get('available_before')).toBe('2026-10-01')
  })

  test('proves same-object proficiency, privacy exclusion, and cursor traversal', async ({
    page,
  }, testInfo) => {
    await login(page, E2E_OWNER)
    const seed = await page.request.post('/api/testing/seed-e2e', {
      data: {
        timestamp: Date.now(),
        seedTalentDiscoveryRoleplay: true,
      },
    })
    const seedText = await seed.text()
    expect(seed.status(), seedText).toBe(200)

    const seedBody = JSON.parse(seedText) as TalentDiscoveryRoleplaySeed
    const skillId = seedBody.data?.skillId
    const strongMatchTalentIds = seedBody.data?.strongMatchTalentIds ?? []
    const decoyTalentIds = seedBody.data?.decoyTalentIds ?? []
    const matchingTalentCount = seedBody.data?.matchingTalentCount
    const excludedTalentCount = seedBody.data?.excludedTalentCount
    expect(skillId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(strongMatchTalentIds).toHaveLength(2)
    expect(strongMatchTalentIds.every((id) => /^[0-9a-f-]{36}$/i.test(id))).toBe(true)
    expect(decoyTalentIds).toHaveLength(2)
    expect(decoyTalentIds.every((id) => /^[0-9a-f-]{36}$/i.test(id))).toBe(true)
    expect(matchingTalentCount).toBe(2)
    expect(excludedTalentCount).toBe(2)
    if (!skillId || decoyTalentIds.length !== 2 || strongMatchTalentIds.length !== 2) return

    const talentPage = await page.goto('/org/talents')
    if (!talentPage || talentPage.status() >= 400) {
      const talentPageBody = await page.locator('body').innerText()
      throw new Error(
        `Talent page failed: ${page.url()} status=${talentPage?.status() ?? 'none'} body=${(
          talentPageBody
        ).slice(0, 500)}`
      )
    }
    await expect(
      page.getByRole('heading', { name: /Organization talent directory|Danh bạ Talent/i })
    ).toBeVisible()
    await page.getByTestId('talent-skill-filter').selectOption(skillId)
    await page.getByTestId('talent-min-proficiency').selectOption('l10')

    const navigation = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/org/talents') &&
        response.headers()['x-inertia'] === 'true'
    )
    await page.getByRole('button', { name: /Search|Tìm kiếm/i }).click()
    const response = await navigation
    const responseText = await response.text()
    expect(response.status(), responseText).toBe(200)

    const body = JSON.parse(responseText) as InertiaTalentPage
    const firstTalentIds = (body.props?.talents ?? [])
      .map((talent) => talent.id)
      .filter((id): id is string => typeof id === 'string')
    expect(body.props?.filters?.skill_ids).toEqual([skillId])
    expect(body.props?.filters?.min_proficiency).toBe('l10')
    expect(body.props?.pagination?.mode).toBe('cursor')
    expect(body.props?.pagination?.total).toBe(matchingTalentCount)
    expect(firstTalentIds).toHaveLength(matchingTalentCount ?? 0)
    expect(firstTalentIds).toEqual(expect.arrayContaining(strongMatchTalentIds))
    for (const decoyTalentId of decoyTalentIds) {
      expect(firstTalentIds).not.toContain(decoyTalentId)
      expect(JSON.stringify(body)).not.toContain(decoyTalentId)
    }

    const cursorQuery = new URLSearchParams({
      skill_ids: skillId,
      min_proficiency: 'l10',
      per_page: '1',
    })
    await page.goto(`/org/talents?${cursorQuery.toString()}`)
    const firstCursorProfile = page.getByRole('link', { name: /^(Hồ sơ|Profile)$/i }).first()
    await expect(firstCursorProfile).toBeVisible()
    const firstCursorProfileHref = await firstCursorProfile.getAttribute('href')
    expect(
      strongMatchTalentIds.some((id) => firstCursorProfileHref === `/org/talents/${id}`)
    ).toBe(true)
    for (const decoyTalentId of decoyTalentIds) {
      expect(firstCursorProfileHref).not.toBe(`/org/talents/${decoyTalentId}`)
    }

    const olderLink = page.getByRole('link', { name: /Older|Cũ hơn/i })
    await expect(olderLink).toBeVisible()
    await expect(olderLink).toHaveAttribute('href', /cursor=/)

    const olderNavigation = page.waitForResponse(
      (nextResponse) =>
        nextResponse.request().method() === 'GET' &&
        nextResponse.url().includes('/org/talents') &&
        nextResponse.url().includes('cursor=')
    )
    const [olderResponse] = await Promise.all([olderNavigation, olderLink.click()])
    const olderResponseText = await olderResponse.text()
    expect(olderResponse.status(), olderResponseText).toBe(200)
    await expect(page).toHaveURL(/cursor=/)

    const secondCursorProfile = page.getByRole('link', { name: /^(Hồ sơ|Profile)$/i }).first()
    await expect(secondCursorProfile).toBeVisible()
    const secondCursorProfileHref = await secondCursorProfile.getAttribute('href')
    expect(strongMatchTalentIds).toContain(secondCursorProfileHref?.split('/').at(-1))
    expect(secondCursorProfileHref).not.toBe(firstCursorProfileHref)
    for (const decoyTalentId of decoyTalentIds) {
      expect(secondCursorProfileHref).not.toBe('/org/talents/' + decoyTalentId)
    }

    const evidenceRoute = new URL(page.url()).pathname + new URL(page.url()).search
    await captureFilterSearchTaxonomyEvidence(page, testInfo, {
      journeyId: 'RP-FST-03',
      actor: E2E_OWNER,
      route: evidenceRoute,
      criteria: { skill_ids: [skillId], min_proficiency: 'l10', per_page: 1 },
      backend: {
        status: olderResponse.status(),
        consequence:
          'Persisted same-object proficiency matches remain visible while the privacy and proficiency decoys stay absent across cursor pages.',
        responseContract: 'org.talents.cursor-page',
      },
      result: {
        count: matchingTalentCount ?? 0,
        visibleState: 'paged-results-with-decoys-excluded',
      },
      screenshotPath:
        'test-results/e2e-visual/filter-search-taxonomy/rp-fst-03/chromium/desktop/talent-proficiency-privacy-cursor.png',
    })
  })
})
