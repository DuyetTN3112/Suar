import { test } from '@japa/runner'

import ProcessSocialAuthCallbackCommand from '#modules/auth/actions/commands/process_social_auth_callback_command'
import type SocialLoginCommand from '#modules/auth/actions/commands/social_login_command'
import type { SocialAuthCallbackSource } from '#modules/auth/actions/dtos/request/social_auth_callback_source'
import { AuthEventIdentityGenerator } from '#modules/auth/actions/ports/outbound/auth_event_identity_generator'
import { AuthSessionObservationStager } from '#modules/auth/actions/ports/outbound/auth_session_observation_stager'
import {
  SOCIAL_AUTH_FAILURE_CODES,
  SocialAuthCallbackReader,
} from '#modules/auth/actions/ports/outbound/social_auth_callback_reader'
import { SocialWebSessionLogin } from '#modules/auth/actions/ports/outbound/social_web_session_login'
import type { AuthSessionObservation } from '#modules/auth/domain/auth_session_observation'

const callbackSource: SocialAuthCallbackSource = {
  accessDenied: () => false,
  stateMisMatch: () => false,
  hasError: () => false,
  getError: () => null,
  user: () => Promise.resolve({}),
}

test.group('ProcessSocialAuthCallbackCommand', () => {
  test('owns callback, web-session, organization binding, and durable observation orchestration', async ({
    assert,
  }) => {
    const calls: string[] = []
    const observations: AuthSessionObservation[] = []
    const callbackReader = new (class extends SocialAuthCallbackReader {
      readCallback() {
        calls.push('callback')
        return Promise.resolve({
          type: 'success' as const,
          socialUser: {
            id: 'github-user',
            email: 'oauth@example.test',
            name: 'OAuth User',
            nickName: 'oauth-user',
            token: 'secret-token',
            refreshToken: 'secret-refresh',
          },
        })
      }
    })()
    const socialLogin = {
      execute: () => {
        calls.push('social-login')
        return Promise.resolve({
          user: {
            id: 'user-1',
            email: 'oauth@example.test',
            system_role: 'user',
            current_organization_id: 'org-1',
            auth_method: 'github' as const,
          },
          isNewUser: false,
          redirectTo: '/dashboard',
        })
      },
    } as unknown as SocialLoginCommand
    const webSessionLogin = new (class extends SocialWebSessionLogin {
      async login(
        session: Parameters<SocialWebSessionLogin['login']>[0],
        userId: string,
        remember: boolean,
        currentOrganizationId: string | null
      ) {
        calls.push('web-session')
        await session.loginIdentity({ id: userId }, remember)
        if (currentOrganizationId) {
          session.setCurrentOrganizationId(currentOrganizationId)
        }
      }
    })()
    const observationStager = new (class extends AuthSessionObservationStager {
      stage(observation: AuthSessionObservation) {
        calls.push('observation')
        observations.push(observation)
        return Promise.resolve()
      }
    })()
    const eventIdentities = new (class extends AuthEventIdentityGenerator {
      next() {
        return {
          eventId: 'event-1',
          occurredAt: '2026-07-28T12:00:00.000Z',
        }
      }
    })()
    const command = new ProcessSocialAuthCallbackCommand(
      callbackReader,
      socialLogin,
      webSessionLogin,
      observationStager,
      eventIdentities
    )
    let currentOrganizationId: string | null = null

    const result = await command.execute({
      context: {
        userId: null,
        organizationId: null,
        ip: '203.0.113.7',
        userAgent: 'command-test',
        requestId: 'request-1',
        traceId: 'trace-1',
      },
      provider: 'github',
      socialAuth: callbackSource,
      webSession: {
        loginIdentity: (identity, remember) => {
          calls.push('session-login')
          assert.deepEqual(identity, { id: 'user-1' })
          assert.isTrue(remember)
          return Promise.resolve()
        },
        setCurrentOrganizationId: (organizationId) => {
          calls.push('session-organization')
          currentOrganizationId = organizationId
        },
      },
    })

    assert.deepEqual(calls, [
      'callback',
      'social-login',
      'web-session',
      'session-login',
      'session-organization',
      'observation',
    ])
    assert.equal(currentOrganizationId, 'org-1')
    assert.deepEqual(observations, [
      {
        eventId: 'event-1',
        userId: 'user-1',
        action: 'login',
        occurredAt: '2026-07-28T12:00:00.000Z',
        ipAddress: '203.0.113.7',
        userAgent: 'command-test',
        method: 'oauth',
        requestId: 'request-1',
        traceId: 'trace-1',
      },
    ])
    assert.deepEqual(result, {
      type: 'success',
      user: {
        id: 'user-1',
        email: 'oauth@example.test',
        system_role: 'user',
        current_organization_id: 'org-1',
        auth_method: 'github',
      },
      redirectTo: '/dashboard',
      currentOrganizationId: 'org-1',
    })
  })

  test('returns a provider failure without starting login side effects', async ({ assert }) => {
    const callbackReader = new (class extends SocialAuthCallbackReader {
      readCallback() {
        return Promise.resolve({
          type: 'error' as const,
          publicCode: SOCIAL_AUTH_FAILURE_CODES.ACCESS_DENIED,
          safeMessage: 'Access denied',
        })
      }
    })()
    const fail = () => {
      throw new Error('login side effect must not run')
    }
    const command = new ProcessSocialAuthCallbackCommand(
      callbackReader,
      { execute: fail } as unknown as SocialLoginCommand,
      { login: fail },
      { stage: fail },
      { next: fail }
    )

    const result = await command.execute({
      context: {
        userId: null,
        organizationId: null,
        ip: '203.0.113.7',
        userAgent: 'command-test',
      },
      provider: 'github',
      socialAuth: callbackSource,
      webSession: {
        loginIdentity: () => fail(),
        setCurrentOrganizationId: fail,
      },
    })

    assert.deepEqual(result, {
      type: 'error',
      publicCode: SOCIAL_AUTH_FAILURE_CODES.ACCESS_DENIED,
      safeMessage: 'Access denied',
    })
  })
})
