import { test, expect, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const E2E_USER = 'tranngocduyet31@gmail.com'

interface SeededMarketplaceApplicationContext {
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

async function seedMarketplaceApplicationFlow(
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

async function csrfToken(page: Page): Promise<string> {
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
  return (await page.locator('meta[name="csrf-token"]').getAttribute('content')) ?? ''
}

function isAbortedNavigation(error: unknown): boolean {
  return error instanceof Error && error.message.includes('net::ERR_ABORTED')
}

async function gotoApplicationsReview(page: Page, taskId: string): Promise<void> {
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

function approveButton(row: ReturnType<Page['locator']>) {
  return row.getByRole('button', { name: /^(Approve|Duyệt)$/ })
}

test.describe('Marketplace apply and my applications E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test('guest apply API attempt is rejected and creates no application row', async ({ page }) => {
    await login(page, E2E_USER)
    const seeded = await seedMarketplaceApplicationFlow(page, { withApplication: false })

    try {
      await page.context().clearCookies()
      const response = await page.request.post(`${BASE}/api/v1/tasks/${seeded.taskId}/apply`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        data: {
          message: 'Guest should not be able to create marketplace applications',
          portfolio_links: ['https://portfolio.example.com/guest'],
        },
      })

      expect([401, 403]).toContain(response.status())

      await login(page, seeded.applicantEmail)
      await page.goto('/my-applications')
      await page.waitForLoadState('domcontentloaded')
      await expect(
        page.locator('[data-testid="application-row"]').filter({ hasText: seeded.taskTitle })
      ).toHaveCount(0)
    } finally {
      await page.context().clearCookies()
    }
  })

  test('seeded marketplace task appears and can be applied to from the browser', async ({
    page,
  }) => {
    await login(page, E2E_USER)
    const seeded = await seedMarketplaceApplicationFlow(page, { withApplication: false })

    try {
      await page.context().clearCookies()
      await login(page, seeded.applicantEmail)
      await page.goto('/marketplace/tasks')
      await page.waitForLoadState('domcontentloaded')

      await expect(
        page.getByRole('heading', { name: /^(Task marketplace|Thị trường task)$/ })
      ).toBeVisible()
      await expect(page.getByRole('heading', { name: seeded.taskTitle })).toBeVisible()
      await expect(page.getByText(seeded.hiddenInternalTaskTitle)).toHaveCount(0)
      await expect(page.getByText(seeded.assignedTaskTitle)).toHaveCount(0)

      const taskCard = page.locator('article').filter({ hasText: seeded.taskTitle })
      await taskCard.getByRole('button', { name: /^(Apply to join|Gửi đề xuất tham gia)$/ }).click()
      await expect(
        page.getByRole('heading', { name: /^(Apply to task|Gửi đề xuất tham gia task)$/ })
      ).toBeVisible()
      await page
        .getByLabel(/^(Message or proof link required|Cần lời nhắn hoặc proof link)$/)
        .fill('Seeded E2E applicant is a strong fit')
      await page
        .getByLabel(/^(Portfolio links \(one per line\)|Liên kết portfolio \(mỗi dòng 1 link\))$/)
        .fill('https://portfolio.example.com/e2e')
      const [applyResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/api/v1/tasks/${seeded.taskId}/apply`)
        ),
        page
          .getByRole('button', { name: /^(Send application|Gửi đề xuất tham gia)$/ })
          .last()
          .click(),
      ])
      expect(applyResponse.status()).toBe(201)

      await page.goto('/my-applications')
      await expect(
        page.getByRole('heading', { name: /^(My applications|Đề xuất tham gia của tôi)$/i })
      ).toBeVisible()
      await expect(
        page.locator('[data-testid="application-row"]').filter({ hasText: seeded.taskTitle })
      ).toBeVisible()
      await expect(
        page.locator('[data-testid="application-row"]').filter({ hasText: /Pending|Chờ duyệt/ })
      ).toBeVisible()

      await page.context().clearCookies()
      await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
      await page.goto('/notifications')
      await page.waitForLoadState('domcontentloaded')

      const notificationRow = page
        .locator('[role="button"]')
        .filter({ hasText: 'Yêu cầu tham gia task mới' })
        .filter({ hasText: seeded.taskTitle })
      await expect(notificationRow).toBeVisible()
      await notificationRow.getByRole('button', { name: /^(Mark as read|Đã đọc)$/ }).click()
      await expect(
        notificationRow.getByRole('button', { name: /^(Mark as read|Đã đọc)$/ })
      ).toHaveCount(0)

      await notificationRow.getByRole('button', { name: /^(Delete|Xóa)$/ }).click()
      await expect(page.getByText('Yêu cầu tham gia task mới')).toHaveCount(0)
    } finally {
      await page.context().clearCookies()
    }
  })

  test('apply modal renders exact backend duplicate denial from a stale browser state', async ({
    page,
  }) => {
    await login(page, E2E_USER)
    const seeded = await seedMarketplaceApplicationFlow(page, { withApplication: false })

    try {
      await page.context().clearCookies()
      await login(page, seeded.applicantEmail)
      await page.goto('/marketplace/tasks')
      await page.waitForLoadState('domcontentloaded')

      const taskCard = page.locator('article').filter({ hasText: seeded.taskTitle })
      await taskCard.getByRole('button', { name: /^(Apply to join|Gửi đề xuất tham gia)$/ }).click()
      await expect(
        page.getByRole('heading', { name: /^(Apply to task|Gửi đề xuất tham gia task)$/ })
      ).toBeVisible()

      const staleCreateResponse = await page.request.post(
        `${BASE}/api/v1/tasks/${seeded.taskId}/apply`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': await csrfToken(page),
          },
          data: {
            message: 'Create a stale pending application before submitting the open modal',
            portfolio_links: ['https://portfolio.example.com/stale-duplicate'],
            application_source: 'public_listing',
          },
        }
      )
      expect(staleCreateResponse.status()).toBe(201)

      await page
        .getByLabel(/^(Message or proof link required|Cần lời nhắn hoặc proof link)$/)
        .fill('Browser still thinks this task is open')
      await page
        .getByLabel(/^(Portfolio links \(one per line\)|Liên kết portfolio \(mỗi dòng 1 link\))$/)
        .fill('https://portfolio.example.com/e2e-duplicate')
      const [duplicateResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/api/v1/tasks/${seeded.taskId}/apply`)
        ),
        page
          .getByRole('button', { name: /^(Send application|Gửi đề xuất tham gia)$/ })
          .last()
          .click(),
      ])

      expect(duplicateResponse.status()).toBe(400)
      await expect(
        page.locator('p.text-destructive').filter({
          hasText: 'Bạn đã gửi đề xuất tham gia task này rồi',
        })
      ).toBeVisible()
      await expect(
        page.getByRole('heading', { name: /^(Apply to task|Gửi đề xuất tham gia task)$/ })
      ).toBeVisible()
    } finally {
      await page.context().clearCookies()
    }
  })

  test('seeded pending application can be withdrawn from my applications', async ({ page }) => {
    await login(page, E2E_USER)
    const seeded = await seedMarketplaceApplicationFlow(page, { withApplication: true })

    try {
      const applicationId = seeded.applicationId
      if (!applicationId) {
        throw new Error('Seeded marketplace application flow did not create an application')
      }

      await page.context().clearCookies()
      await login(page, seeded.applicantEmail)
      await page.goto('/my-applications')
      await page.waitForLoadState('domcontentloaded')

      const row = page
        .locator('[data-testid="application-row"]')
        .filter({ hasText: seeded.taskTitle })
      await expect(row).toBeVisible()
      await expect(row).toContainText(/Pending|Chờ duyệt/)
      const [withdrawResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/applications/${applicationId}/withdraw`)
        ),
        row.getByRole('button', { name: /^(Withdraw application|Rút đề xuất)$/ }).click(),
      ])
      expect([200, 204]).toContain(withdrawResponse.status())

      await page.reload()
      await page.waitForLoadState('domcontentloaded')
      await page.getByRole('button', { name: /^(Withdrawn|Đã rút)$/ }).click()
      await expect(
        page.locator('[data-testid="application-row"]').filter({ hasText: seeded.taskTitle })
      ).toBeVisible()
      await expect(
        page.locator('[data-testid="application-row"]').filter({ hasText: /Withdrawn|Đã rút/ })
      ).toBeVisible()
    } finally {
      await page.context().clearCookies()
    }
  })

  test('my applications page only shows applications for the signed-in applicant', async ({
    page,
  }) => {
    await login(page, E2E_USER)
    const ownSeed = await seedMarketplaceApplicationFlow(page, { withApplication: true })
    const otherSeed = await seedMarketplaceApplicationFlow(page, { withApplication: true })

    try {
      await page.context().clearCookies()
      await login(page, ownSeed.applicantEmail)
      await page.goto('/my-applications')
      await page.waitForLoadState('domcontentloaded')

      await expect(
        page.locator('[data-testid="application-row"]').filter({ hasText: ownSeed.taskTitle })
      ).toBeVisible()
      await expect(page.getByText(otherSeed.taskTitle)).toHaveCount(0)
    } finally {
      await page.context().clearCookies()
    }
  })

  test('task owner can review the exact seeded marketplace application row', async ({ page }) => {
    await login(page, E2E_USER)
    const seeded = await seedMarketplaceApplicationFlow(page, { withApplication: true })

    try {
      await page.context().clearCookies()
      await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
      await gotoApplicationsReview(page, seeded.taskId)

      await expect(
        page.getByRole('heading', { name: /^(Applications|Đề xuất tham gia)$/ })
      ).toBeVisible()
      const row = page
        .locator('[data-testid="application-row"]')
        .filter({ hasText: seeded.applicantEmail })
      await expect(row).toBeVisible()
      await expect(row).toContainText(/Pending|Chờ duyệt/)
      await expect(row).toContainText(/External|Bên ngoài/)
    } finally {
      await page.context().clearCookies()
    }
  })

  test('project manager can review and reject the exact seeded marketplace application row', async ({
    page,
  }) => {
    await login(page, E2E_USER)
    const seeded = await seedMarketplaceApplicationFlow(page, { withApplication: true })
    const applicationId = seeded.applicationId
    const rejectionReason = 'Project manager seeded E2E rejection reason'

    if (!applicationId) {
      throw new Error('Seeded marketplace application flow did not create an application')
    }

    try {
      await page.context().clearCookies()
      await login(page, seeded.projectManagerEmail)
      await gotoApplicationsReview(page, seeded.taskId)

      await expect(
        page.getByRole('heading', { name: /^(Applications|Đề xuất tham gia)$/ })
      ).toBeVisible()
      const row = page
        .locator('[data-testid="application-row"]')
        .filter({ hasText: seeded.applicantEmail })
      await expect(row).toBeVisible()
      await expect(row).toContainText(/Pending|Chờ duyệt/)
      await expect(row).toContainText(/External|Bên ngoài/)

      await row.getByRole('button', { name: /^(Reject|Từ chối)$/ }).click()
      await row.getByLabel(/^(Rejection reason|Lý do từ chối)$/).fill(rejectionReason)
      const [processResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/applications/${applicationId}/process`)
        ),
        row.getByRole('button', { name: /^(Confirm rejection|Xác nhận từ chối)$/ }).click(),
      ])
      expect(processResponse.status()).toBe(204)
      await expect(row).toContainText(/Rejected|Từ chối/)

      await page.context().clearCookies()
      await login(page, seeded.applicantEmail)
      await page.goto('/my-applications?status=rejected')
      await page.waitForLoadState('domcontentloaded')
      const applicantRow = page
        .locator('[data-testid="application-row"]')
        .filter({ hasText: seeded.taskTitle })
      await expect(applicantRow).toBeVisible()
      await expect(applicantRow).toContainText(rejectionReason)
    } finally {
      await page.context().clearCookies()
    }
  })

  test('task owner can reject a seeded marketplace application from the browser', async ({
    page,
  }) => {
    await login(page, E2E_USER)
    const seeded = await seedMarketplaceApplicationFlow(page, { withApplication: true })
    const applicationId = seeded.applicationId
    const rejectionReason = 'Seeded E2E rejection reason: portfolio does not match task scope'

    if (!applicationId) {
      throw new Error('Seeded marketplace application flow did not create an application')
    }

    try {
      await page.context().clearCookies()
      await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
      await gotoApplicationsReview(page, seeded.taskId)

      const row = page
        .locator('[data-testid="application-row"]')
        .filter({ hasText: seeded.applicantEmail })
      await expect(row).toBeVisible()
      await expect(row).toContainText(/Pending|Chờ duyệt/)

      await row.getByRole('button', { name: /^(Reject|Từ chối)$/ }).click()
      await row.getByLabel(/^(Rejection reason|Lý do từ chối)$/).fill(rejectionReason)
      const [processResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/applications/${applicationId}/process`)
        ),
        row.getByRole('button', { name: /^(Confirm rejection|Xác nhận từ chối)$/ }).click(),
      ])
      expect(processResponse.status()).toBe(204)

      await page.waitForLoadState('domcontentloaded')
      await expect(row).toContainText(/Rejected|Từ chối/)
      await expect(row.getByRole('button', { name: /^(Approve|Duyệt)$/ })).toHaveCount(0)

      await page.context().clearCookies()
      await login(page, seeded.applicantEmail)
      await page.goto('/my-applications?status=rejected')
      await page.waitForLoadState('domcontentloaded')

      const applicantRow = page
        .locator('[data-testid="application-row"]')
        .filter({ hasText: seeded.taskTitle })
      await expect(applicantRow).toBeVisible()
      await expect(applicantRow).toContainText(/Rejected|Không được chọn/)
      await expect(applicantRow).toContainText(rejectionReason)
    } finally {
      await page.context().clearCookies()
    }
  })

  test('task owner can approve one seeded application and reject the other pending applicant', async ({
    page,
  }) => {
    await login(page, E2E_USER)
    const seeded = await seedMarketplaceApplicationFlow(page, {
      withApplication: true,
      withSecondApplication: true,
    })
    const applicationId = seeded.applicationId

    if (!applicationId || !seeded.secondApplicationId) {
      throw new Error('Seeded marketplace application flow did not create two applications')
    }

    try {
      await page.context().clearCookies()
      await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
      await gotoApplicationsReview(page, seeded.taskId)

      const approvedRow = page
        .locator('[data-testid="application-row"]')
        .filter({ hasText: seeded.applicantEmail })
      const rejectedRow = page
        .locator('[data-testid="application-row"]')
        .filter({ hasText: seeded.secondApplicantEmail })
      await expect(approvedRow).toBeVisible()
      await expect(rejectedRow).toBeVisible()
      await expect(approvedRow).toContainText(/Pending|Chờ duyệt/)
      await expect(rejectedRow).toContainText(/Pending|Chờ duyệt/)

      const [processResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/applications/${applicationId}/process`)
        ),
        approveButton(approvedRow).click(),
      ])
      expect(processResponse.status()).toBe(204)

      await page.waitForLoadState('domcontentloaded')
      await expect(approvedRow).toContainText(/Approved|Đã duyệt/)
      await expect(rejectedRow).toContainText(/Rejected|Từ chối/)
      await expect(approveButton(approvedRow)).toHaveCount(0)

      await page.context().clearCookies()
      await login(page, seeded.applicantEmail)
      await page.goto('/my-applications?status=approved')
      await page.waitForLoadState('domcontentloaded')
      const applicantApprovedRow = page
        .locator('[data-testid="application-row"]')
        .filter({ hasText: seeded.taskTitle })
      await expect(applicantApprovedRow).toBeVisible()
      await expect(applicantApprovedRow).toContainText(/Approved|Được chọn/)

      await page.context().clearCookies()
      await login(page, seeded.secondApplicantEmail)
      await page.goto('/my-applications?status=rejected')
      await page.waitForLoadState('domcontentloaded')
      const applicantRejectedRow = page
        .locator('[data-testid="application-row"]')
        .filter({ hasText: seeded.taskTitle })
      await expect(applicantRejectedRow).toBeVisible()
      await expect(applicantRejectedRow).toContainText(/Rejected|Không được chọn/)
      await expect(applicantRejectedRow).toContainText('Another applicant was selected')
    } finally {
      await page.context().clearCookies()
    }
  })

  test('approved external applicant can open /work and stay inside the work shell', async ({
    page,
  }) => {
    await login(page, E2E_USER)
    const seeded = await seedMarketplaceApplicationFlow(page, {
      withApplication: true,
      withSecondApplication: false,
    })
    const applicationId = seeded.applicationId

    if (!applicationId) {
      throw new Error('Seeded marketplace application flow did not create an application')
    }

    try {
      await page.context().clearCookies()
      await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
      await gotoApplicationsReview(page, seeded.taskId)

      const approvedRow = page
        .locator('[data-testid="application-row"]')
        .filter({ hasText: seeded.applicantEmail })
      await expect(approvedRow).toBeVisible()

      const [processResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/applications/${applicationId}/process`)
        ),
        approveButton(approvedRow).click(),
      ])
      expect(processResponse.status()).toBe(204)

      await page.context().clearCookies()
      await login(page, seeded.applicantEmail)
      await page.goto('/work')
      await page.waitForLoadState('domcontentloaded')

      const taskBoardHref = `/projects/${seeded.projectId}/tasks?task_id=${seeded.taskId}`
      await expect(
        page.getByRole('heading', { name: /^(My work|Công việc của tôi)$/ })
      ).toBeVisible()
      await expect(page.getByRole('link', { name: seeded.taskTitle })).toHaveAttribute(
        'href',
        taskBoardHref
      )
      await expect(page.getByRole('link', { name: /^(Open|Mở)$/ })).toHaveAttribute(
        'href',
        taskBoardHref
      )
      await expect(
        page.getByRole('link', { name: /^(Submit work|Nộp công việc)$/ })
      ).toHaveAttribute('href', taskBoardHref)
      await expect(page.getByText(seeded.taskTitle)).toBeVisible()
      await expect(page.getByText(seeded.organizationId, { exact: false })).toHaveCount(0)
    } finally {
      await page.context().clearCookies()
    }
  })

  test('same-org plain member cannot open seeded task application review page', async ({
    page,
  }) => {
    await login(page, E2E_USER)
    const seeded = await seedMarketplaceApplicationFlow(page, { withApplication: true })

    try {
      await page.context().clearCookies()
      await login(page, seeded.sameOrgMemberEmail, { organizationId: seeded.organizationId })
      const response = await page.goto(`/tasks/${seeded.taskId}/applications`)
      await page.waitForLoadState('domcontentloaded')

      expect(response?.status()).toBe(403)
      await expect(page.getByText(seeded.applicantEmail)).toHaveCount(0)
      await expect(page.locator('[data-testid="application-row"]')).toHaveCount(0)
    } finally {
      await page.context().clearCookies()
    }
  })

  test('foreign-org recruiter cannot open seeded task application review page', async ({
    page,
  }) => {
    await login(page, E2E_USER)
    const seeded = await seedMarketplaceApplicationFlow(page, { withApplication: true })

    try {
      await page.context().clearCookies()
      await login(page, seeded.foreignRecruiterEmail, {
        organizationId: seeded.foreignOrganizationId,
      })
      const response = await page.request.get(`${BASE}/tasks/${seeded.taskId}/applications`, {
        headers: {
          'Accept': 'text/html',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
      const body = await response.text()

      expect(response.status()).toBe(403)
      expect(body).not.toContain(seeded.applicantEmail)
      expect(body).not.toContain(seeded.taskTitle)
    } finally {
      await page.context().clearCookies()
    }
  })

  test('same-org member and foreign recruiter cannot process seeded applications by API', async ({
    page,
  }) => {
    await login(page, E2E_USER)
    const seeded = await seedMarketplaceApplicationFlow(page, {
      withApplication: true,
      withSecondApplication: true,
    })

    if (!seeded.applicationId || !seeded.secondApplicationId) {
      throw new Error('Seeded marketplace application flow did not create two applications')
    }

    try {
      await page.context().clearCookies()
      await login(page, seeded.sameOrgMemberEmail, { organizationId: seeded.organizationId })
      await page.goto('/marketplace/tasks')
      const memberResponse = await page.request.post(
        `${BASE}/applications/${seeded.applicationId}/process`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': await csrfToken(page),
          },
          data: {
            action: 'reject',
            rejectionReason: 'Plain member must not process applications',
          },
        }
      )
      expect(memberResponse.status()).toBe(403)

      await page.context().clearCookies()
      await login(page, seeded.foreignRecruiterEmail, {
        organizationId: seeded.foreignOrganizationId,
      })
      await page.goto('/org')
      const foreignResponse = await page.request.post(
        `${BASE}/applications/${seeded.secondApplicationId}/process`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': await csrfToken(page),
          },
          data: {
            action: 'approve',
            assignmentType: 'external_contributor',
          },
        }
      )
      expect(foreignResponse.status()).toBe(403)

      await page.context().clearCookies()
      await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
      await gotoApplicationsReview(page, seeded.taskId)

      await expect(
        page.locator('[data-testid="application-row"]').filter({ hasText: seeded.applicantEmail })
      ).toContainText(/Pending|Chờ duyệt/)
      await expect(
        page
          .locator('[data-testid="application-row"]')
          .filter({ hasText: seeded.secondApplicantEmail })
      ).toContainText(/Pending|Chờ duyệt/)
    } finally {
      await page.context().clearCookies()
    }
  })
})
