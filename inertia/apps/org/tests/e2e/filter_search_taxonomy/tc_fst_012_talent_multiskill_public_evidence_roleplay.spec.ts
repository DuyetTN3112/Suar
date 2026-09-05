import { expect, test } from '@playwright/test'

import { captureFilterSearchTaxonomyEvidence } from '../../shared/e2e/filter_search_taxonomy_evidence.js'
import { login } from '../../shared/e2e/helpers.js'

const E2E_OWNER = 'tranngocduyet31@gmail.com'

interface SeedTalentResponse {
  data: {
    talentId: string
    talentEmail: string
    talentSkillIds?: string[]
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

interface TalentDirectoryPage {
  props?: {
    talents?: Array<{
      id?: string
      public_accomplishments?: Array<{
        title?: string
        verification_status?: string
      }>
    }>
    filters?: {
      skill_ids?: string[]
      min_proficiency?: string
    }
    pagination?: {
      mode?: string
      total?: number
    }
  }
}

test.describe('TC-FST-012 — recruiter multi-skill public evidence role-play', () => {
  test('shows public verified evidence for a talent matching all selected skills and proficiency', async ({
    page,
  }, testInfo) => {
    await login(page, E2E_OWNER)

    const seedResponse = await page.request.post('/api/testing/seed-e2e', {
      data: {
        timestamp: Date.now(),
        multiSkill: true,
        publicAccomplishment: true,
      },
    })
    const seedText = await seedResponse.text()
    expect(seedResponse.status(), seedText).toBe(200)

    const seedBody = JSON.parse(seedText) as SeedTalentResponse
    const talentSkillIds = seedBody.data.talentSkillIds ?? []
    const publication = seedBody.data.publicAccomplishment
    expect(talentSkillIds).toHaveLength(2)
    expect(publication).toBeDefined()
    if (talentSkillIds.length !== 2 || !publication) return

    await login(page, seedBody.data.talentEmail)
    const publicationResponse = await page.request.post(
      `/api/v1/accomplishments/${publication.accomplishmentId}/publication`,
      {
        data: {
          idempotencyKey: `tc-fst-012-publication-${Date.now()}`,
          expectedSourceCanonicalHash: publication.canonicalHash,
          expectedLifecycleRevisionId: publication.lifecycleRevisionId,
          confirmed: true,
        },
      }
    )
    const publicationText = await publicationResponse.text()
    expect(publicationResponse.status(), publicationText).toBe(201)

    await login(page, E2E_OWNER)
    await page.goto('/org/talents')
    await expect(
      page.getByRole('heading', { name: /Organization talent directory|Danh bạ Talent/i })
    ).toBeVisible()

    const skillFilter = page.getByTestId('talent-skill-filter')
    await expect(skillFilter).toHaveAttribute('multiple')
    await skillFilter.selectOption(talentSkillIds)
    await expect(skillFilter.locator('option:checked')).toHaveCount(talentSkillIds.length)
    await page.getByTestId('talent-min-proficiency').selectOption('l7')

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

    const body = JSON.parse(responseText) as TalentDirectoryPage
    expect(body.props?.filters?.skill_ids).toEqual(talentSkillIds)
    expect(body.props?.filters?.min_proficiency).toBe('l7')
    expect(body.props?.pagination?.mode).toBe('cursor')

    const seededTalent = body.props?.talents?.find(({ id }) => id === seedBody.data.talentId)
    expect(seededTalent?.public_accomplishments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: publication.title,
          verification_status: 'verified',
        }),
      ])
    )

    const publicCard = page.getByTestId(`public-accomplishments-${seedBody.data.talentId}`)
    await expect(publicCard).toBeVisible()
    await expect(publicCard).toContainText(publication.title)
    await expect(publicCard).toContainText('Public-safe')
    await expect(publicCard).toContainText('Verified')
    await expect(publicCard).not.toContainText(publication.privateSourceMarker)
    await expect(publicCard).not.toContainText(publication.taskId)
    await expect(publicCard).not.toContainText(/reviewer|evidence/i)
    await expect(page.locator('body')).not.toContainText(/500|Server Error|Lỗi hệ thống/i)

    await captureFilterSearchTaxonomyEvidence(page, testInfo, {
      journeyId: 'RP-FST-03',
      actor: E2E_OWNER,
      route: new URL(page.url()).pathname + new URL(page.url()).search,
      criteria: { skill_ids: talentSkillIds, min_proficiency: 'l7' },
      backend: {
        status: response.status(),
        consequence:
          'The recruiter UI submits both skill IDs and the minimum proficiency, then renders the seeded public verified accomplishment without private source facts.',
        responseContract: 'org.talents.cursor-page',
      },
      result: {
        count: body.props?.pagination?.total ?? body.props?.talents?.length ?? 0,
        visibleState: 'multi-skill-proficiency-public-evidence-match',
      },
      screenshotPath:
        'test-results/e2e-visual/filter-search-taxonomy/rp-fst-03/chromium/desktop/talent-multiskill-public-evidence.png',
    })
  })
})
