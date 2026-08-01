import { type Page, expect } from '@playwright/test'

import {
  resolveEffectiveOrganizationId,
  shouldReuseTestingSession,
  type TestingAuthState,
} from '../../../../../../tests/shared/auth_session_cache.js'
import {
  clearCachedTestingTokens,
  getAnyCachedTestingToken,
  getCachedTestingToken,
  setCachedTestingToken,
} from '../../../../../../tests/shared/auth_token_cache.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

interface ProjectCreateResponse {
  success?: boolean
  data?: {
    id?: string
  }
}

interface LoginOptions {
  organizationId?: string
  systemRole?: string
}

interface CreateProjectOptions {
  navigate?: boolean
}

interface TestingTokenResponse {
  data: {
    accessToken: string
    refreshToken: string
    organizationId?: string | null
    systemRole?: string | null
  }
}

interface TestingBootstrapResult {
  ok: boolean
  reason?: string
}

interface TestingHealthResponse {
  data?: {
    database?: string | null
  }
}

/**
 * Login via the testing backdoor endpoint.
 */
export async function login(page: Page, email: string, options: LoginOptions = {}) {
  await assertTestingServerUsesTestDatabase(page)

  const authState = (await hasTestingSessionCookie(page))
    ? await getTestingAuthState(page)
    : null

  const needsSystemRoleRefresh =
    !!options.systemRole &&
    authState?.authenticated &&
    authState.systemRole !== options.systemRole

  if (needsSystemRoleRefresh) {
    clearCachedTestingTokens(email)
  }

  if (
    !needsSystemRoleRefresh &&
    shouldReuseTestingSession(authState, email, options.organizationId)
  ) {
    return
  }

  if (
    authState?.authenticated &&
    authState.email?.trim().toLowerCase() === email.trim().toLowerCase() &&
    options.organizationId &&
    resolveEffectiveOrganizationId(authState) !== options.organizationId
  ) {
    const switched = await switchTestingOrganization(page, options.organizationId)
    if (switched) {
      return
    }
  }

  const bootstrapped = await bootstrapTestingSessionFromCachedToken(
    page,
    email,
    options.organizationId,
    options.systemRole
  )
  if (!bootstrapped.ok) {
    await issueTestingTokenPair(page, email, options.organizationId, options.systemRole)
    const retriedBootstrap = await bootstrapTestingSessionFromCachedToken(
      page,
      email,
      options.organizationId,
      options.systemRole
    )
    if (!retriedBootstrap.ok) {
      const reason = retriedBootstrap.reason ?? 'unknown reason'
      throw new Error(`Testing session bootstrap failed for ${email}: ${reason}`)
    }
  }

  const verified = await verifyTestingSession(page, email, options)
  if (verified.ok) {
    return
  }

  clearCachedTestingTokens(email)
  await page.context().clearCookies()
  await directTestingLogin(page, email, options)

  const directVerified = await verifyTestingSession(page, email, options)
  if (!directVerified.ok) {
    throw new Error(`Testing login produced wrong auth state for ${email}: ${directVerified.reason ?? 'unknown reason'}`)
  }
}

