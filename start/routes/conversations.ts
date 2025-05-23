import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Conversations controllers
const ConversationsController = () => import('#controllers/conversations/conversations_controller')
const ConversationsViewController = () =>
  import('#controllers/conversations/conversations_view_controller')
const ConversationsMessageController = () =>
  import('#controllers/conversations/conversations_message_controller')
const ConversationController = () => import('#controllers/conversations/conversation_controller')

router
  .group(() => {
    // New style conversation routes - CRUD cơ bản
    router.get('/conversations', [ConversationsController, 'index']).as('conversations.index')
    router
      .get('/conversations/create', [ConversationsController, 'create'])
      .as('conversations.create')
    router.post('/conversations', [ConversationsController, 'store']).as('conversations.store')
    // Hiển thị và xem chi tiết
    router.get('/conversations/:id', [ConversationsViewController, 'show']).as('conversations.show')
    router
      .get('/api/conversations/:id', [ConversationsViewController, 'apiShow'])
      .as('api.conversations.show')
    // Xử lý tin nhắn
    router
      .post('/conversations/:id/messages', [ConversationsMessageController, 'sendMessage'])
      .as('conversations.send_message')
      .use([middleware.messageSanitizer()])
    router
      .post('/conversations/:id/mark-as-read', [ConversationsMessageController, 'markAsRead'])
      .as('conversations.mark_as_read')
    router
      .post('/api/conversations/:id/messages', [ConversationsMessageController, 'apiSendMessage'])
      .as('api.conversations.send_message')
    router
      .post('/api/conversations/:id/mark-as-read', [ConversationsMessageController, 'markAsRead'])
      .as('api.conversations.mark_as_read')

    // Thêm route để thu hồi tin nhắn
    router
      .post('/api/conversations/:id/messages/:messageId/recall', [
        ConversationsMessageController,
        'recallMessage',
      ])
      .as('api.conversations.recall_message')

    // Legacy conversation routes
    router.get('/conversation', [ConversationController, 'index']).as('conversation.index')
    router.get('/conversation/create', [ConversationController, 'create']).as('conversation.create')
    router.post('/conversation', [ConversationController, 'store']).as('conversation.store')
    router.get('/conversation/:id', [ConversationController, 'show']).as('conversation.show')
    router
      .post('/conversation/:id/participants', [ConversationController, 'addParticipant'])
      .as('conversation.add_participant')
    router
      .post('/conversation/:id/messages', [ConversationController, 'sendMessage'])
      .as('conversation.send_message')
      .use([middleware.messageSanitizer()])
    router
      .post('/conversation/:id/mark-as-read', [ConversationController, 'markAsRead'])
      .as('conversation.mark_as_read')
    router
      .delete('/conversation/:id', [ConversationController, 'destroy'])
      .as('conversation.destroy')
  })
  .use([middleware.auth(), middleware.requireOrg()])
