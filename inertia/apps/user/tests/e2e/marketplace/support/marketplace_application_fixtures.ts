import { expect, type Page, type Locator } from '@playwright/test'

export const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
export const E2E_USER = 'tranngocduyet31@gmail.com'

export interface SeededMarketplaceApplicationContext {
  organizationId: string
  projectId: string
  taskId: string
  applicationId: string | null
  secondApplicationId: string | null
  ownerEmail: string
  projectManagerEmail: string
  applicantEmail: string
  secondApplicantEmail: string
  sameOrgMemberEmail: string
  foreignRecruiterEmail: string
  ownerId: string
  projectManagerId: string
  applicantId: string
  secondApplicantId: string
  sameOrgMemberId: string
  foreignOrganizationId: string
  foreignRecruiterId: string
  taskTitle: string
  hiddenInternalTaskTitle: string
  assignedTaskTitle: string
  timestamp: number
}

export async function seedMarketplaceApplicationFlow(
  page: Page,
  options: { withApplication: boolean; withSecondApplication?: boolean }
): Promise<SeededMarketplaceApplicationContext> {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 10)
  await page.goto('/marketplace/tasks')
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
  const seedCsrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  const response = await page.request.post(
    `${BASE}/api/testing/seed-marketplace-application-flow`,
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': seedCsrfToken ?? '',
      },
      data: {
        timestamp,
        nonce,
        withApplication: options.withApplication,
        withSecondApplication: options.withSecondApplication ?? false,
      },
    }
  )

  expect(response.status()).toBe(200)
  const body = (await response.json()) as { data: SeededMarketplaceApplicationContext }
  return body.data
}

export async function csrfToken(page: Page): Promise<string> {
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
  return (await page.locator('meta[name="csrf-token"]').getAttribute('content')) ?? ''
}

export function isAbortedNavigation(error: unknown): boolean {
  return error instanceof Error && error.message.includes('net::ERR_ABORTED')
}

export async function gotoApplicationsReview(page: Page, taskId: string): Promise<void> {
  const path = `/tasks/${taskId}/applications`
  let lastError: unknown = null
  const reviewHeading = page.getByRole('heading', { name: /^(Applications|Đề xuất tham gia)$/ })

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      lastError = null
    } catch (error) {
      lastError = error
      if (!isAbortedNavigation(error)) {
        throw error
      }
    }

    if (page.url().includes(path)) {
      await expect(reviewHeading).toBeVisible()
      return
    }
  }

  if (lastError) {
    throw lastError
  }

  await expect(page).toHaveURL(new RegExp(`/tasks/${taskId}/applications`))
  await expect(reviewHeading).toBeVisible()
}

export function approveButton(row: Locator) {
  return row.getByRole('button', { name: /^(Approve|Duyệt)$/ })
}