export async function getTestingAuthState(page: Page): Promise<TestingAuthState | null> {
  const resp = await page.request.get(`${BASE_URL}/api/testing/auth-state`)
  if (!resp.ok()) {
    return null
  }

  try {
    const body = (await resp.json()) as { data: TestingAuthState }
    return body.data
  } catch {
    return null
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function describeRequestError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isSafeTestingDatabaseName(database: string | null | undefined): boolean {
  return /(^test$|(^|[-_])test($|[-_])|_test$|-test$)/i.test(database ?? '')
}

async function assertTestingServerUsesTestDatabase(page: Page): Promise<void> {
  let response
  try {
    response = await page.request.get(`${BASE_URL}/api/testing/health`)
  } catch (error) {
    throw new Error(`Testing health check failed: ${describeRequestError(error)}`)
  }

  if (!response.ok()) {
    const body = await response.text().catch(() => 'no body')
    throw new Error(`Testing routes unavailable with ${response.status()}: ${body}`)
  }

  const body = (await response.json()) as TestingHealthResponse
  const database = body.data?.database ?? null
  if (!isSafeTestingDatabaseName(database)) {
    throw new Error(
      `Testing server is connected to unsafe database "${database ?? 'unknown'}"; use PG_TEST_DATABASE for E2E`
    )
  }
}

async function verifyTestingSession(
  page: Page,
  email: string,
  options: LoginOptions
): Promise<TestingBootstrapResult> {
  const state = await getTestingAuthState(page)

  if (!state?.authenticated) {
    return { ok: false, reason: 'auth-state is unauthenticated' }
  }

  if (normalizeEmail(state.email ?? '') !== normalizeEmail(email)) {
    return { ok: false, reason: `auth-state email is ${state.email ?? 'null'}` }
  }

  if (
    options.organizationId &&
    resolveEffectiveOrganizationId(state) !== options.organizationId
  ) {
    return {
      ok: false,
      reason: `auth-state organization is ${resolveEffectiveOrganizationId(state) ?? 'null'}`,
    }
  }

  if (options.systemRole && state.systemRole !== options.systemRole) {
    return { ok: false, reason: `auth-state system role is ${state.systemRole ?? 'null'}` }
  }

  return { ok: true }
}

async function switchTestingOrganization(page: Page, organizationId: string): Promise<boolean> {
  const resp = await page.request.post(`${BASE_URL}/switch-organization`, {
    data: {
      organization_id: organizationId,
      current_path: '/org',
    },
  })

  return resp.ok()
}

async function directTestingLogin(
  page: Page,
  email: string,
  options: LoginOptions
): Promise<void> {
  const response = await page.request.post(`${BASE_URL}/api/testing/login`, {
    form: {
      email,
      provider: 'google',
      ...(options.organizationId ? { organization_id: options.organizationId } : {}),
      ...(options.systemRole ? { system_role: options.systemRole } : {}),
    },
  })

  if (!response.ok()) {
    const body = await response.text().catch(() => 'no body')
    throw new Error(`Direct testing login failed for ${email} with ${response.status()}: ${body}`)
  }
}

async function hasTestingSessionCookie(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies(BASE_URL)
  return cookies.some((cookie) => cookie.name.startsWith('adonis-session'))
}

async function bootstrapTestingSessionFromCachedToken(
  page: Page,
  email: string,
  requestedOrganizationId?: string,
  requestedSystemRole?: string
): Promise<TestingBootstrapResult> {
  const cachedToken =
    getCachedTestingToken(email, requestedOrganizationId) ??
    getAnyCachedTestingToken(email)

  if (!cachedToken) {
    return { ok: false, reason: 'no cached token' }
  }

  if (
    requestedSystemRole &&
    cachedToken.systemRole &&
    cachedToken.systemRole !== requestedSystemRole
  ) {
    clearCachedTestingTokens(email)
    return { ok: false, reason: 'cached token system role mismatch' }
  }

  let accessToken = cachedToken.accessToken
  let refreshToken = cachedToken.refreshToken
  let organizationId = cachedToken.organizationId ?? null
  let systemRole = cachedToken.systemRole ?? null

  if (requestedOrganizationId && organizationId !== requestedOrganizationId) {
    let refreshResponse
    try {
      refreshResponse = await page.request.post(`${BASE_URL}/api/testing/token-refresh`, {
        form: {
          refresh_token: refreshToken,
          organization_id: requestedOrganizationId,
        },
      })
    } catch (error) {
      clearCachedTestingTokens(email)
      return {
        ok: false,
        reason: `token refresh request failed: ${describeRequestError(error)}`,
      }
    }

    if (!refreshResponse.ok()) {
      const body = await refreshResponse.text().catch(() => 'no body')
      clearCachedTestingTokens(email)
      return {
        ok: false,
        reason: `token refresh failed with ${refreshResponse.status()}: ${body}`,
      }
    }

    const refreshedTokens = (await refreshResponse.json()) as TestingTokenResponse
    accessToken = refreshedTokens.data.accessToken
    refreshToken = refreshedTokens.data.refreshToken
    organizationId = refreshedTokens.data.organizationId ?? requestedOrganizationId
    systemRole = refreshedTokens.data.systemRole ?? systemRole

    setCachedTestingToken(email, {
      accessToken,
      refreshToken,
      organizationId,
      systemRole,
    }, organizationId)
  }

  let bootstrapResponse
  try {
    bootstrapResponse = await page.request.post(`${BASE_URL}/api/testing/session/bootstrap`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  } catch (error) {
    clearCachedTestingTokens(email)
    return {
      ok: false,
      reason: `session bootstrap request failed: ${describeRequestError(error)}`,
    }
  }

  if (!bootstrapResponse.ok()) {
    const body = await bootstrapResponse.text().catch(() => 'no body')
    clearCachedTestingTokens(email)
    return {
      ok: false,
      reason: `session bootstrap failed with ${bootstrapResponse.status()}: ${body}`,
    }
  }

  return { ok: true }
}

async function issueTestingTokenPair(
  page: Page,
  email: string,
  requestedOrganizationId?: string,
  requestedSystemRole?: string
): Promise<void> {
  const response = await page.request.post(`${BASE_URL}/api/testing/token-login`, {
    form: {
      email,
      provider: 'google',
      ...(requestedOrganizationId ? { organization_id: requestedOrganizationId } : {}),
      ...(requestedSystemRole ? { system_role: requestedSystemRole } : {}),
    },
  })

  if (!response.ok()) {
    const body = await response.text().catch(() => 'no body')
    throw new Error(`Testing token login failed for ${email} with ${response.status()}: ${body}`)
  }

  const tokenBody = (await response.json()) as TestingTokenResponse
  setCachedTestingToken(email, {
    accessToken: tokenBody.data.accessToken,
    refreshToken: tokenBody.data.refreshToken,
    organizationId: tokenBody.data.organizationId ?? requestedOrganizationId ?? null,
    systemRole: tokenBody.data.systemRole ?? null,
  }, tokenBody.data.organizationId ?? requestedOrganizationId ?? null)
}

/**
 * Create a project via the API and return its ID.
 * Uses page.request with cookies from the browser context.
 */
export async function createProject(
  page: Page,
  name: string,
  options: CreateProjectOptions = {}
): Promise<string> {
  const shouldNavigate = options.navigate ?? true
  await page.goto(`${BASE_URL}/org/projects`)
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()

  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  const resp = await page.request.post(`${BASE_URL}/org/projects`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': csrfToken ?? '',
    },
    data: {
      name,
      description: `E2E test: ${name}`,
      status: 'in_progress',
    },
  })

  console.warn('Create response status:', resp.status())

  let payload: ProjectCreateResponse | null = null
  try {
    payload = (await resp.json()) as ProjectCreateResponse
  } catch {
    payload = null
  }

  if (!resp.ok()) {
    console.warn('Create failed body:', JSON.stringify(payload).substring(0, 200))
    return ''
  }

  const projectId = payload?.data?.id
  if (projectId) {
    if (shouldNavigate) {
      await navigateToProject(page, projectId)
    }
    return projectId
  }

  await page.goto(`${BASE_URL}/org/projects`)
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()

  console.warn('No project ID found')
  return ''
}

/**
 * Find a project ID by its name on the org projects page.
 */
export async function findProjectIdByName(page: Page, name: string): Promise<string> {
  await page.goto(`${BASE_URL}/org/projects`)
  await page.waitForLoadState('domcontentloaded')

  const linkSel = `a:has-text("${name}")`
  const link = page.locator(linkSel).first()
  if (await link.count() > 0) {
    const href = await link.getAttribute('href')
    const match = href?.match(/\/org\/projects\/([a-f0-9-]+)/)
    const projectId = match?.[1]
    if (projectId) return projectId
  }

  return ''
}

/**
 * Navigate to a project page.
 */
export async function navigateToProject(page: Page, projectId: string) {
  await page.goto(`${BASE_URL}/org/projects/${projectId}`)
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Add a member to a project by user_id with a specific role.
 */
export async function addProjectMember(
  page: Page,
  projectId: string,
  userId: string,
  role: string
) {
  await navigateToProject(page, projectId)
  await page.click('text=Thành viên')
  await page.waitForSelector('#user_id', { state: 'visible' })
  await page.fill('#user_id', userId)
  await page.selectOption('#project_role', role)
  await page.click('button:has-text("Thêm")')
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Update a member's role in the project.
 */
export async function updateMemberRole(
  page: Page,
  projectId: string,
  memberUserId: string,
  newRole: string
) {
  await navigateToProject(page, projectId)
  await page.click('text=Thành viên')
  const memberCard = page.locator('.border.rounded-md').filter({
    has: page.locator(`text=${memberUserId}`),
  }).first()
  const roleSelect = memberCard.locator('select').first()
  await roleSelect.selectOption(newRole)
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Remove a member from the project.
 */
export async function removeProjectMember(
  page: Page,
  projectId: string,
  memberUserId: string
) {
  await navigateToProject(page, projectId)
  await page.click('text=Thành viên')
  const memberCard = page.locator('.border.rounded-md').filter({
    has: page.locator(`text=${memberUserId}`),
  }).first()
  page.once('dialog', (dialog) => dialog.accept())
  await memberCard.locator('button:has-text("Xóa")').click()
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Create a task with role prefill.
 */
export async function createTaskWithRole(
  page: Page,
  title: string,
  projectId: string,
  roleId: string
) {
  await page.goto(`${BASE_URL}/projects/${projectId}/tasks?create=1`)
  await page.waitForLoadState('domcontentloaded')
  await page.fill('input[name="title"]', title)
  await page.fill('textarea[name="description"]', `Task: ${title}`)
  const rolePicker = page.locator('text=Chọn Professional Role')
  if (await rolePicker.count() > 0) {
    const selectEl = page.locator('select').filter({
      has: page.locator('option[value="' + roleId + '"]'),
    }).first()
    if (await selectEl.count() > 0) {
      await selectEl.selectOption(roleId)
      await page.click('button:has-text("Prefill kỹ năng")')
      await page.waitForSelector('button:has-text("Prefill kỹ năng"):not([disabled])', { state: 'visible' })
    }
  }
  const acField = page.locator('textarea[name="acceptance_criteria"], input[name="acceptance_criteria"]').first()
  if (await acField.count() > 0) {
    await acField.fill('Acceptance criteria for ' + title)
  }
  await page.click('button:has-text("Tạo nhiệm vụ")')
  await page.waitForURL(new RegExp(`/projects/${projectId}/tasks`))
}

/**
 * Get the CSRF token from the page meta tag.
 */
export async function getCsrfToken(page: Page): Promise<string> {
  const token = page.locator('meta[name="csrf-token"]')
  return (await token.getAttribute('content')) ?? ''
}
