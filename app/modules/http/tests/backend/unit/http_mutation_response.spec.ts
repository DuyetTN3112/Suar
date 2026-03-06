import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import {
  respondCreatedMutationSuccess,
  respondMutationSuccess,
} from '#modules/http/boundary/http_mutation_response'

function toHttpContext(
  value: unknown
): HttpContext {
  return value as HttpContext
}

test.group('HTTP mutation response', () => {
  test('returns no content for API transports', ({ assert }) => {
    const responseState = {
      noContentCalled: false,
      redirectedTo: null as string | null,
      redirectedBack: false,
    }
    const flashes: Array<{ key: string; value: string }> = []

    const ctx = {
      request: {
        url: () => '/api/organizations/current/members/invite',
        header: () => null,
        accepts: () => 'json',
      },
      session: {
        flash(key: string, value: string) {
          flashes.push({ key, value })
        },
      },
      response: {
        noContent() {
          responseState.noContentCalled = true
        },
        redirect() {
          return {
            back() {
              responseState.redirectedBack = true
            },
            toRoute(route: string) {
              responseState.redirectedTo = route
            },
          }
        },
      },
    }

    respondMutationSuccess(toHttpContext(ctx), {
      redirect: {
        kind: 'route',
        to: 'org.members.index',
      },
      successMessage: 'Updated',
    })

    assert.isTrue(responseState.noContentCalled)
    assert.isNull(responseState.redirectedTo)
    assert.isFalse(responseState.redirectedBack)
    assert.deepEqual(flashes, [])
  })

  test('flashes success and redirects for page transports', ({ assert }) => {
    const responseState = {
      noContentCalled: false,
      redirectedTo: null as string | null,
      redirectedBack: false,
    }
    const flashes: Array<{ key: string; value: string }> = []

    const ctx = {
      request: {
        url: () => '/org/members/invite',
        header: () => null,
        accepts: () => 'html',
      },
      session: {
        flash(key: string, value: string) {
          flashes.push({ key, value })
        },
      },
      response: {
        noContent() {
          responseState.noContentCalled = true
        },
        redirect() {
          return {
            back() {
              responseState.redirectedBack = true
            },
            toRoute(route: string) {
              responseState.redirectedTo = route
            },
          }
        },
      },
    }

    respondMutationSuccess(toHttpContext(ctx), {
      redirect: {
        kind: 'route',
        to: 'org.invitations.index',
      },
      successMessage: 'Invited',
    })

    assert.isFalse(responseState.noContentCalled)
    assert.equal(responseState.redirectedTo, 'org.invitations.index')
    assert.isFalse(responseState.redirectedBack)
    assert.deepEqual(flashes, [{ key: 'success', value: 'Invited' }])
  })

  test('redirects back for page mutation success when configured', ({ assert }) => {
    const responseState = {
      noContentCalled: false,
      redirectedTo: null as string | null,
      redirectedBack: false,
    }
    const flashes: Array<{ key: string; value: string }> = []

    const ctx = {
      request: {
        url: () => '/projects/members',
        header: () => null,
        accepts: () => 'html',
      },
      session: {
        flash(key: string, value: string) {
          flashes.push({ key, value })
        },
      },
      response: {
        noContent() {
          responseState.noContentCalled = true
        },
        redirect() {
          return {
            back() {
              responseState.redirectedBack = true
            },
            toRoute(route: string) {
              responseState.redirectedTo = route
            },
          }
        },
      },
    }

    respondMutationSuccess(toHttpContext(ctx), {
      redirect: {
        kind: 'back',
      },
      successMessage: 'Saved',
    })

    assert.isFalse(responseState.noContentCalled)
    assert.isTrue(responseState.redirectedBack)
    assert.isNull(responseState.redirectedTo)
    assert.deepEqual(flashes, [{ key: 'success', value: 'Saved' }])
  })

  test('returns created JSON payload for API transports', ({ assert }) => {
    const responseState = {
      statusCode: 200,
      payload: null as unknown,
      redirectedTo: null as string | null,
      redirectedBack: false,
    }
    const flashes: Array<{ key: string; value: string }> = []

    const ctx = {
      request: {
        url: () => '/api/projects',
        header: () => null,
        accepts: () => 'json',
      },
      session: {
        flash(key: string, value: string) {
          flashes.push({ key, value })
        },
      },
      response: {
        status(code: number) {
          responseState.statusCode = code
          return this
        },
        json(payload: unknown) {
          responseState.payload = payload
          return this
        },
        redirect() {
          return {
            back() {
              responseState.redirectedBack = true
            },
            toRoute(route: string) {
              responseState.redirectedTo = route
            },
          }
        },
      },
    }

    respondCreatedMutationSuccess(toHttpContext(ctx), {
      apiBody: { data: { id: 'project_1' } },
      redirect: {
        kind: 'route',
        to: 'org.projects.index',
      },
      successMessage: 'Created',
    })

    assert.equal(responseState.statusCode, 201)
    assert.deepEqual(responseState.payload, { data: { id: 'project_1' } })
    assert.isNull(responseState.redirectedTo)
    assert.isFalse(responseState.redirectedBack)
    assert.deepEqual(flashes, [])
  })
})
