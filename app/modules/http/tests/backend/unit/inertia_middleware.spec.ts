import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import type { HttpOrganizationReader } from '#modules/http/actions/ports/outbound/http_organization_reader'
import type { InertiaProjectDirectory } from '#modules/http/actions/ports/outbound/inertia_project_directory'
import InertiaMiddleware from '#modules/http/middleware/inertia_middleware'

function toHttpContext(value: unknown): HttpContext {
  return value as HttpContext
}

function authenticatedContext(url: string, user: Record<string, unknown>, sessionValues = {}) {
  const values = new Map<string, unknown>(Object.entries(sessionValues))

  return toHttpContext({
    request: {
      url: () => url,
      csrfToken: 'csrf-token',
      header: () => null,
    },
    auth: {
      check: () => Promise.resolve(true),
      user,
    },
    inertia: {
      always: (value: unknown) => value,
    },
    session: {
      get(key: string, fallback?: unknown) {
        return values.has(key) ? values.get(key) : fallback
      },
      put(key: string, value: unknown) {
        values.set(key, value)
      },
      forget(key: string) {
        values.delete(key)
      },
      commit: () => Promise.resolve(),
      flashMessages: {
        get: (_key: string, fallback?: unknown) => fallback,
      },
    },
  })
}

test.group('InertiaMiddleware exception boundary', () => {
  const projectDirectory: InertiaProjectDirectory = {
    listAccessibleByOrganization: () => Promise.resolve([]),
  }
  const organizationReader: HttpOrganizationReader = {
    listUsers: () => Promise.resolve([]),
    listApprovedMembershipSummaries: () => Promise.resolve([]),
  }

  test('propagates authentication infrastructure failures instead of returning a false guest', async ({
    assert,
  }) => {
    const middleware = new InertiaMiddleware(projectDirectory, organizationReader)
    const failure = new Error('authentication store unavailable')
    const ctx = toHttpContext({
      request: {
        url: () => '/tasks',
      },
      auth: {
        check: () => Promise.reject(failure),
      },
    })

    await assert.rejects(() => middleware.share(ctx), /authentication store unavailable/)
  })

  test('disposes Inertia state when a downstream handler fails', async ({ assert }) => {
    const middleware = new InertiaMiddleware(projectDirectory, organizationReader)
    const lifecycle = {
      initialized: false,
      disposed: false,
    }
    const runtimeMiddleware = middleware as unknown as {
      init(ctx: HttpContext): Promise<void>
      dispose(ctx: HttpContext): void
    }
    runtimeMiddleware.init = () => {
      lifecycle.initialized = true
      return Promise.resolve()
    }
    runtimeMiddleware.dispose = () => {
      lifecycle.disposed = true
    }
    const ctx = toHttpContext({
      request: {
        url: () => '/tasks',
      },
      inertia: {
        setRootView() {},
      },
    })
    const failure = new Error('downstream failed')

    await assert.rejects(
      () => middleware.handle(ctx, () => Promise.reject(failure)),
      /downstream failed/
    )
    assert.isTrue(lifecycle.initialized)
    assert.isTrue(lifecycle.disposed)
  })
})

test.group('InertiaMiddleware realm isolation', () => {
  const baseUser = {
    id: 'principal-1',
    email: 'principal@example.com',
    username: 'principal',
    avatar_url: null,
    system_role: 'system_admin',
    current_organization_id: 'org-1',
    user_setting: null,
  }

  test('System shared props never load or expose User workspace state', async ({ assert }) => {
    const middleware = new InertiaMiddleware(
      {
        listAccessibleByOrganization() {
          throw new Error('System realm must not load project memberships')
        },
      },
      {
        listUsers: () => Promise.resolve([]),
        listApprovedMembershipSummaries() {
          throw new Error('System realm must not load organization memberships')
        },
      }
    )

    const props = (await middleware.share(
      authenticatedContext('/admin/disputes', baseUser, {
        current_organization_id: 'org-1',
        current_project_id: 'project-1',
      })
    )) as Record<string, unknown>
    const auth = props['auth'] as { user: Record<string, unknown> }

    assert.equal(auth.user['realm'], 'system')
    assert.equal(auth.user['system_role'], 'system_admin')
    assert.isArray(auth.user['system_permissions'])
    assert.notProperty(auth.user, 'organizations')
    assert.notProperty(auth.user, 'projects')
    assert.notProperty(auth.user, 'current_project')
    assert.notProperty(props, 'workspaceAccess')
  })

  test('User shared props never expose System authorization', async ({ assert }) => {
    const middleware = new InertiaMiddleware(
      {
        listAccessibleByOrganization: () =>
          Promise.resolve([{ id: 'project-1', name: 'Apollo' }]),
      },
      {
        listUsers: () => Promise.resolve([]),
        listApprovedMembershipSummaries: () =>
          Promise.resolve([
            {
              id: 'org-1',
              name: 'Acme',
              logo: null,
              orgRole: 'org_member',
              status: 'approved',
            },
          ]),
      }
    )

    const props = (await middleware.share(
      authenticatedContext('/projects/project-1/tasks', baseUser, {
        current_organization_id: 'org-1',
        current_project_id: 'project-1',
      })
    )) as Record<string, unknown>
    const auth = props['auth'] as { user: Record<string, unknown> }
    const workspaceAccess = props['workspaceAccess'] as Record<string, unknown>

    assert.equal(auth.user['realm'], 'user')
    assert.notProperty(auth.user, 'system_role')
    assert.notProperty(auth.user, 'system_permissions')
    assert.notProperty(auth.user, 'isAdmin')
    assert.notProperty(auth.user, 'canSwitchToAdmin')
    assert.equal(workspaceAccess['realm'], 'user')
    assert.deepEqual(workspaceAccess['projects'], [
      { id: 'project-1', name: 'Apollo', canEnter: true },
    ])
  })
})
