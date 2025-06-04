import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  ConversationFactory,
  MessageFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import Message from '#models/message'
import ConversationParticipant from '#models/conversation_participant'
import OrganizationUser from '#models/organization_user'
import { OrganizationRole } from '#constants/organization_constants'

test.group('Integration | Messages', (group) => {
  group.setup(() => setupApp())
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('create message in conversation', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const conversation = await ConversationFactory.create({
      organization_id: org.id,
    })
    await ConversationParticipant.createBatch(conversation.id, [owner.id])

    const message = await MessageFactory.create({
      conversation_id: conversation.id,
      sender_id: owner.id,
      message: 'Hello world',
    })

    assert.isNotNull(message.id)
    assert.equal(message.conversation_id, conversation.id)
    assert.equal(message.sender_id, owner.id)
    assert.equal(message.message, 'Hello world')
    assert.equal(message.send_status, 'sent')
    assert.isFalse(message.is_recalled)
  })

  test('markAllAsReadInConversation marks other user messages', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    const conversation = await ConversationFactory.create({
      organization_id: org.id,
    })
    await ConversationParticipant.createBatch(conversation.id, [owner.id, user.id])

    await MessageFactory.create({
      conversation_id: conversation.id,
      sender_id: owner.id,
      message: 'Message from owner',
    })

    // User marks all as read
    await Message.markAllAsReadInConversation(conversation.id, user.id)

    const unread = await Message.countUnreadInConversation(conversation.id, user.id)
    assert.equal(unread, 0)
  })

  test('countUnreadInConversation counts unread messages', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    const conversation = await ConversationFactory.create({
      organization_id: org.id,
    })
    await ConversationParticipant.createBatch(conversation.id, [owner.id, user.id])

    await MessageFactory.create({
      conversation_id: conversation.id,
      sender_id: owner.id,
      message: 'Message 1',
    })
    await MessageFactory.create({
      conversation_id: conversation.id,
      sender_id: owner.id,
      message: 'Message 2',
    })

    const unread = await Message.countUnreadInConversation(conversation.id, user.id)
    assert.equal(unread, 2)
  })

  test('own messages not counted as unread', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const conversation = await ConversationFactory.create({
      organization_id: org.id,
    })
    await ConversationParticipant.createBatch(conversation.id, [owner.id])

    await MessageFactory.create({
      conversation_id: conversation.id,
      sender_id: owner.id,
      message: 'My own message',
    })

    const unread = await Message.countUnreadInConversation(conversation.id, owner.id)
    assert.equal(unread, 0)
  })

  test('recalled message excluded from unread count', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    const conversation = await ConversationFactory.create({
      organization_id: org.id,
    })
    await ConversationParticipant.createBatch(conversation.id, [owner.id, user.id])

    const { DateTime } = await import('luxon')

    await MessageFactory.create({
      conversation_id: conversation.id,
      sender_id: owner.id,
      message: 'Recalled message',
      is_recalled: true,
      recalled_at: DateTime.now(),
      recall_scope: 'all',
    })

    const unread = await Message.countUnreadInConversation(conversation.id, user.id)
    assert.equal(unread, 0)
  })

  test('markSpecificAsRead marks only specified messages', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    const conversation = await ConversationFactory.create({
      organization_id: org.id,
    })
    await ConversationParticipant.createBatch(conversation.id, [owner.id, user.id])

    const msg1 = await MessageFactory.create({
      conversation_id: conversation.id,
      sender_id: owner.id,
      message: 'Message 1',
    })
    await MessageFactory.create({
      conversation_id: conversation.id,
      sender_id: owner.id,
      message: 'Message 2',
    })

    await Message.markSpecificAsRead(conversation.id, [msg1.id], user.id)

    const unread = await Message.countUnreadInConversation(conversation.id, user.id)
    assert.equal(unread, 1)
  })

  test('getLastMessageInConversation returns latest message', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const conversation = await ConversationFactory.create({
      organization_id: org.id,
    })
    await ConversationParticipant.createBatch(conversation.id, [owner.id])

    await MessageFactory.create({
      conversation_id: conversation.id,
      sender_id: owner.id,
      message: 'First message',
    })
    await MessageFactory.create({
      conversation_id: conversation.id,
      sender_id: owner.id,
      message: 'Last message',
    })

    const lastMsg = await Message.getLastMessageInConversation(conversation.id, owner.id)
    assert.isNotNull(lastMsg)
    assert.equal(lastMsg!.message, 'Last message')
  })

  test('paginateByConversation returns paginated messages', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const conversation = await ConversationFactory.create({
      organization_id: org.id,
    })
    await ConversationParticipant.createBatch(conversation.id, [owner.id])

    for (let i = 0; i < 5; i++) {
      await MessageFactory.create({
        conversation_id: conversation.id,
        sender_id: owner.id,
        message: `Message ${i}`,
      })
    }

    const result = await Message.paginateByConversation(
      conversation.id,
      owner.id,
      { page: 1, limit: 3 }
    )

    assert.equal(result.total, 5)
    assert.lengthOf(result.data, 3)
  })

  test('countUnreadBatch returns counts for multiple conversations', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    const conv1 = await ConversationFactory.create({ organization_id: org.id })
    const conv2 = await ConversationFactory.create({ organization_id: org.id })

    await ConversationParticipant.createBatch(conv1.id, [owner.id, user.id])
    await ConversationParticipant.createBatch(conv2.id, [owner.id, user.id])

    await MessageFactory.create({
      conversation_id: conv1.id,
      sender_id: owner.id,
      message: 'Conv1 msg',
    })
    await MessageFactory.create({
      conversation_id: conv2.id,
      sender_id: owner.id,
      message: 'Conv2 msg 1',
    })
    await MessageFactory.create({
      conversation_id: conv2.id,
      sender_id: owner.id,
      message: 'Conv2 msg 2',
    })

    const counts = await Message.countUnreadBatch([conv1.id, conv2.id], user.id)
    assert.equal(counts.get(conv1.id), 1)
    assert.equal(counts.get(conv2.id), 2)
  })
})
