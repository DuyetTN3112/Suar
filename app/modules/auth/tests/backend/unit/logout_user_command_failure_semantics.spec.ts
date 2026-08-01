import { test } from '@japa/runner'

import type { AuthActionContext } from '#modules/auth/actions/auth_action_context'
import LogoutUserCommand, {
  type LogoutUserCommandDependencies,
} from '#modules/auth/actions/commands/logout_user_command'
import { LogoutUserDTO } from '#modules/auth/actions/dtos/request/logout_user_dto'

const USER_ID = 'f79ed770-b2f5-488e-95fe-5919854351de'
const SESSION_ID = 'private-session-id'
const eventIdentity = {
  eventId: '9b8c272e-384b-4f8b-bbce-2f55bb432079',
  occurredAt: '2026-07-26T10:00:00.000Z',
}
const eventIdentities = {
  next: () => eventIdentity,
}

const execCtx: AuthActionContext = {
  userId: USER_ID,
  ip: '203.0.113.9',
  userAgent: 'logout-failure-semantics-spec',
  organizationId: null,
  requestId: 'request-1',
  traceId: 'trace-1',
  workflowId: null,
}

const dto = new LogoutUserDTO({
  userId: USER_ID,
  sessionId: SESSION_ID,
  ipAddress: '198.51.100.7',
})

test.group('Logout user command failure semantics', () => {
  test('does not turn a completed logout into a failure when durable staging fails', async ({
    assert,
  }) => {
    const publishedEvents: Parameters<LogoutUserCommandDependencies['publishLogout']>[0][] = []
    const dependencies: LogoutUserCommandDependencies = {
      stageEvidence: () => Promise.reject(new Error('outbox unavailable')),
      publishLogout: (event) => {
        publishedEvents.push(event)
        return Promise.resolve()
      },
    }

    await assert.doesNotReject(() =>
      new LogoutUserCommand(dependencies, eventIdentities).execute({
        context: execCtx,
        dto,
        revokeWebSession: () => Promise.resolve(),
      })
    )

    assert.deepEqual(publishedEvents, [
      {
        userId: execCtx.userId,
        ip: dto.ipAddress,
        sessionId: dto.sessionId,
      },
    ])
  })

  test('stages privacy-safe durable evidence independently when realtime revocation fails', async ({
    assert,
  }) => {
    const stagedEvents: Parameters<LogoutUserCommandDependencies['stageEvidence']>[0][] = []
    const dependencies: LogoutUserCommandDependencies = {
      stageEvidence: (event) => {
        stagedEvents.push(event)
        return Promise.resolve()
      },
      publishLogout: () => Promise.reject(new Error('event transport unavailable')),
    }

    await assert.doesNotReject(() =>
      new LogoutUserCommand(dependencies, eventIdentities).execute({
        context: execCtx,
        dto,
        revokeWebSession: () => Promise.resolve(),
      })
    )

    assert.lengthOf(stagedEvents, 1)
    assert.deepInclude(stagedEvents[0], {
      userId: USER_ID,
      action: 'logout',
      ipAddress: execCtx.ip,
      userAgent: execCtx.userAgent,
      method: null,
      requestId: execCtx.requestId,
      traceId: execCtx.traceId,
    })
    assert.equal(stagedEvents[0]?.eventId, eventIdentity.eventId)
    assert.equal(stagedEvents[0]?.occurredAt, eventIdentity.occurredAt)
    assert.notInclude(JSON.stringify(stagedEvents), SESSION_ID)
  })

  test('does not record successful logout effects when web-session revocation fails', async ({
    assert,
  }) => {
    let sideEffectCalls = 0
    const dependencies: LogoutUserCommandDependencies = {
      stageEvidence: () => {
        sideEffectCalls += 1
        return Promise.resolve()
      },
      publishLogout: () => {
        sideEffectCalls += 1
        return Promise.resolve()
      },
    }
    const command = new LogoutUserCommand(dependencies, eventIdentities)

    await assert.rejects(
      () =>
        command.execute({
          context: execCtx,
          dto,
          revokeWebSession: () => Promise.reject(new Error('session revoke failed')),
        }),
      'session revoke failed'
    )
    assert.equal(sideEffectCalls, 0)
  })
})
