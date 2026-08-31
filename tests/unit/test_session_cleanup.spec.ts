import { test } from '@japa/runner'

import {
  clearMemorySessionState,
  clearTaggedTestSessions,
  type TestSessionCollection,
} from '#tests/helpers/factories/cleanup'

class FakeMemoryStore {
  static sessions = new Map<string, unknown>()
  static tags = new Map<string, unknown>()
}

test.group('Unit | test session cleanup', () => {
  test('destroys every tagged session for the users being cleaned', async ({ assert }) => {
    const destroyed: string[] = []
    const sessions: TestSessionCollection = {
      supportsTagging: () => true,
      tagged: (userId) =>
        Promise.resolve(userId === 'user-1' ? [{ id: 'session-1', data: {} }] : []),
      destroy: (sessionId) => {
        destroyed.push(sessionId)
        return Promise.resolve()
      },
    }

    await clearTaggedTestSessions(sessions, ['user-1', 'user-2'])

    assert.deepEqual(destroyed, ['session-1'])
  })

  test('clears untagged memory sessions as well', ({ assert }) => {
    FakeMemoryStore.sessions.set('session-1', { auth_web: 'user-1' })
    FakeMemoryStore.tags.set('session-1', 'user-1')

    clearMemorySessionState(new FakeMemoryStore())

    assert.isEmpty(FakeMemoryStore.sessions)
    assert.isEmpty(FakeMemoryStore.tags)
  })
})
