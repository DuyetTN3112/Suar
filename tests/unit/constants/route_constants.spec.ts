import { test } from '@japa/runner'
import {
  AuthRoutes,
  PageRoutes,
  ApiRoutes,
  ErrorRoutes,
  InertiaPages,
} from '#constants/route_constants'

// ============================================================================
// AuthRoutes
// ============================================================================
test.group('AuthRoutes', () => {
  test('has LOGIN route', ({ assert }) => {
    assert.equal(AuthRoutes.LOGIN, '/login')
  })

  test('has LOGOUT route', ({ assert }) => {
    assert.equal(AuthRoutes.LOGOUT, '/logout')
  })

  test('all routes start with /', ({ assert }) => {
    for (const route of Object.values(AuthRoutes)) {
      assert.isTrue(route.startsWith('/'))
    }
  })
})

// ============================================================================
// PageRoutes
// ============================================================================
test.group('PageRoutes', () => {
  test('has HOME route', ({ assert }) => {
    assert.equal(PageRoutes.HOME, '/')
  })

  test('has DASHBOARD route', ({ assert }) => {
    assert.equal(PageRoutes.DASHBOARD, '/dashboard')
  })

  test('has main domain routes', ({ assert }) => {
    assert.equal(PageRoutes.ORGANIZATIONS, '/organizations')
    assert.equal(PageRoutes.PROJECTS, '/projects')
    assert.equal(PageRoutes.TASKS, '/tasks')
    assert.equal(PageRoutes.CONVERSATIONS, '/conversations')
    assert.equal(PageRoutes.REVIEWS, '/reviews')
    assert.equal(PageRoutes.SETTINGS, '/settings')
    assert.equal(PageRoutes.NOTIFICATIONS, '/notifications')
  })

  test('all routes start with /', ({ assert }) => {
    for (const route of Object.values(PageRoutes)) {
      assert.isTrue(route.startsWith('/'))
    }
  })
})

// ============================================================================
// ApiRoutes
// ============================================================================
test.group('ApiRoutes', () => {
  test('all API routes start with /api/', ({ assert }) => {
    for (const route of Object.values(ApiRoutes)) {
      assert.isTrue(route.startsWith('/api/'))
    }
  })

  test('has main domain API routes', ({ assert }) => {
    assert.equal(ApiRoutes.ORGANIZATIONS, '/api/organizations')
    assert.equal(ApiRoutes.PROJECTS, '/api/projects')
    assert.equal(ApiRoutes.TASKS, '/api/tasks')
    assert.equal(ApiRoutes.USERS, '/api/users')
    assert.equal(ApiRoutes.NOTIFICATIONS, '/api/notifications')
    assert.equal(ApiRoutes.CONVERSATIONS, '/api/conversations')
  })
})

// ============================================================================
// ErrorRoutes
// ============================================================================
test.group('ErrorRoutes', () => {
  test('has NOT_FOUND route', ({ assert }) => {
    assert.equal(ErrorRoutes.NOT_FOUND, '/errors/not-found')
  })

  test('has SERVER_ERROR route', ({ assert }) => {
    assert.equal(ErrorRoutes.SERVER_ERROR, '/errors/server-error')
  })

  test('has FORBIDDEN route', ({ assert }) => {
    assert.equal(ErrorRoutes.FORBIDDEN, '/errors/forbidden')
  })

  test('has REQUIRE_ORGANIZATION route', ({ assert }) => {
    assert.equal(ErrorRoutes.REQUIRE_ORGANIZATION, '/errors/require-organization')
  })

  test('all error routes start with /errors/', ({ assert }) => {
    for (const route of Object.values(ErrorRoutes)) {
      assert.isTrue(route.startsWith('/errors/'))
    }
  })
})

// ============================================================================
// InertiaPages
// ============================================================================
test.group('InertiaPages', () => {
  test('has error page components', ({ assert }) => {
    assert.equal(InertiaPages.ERROR_NOT_FOUND, 'errors/not_found')
    assert.equal(InertiaPages.ERROR_SERVER_ERROR, 'errors/server_error')
    assert.equal(InertiaPages.ERROR_FORBIDDEN, 'errors/forbidden')
    assert.equal(InertiaPages.ERROR_REQUIRE_ORGANIZATION, 'errors/require_organization')
    assert.equal(InertiaPages.ERROR_GENERIC, 'errors/error')
  })

  test('all inertia pages start with errors/', ({ assert }) => {
    for (const page of Object.values(InertiaPages)) {
      assert.isTrue(page.startsWith('errors/'))
    }
  })
})
