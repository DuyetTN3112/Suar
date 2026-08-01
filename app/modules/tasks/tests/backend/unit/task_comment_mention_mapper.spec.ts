import { test } from '@japa/runner'

import {
  extractTaskCommentMentionTokens,
  mapResolvedTaskCommentMentions,
} from '#modules/tasks/actions/mapper/task_comment_mention_mapper'

test.group('Unit | Task comment mention mapper', () => {
  test('normalizes and deduplicates mention tokens before identity mapping', ({ assert }) => {
    const tokens = extractTaskCommentMentionTokens(
      'Please ask @Alice, then @alice and @bob.dev for review'
    )

    assert.deepEqual(tokens, ['alice', 'bob.dev'])
    assert.deepEqual(
      mapResolvedTaskCommentMentions(tokens, [
        { id: 'user-2', username: 'Bob.Dev' },
        { id: 'user-1', username: 'Alice' },
      ]),
      [
        { userId: 'user-1', username: 'Alice', token: 'alice' },
        { userId: 'user-2', username: 'Bob.Dev', token: 'bob.dev' },
      ]
    )
  })

  test('drops mention tokens that have no organization identity', ({ assert }) => {
    assert.deepEqual(
      mapResolvedTaskCommentMentions(['missing'], [
        { id: 'user-1', username: 'alice' },
      ]),
      []
    )
  })
})
