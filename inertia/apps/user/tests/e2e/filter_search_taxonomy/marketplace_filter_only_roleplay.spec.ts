import { expect, test } from '@playwright/test'

test.describe('Filter/Search/Taxonomy — anonymous marketplace filter-only journey', () => {
  test('applies a keyword through the real marketplace UI and renders the server-authoritative empty state', async ({
    page,
  }) => {
    await page.goto('/marketplace/tasks')
    await expect(page.getByRole('heading', { level: 1, name: /Task marketplace/i })).toBeVisible()

    const keyword = `roleplay-no-match-${Date.now()}`
    const keywordInput = page.getByLabel(/Find tasks/i)
    await expect(keywordInput).toBeVisible()
    await keywordInput.fill(keyword)
    await keywordInput.press('Enter')

    await expect(page).toHaveURL(new RegExp(`/marketplace/tasks\\?.*keyword=${keyword}`))
    await expect(page.getByRole('heading', { name: /No tasks found/i })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('500')

    await page.screenshot({
      path: 'test-results/e2e-visual/filter-search-taxonomy/rp-fst-01/chromium/desktop/marketplace-filter-only-empty.png',
      fullPage: true,
    })
  })

  test('stages mobile filter changes until Apply and restores focus on Cancel', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/marketplace/tasks')

    const opener = page.getByRole('button', { name: /More filters|Thêm bộ lọc/i })
    await expect(opener).toBeVisible()
    const initialUrl = page.url()
    await opener.click()

    const drawer = page.getByRole('dialog', { name: /Marketplace filters|Bộ lọc marketplace/i })
    await expect(drawer).toBeVisible()
    await expect(drawer).toHaveAttribute('aria-modal', 'true')
    const labelledBy = await drawer.getAttribute('aria-labelledby')
    if (!labelledBy) throw new Error('Filter drawer must expose an accessible labelled-by target')
    await expect(page.locator(`#${labelledBy}`)).toHaveText(
      /Marketplace filters|Bộ lọc marketplace/i
    )
    await expect(drawer.getByText(/Unapplied changes|Thay đổi chưa áp dụng/i)).toBeVisible()
    await expect(drawer.getByLabel(/Cancel filter changes/i)).toBeFocused()
    await expect(drawer.getByLabel(/Apply filter changes/i)).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    )
    expect(hasHorizontalOverflow).toBe(false)

    await drawer.getByLabel(/Difficulty|Độ khó/i).selectOption('easy')
    await expect(drawer.getByText(/Unapplied changes|Thay đổi chưa áp dụng/i)).toBeVisible()
    // A global notification surface can briefly overlap the drawer during the
    // staged select update; assert the drawer action itself rather than making
    // the roleplay depend on that unrelated overlay's animation timing.
    await drawer.getByLabel(/Cancel filter changes/i).click()

    await expect(drawer).not.toBeVisible()
    await expect(page).toHaveURL(initialUrl)
    await expect(opener).toBeFocused()

    await opener.click()
    const reopened = page.getByRole('dialog', { name: /Marketplace filters|Bộ lọc marketplace/i })
    await reopened.getByLabel(/Difficulty|Độ khó/i).selectOption('easy')
    await reopened.getByLabel(/Apply filter changes/i).click({ noWaitAfter: true })

    await expect(page).toHaveURL(/difficulty=easy/)
    await page.screenshot({
      path: 'test-results/e2e-visual/filter-search-taxonomy/rp-fst-15/chromium/mobile/marketplace-filter-staged-drawer.png',
      fullPage: true,
    })
  })

  test('closes the staged drawer on browser Back without changing the committed URL', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/marketplace/tasks')

    const opener = page.getByRole('button', { name: /More filters|Thêm bộ lọc/i })
    const committedUrl = page.url()
    await opener.focus()
    await opener.click()
    await expect(
      page.getByRole('dialog', { name: /Marketplace filters|Bộ lọc marketplace/i })
    ).toBeVisible()

    await page.goBack()

    await expect(page).toHaveURL(committedUrl)
    await expect(
      page.getByRole('dialog', { name: /Marketplace filters|Bộ lọc marketplace/i })
    ).not.toBeVisible()
    await expect(page.locator('body')).toBeVisible()
  })
})
