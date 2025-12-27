import { test, expect, type Page } from '@playwright/test'

import { getAnyCachedTestingToken } from '../../../../../../tests/shared/auth_token_cache.js'
import { login as adminLogin } from '../../../../admin/tests/shared/e2e/helpers.js'
import { login as orgLogin } from '../../../../org/tests/shared/e2e/helpers.js'
import { login as userLogin } from '../../shared/e2e/helpers.js'

type LoginFn = typeof userLogin

function responseStub(ok: boolean, status: number, body: unknown) {
  return {
    ok: () => ok,
    status: () => status,
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    json: () => Promise.resolve(body),
  }
}

function makeBootstrapFailurePage(email: string): Page {
  const postCalls: string[] = []

  return {
    context: () => ({
      cookies: () => Promise.resolve([]),
      clearCookies: () => Promise.resolve(undefined),
    }),
    request: {
      get: (url: string) => {
        if (url.includes('/api/testing/health')) {
          return Promise.resolve(
            responseStub(true, 200, { data: { status: 'ok', database: 'suar_test' } })
          )
        }

        return Promise.resolve(responseStub(false, 401, 'unauthenticated'))
      },
      post: (url: string) => {
        postCalls.push(url)
        if (url.includes('/api/testing/token-login')) {
          return Promise.resolve(responseStub(true, 200, {
            data: {
              accessToken: `access-token-${email}`,
              refreshToken: `refresh-token-${email}`,
              organizationId: 'org-1',
              systemRole: null,
            },
          }))
        }

        if (url.includes('/api/testing/session/bootstrap')) {
          return Promise.resolve(responseStub(false, 503, 'bootstrap down'))
        }

        return Promise.reject(new Error(`Unexpected request: ${url}`))
      },
    },
    __postCalls: postCalls,
  } as unknown as Page
}

function makeUnsafeDatabasePage(database: string): Page {
  return {
    context: () => ({
      cookies: () => Promise.resolve([]),
      clearCookies: () => Promise.resolve(undefined),
    }),
    request: {
      get: (url: string) => {
        if (url.includes('/api/testing/health')) {
          return Promise.resolve(responseStub(true, 200, { data: { status: 'ok', database } }))
        }

        return Promise.resolve(responseStub(false, 401, 'unauthenticated'))
      },
      post: (url: string) => Promise.reject(new Error(`Unexpected request: ${url}`)),
    },
  } as unknown as Page
}

async function expectLoginToFailFast(login: LoginFn, email: string) {
  const page = makeBootstrapFailurePage(email)

  await expect(login(page, email)).rejects.toThrow(
    `Testing session bootstrap failed for ${email}: session bootstrap failed with 503: bootstrap down`
  )
  expect(getAnyCachedTestingToken(email)).toBeNull()
}

test.describe('E2E auth helpers fail fast', () => {
  test('user helper reports bootstrap status/body and clears cached testing token', async () => {
    await expectLoginToFailFast(userLogin, 'user-helper-fail-fast@example.test')
  })

  test('org helper reports bootstrap status/body and clears cached testing token', async () => {
    await expectLoginToFailFast(orgLogin, 'org-helper-fail-fast@example.test')
  })

  test('admin helper reports bootstrap status/body and clears cached testing token', async () => {
    await expectLoginToFailFast(adminLogin, 'admin-helper-fail-fast@example.test')
  })

  test('user helper rejects unsafe non-test database before token login', async () => {
    const page = makeUnsafeDatabasePage('suar')

    await expect(userLogin(page, 'unsafe-helper@example.test')).rejects.toThrow(
      'Testing server is connected to unsafe database "suar"; use PG_TEST_DATABASE for E2E'
    )
  })
})
