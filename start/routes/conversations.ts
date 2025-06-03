import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'
import { throttle } from '#start/limiter'

// Conversation use-case controllers
const ListConversationsController = () =>
  import('#controllers/conversations/list_conversations_controller')
const CreateConversationController = () =>
  import('#controllers/conversations/create_conversation_controller')
const StoreConversationController = () =>
  import('#controllers/conversations/store_conversation_controller')
const ShowConversationController = () =>
  import('#controllers/conversations/show_conversation_controller')
const ShowConversationApiController = () =>
  import('#controllers/conversations/show_conversation_api_controller')
const SendMessageController = () => import('#controllers/conversations/send_message_controller')
const SendMessageApiController = () =>
  import('#controllers/conversations/send_message_api_controller')
const MarkConversationReadController = () =>
  import('#controllers/conversations/mark_conversation_read_controller')
const RecallMessageController = () => import('#controllers/conversations/recall_message_controller')

router
  .group(() => {
    // Conversation routes - CRUD cơ bản
    router.get('/conversations', [ListConversationsController, 'handle']).as('conversations.index')
    router
      .get('/conversations/create', [CreateConversationController, 'handle'])
      .as('conversations.create')
    router.post('/conversations', [StoreConversationController, 'handle']).as('conversations.store')
    // Hiển thị và xem chi tiết
    router
      .get('/conversations/:id', [ShowConversationController, 'handle'])
      .as('conversations.show')
    router
      .get('/api/conversations/:id', [ShowConversationApiController, 'handle'])
      .as('api.conversations.show')
    // Xử lý tin nhắn
    router
      .post('/conversations/:id/messages', [SendMessageController, 'handle'])
      .as('conversations.send_message')
      .use([middleware.messageSanitizer()])
    router
      .post('/conversations/:id/mark-as-read', [MarkConversationReadController, 'handle'])
      .as('conversations.mark_as_read')
    router
      .post('/api/conversations/:id/messages', [SendMessageApiController, 'handle'])
      .as('api.conversations.send_message')
    router
      .post('/api/conversations/:id/mark-as-read', [MarkConversationReadController, 'handle'])
      .as('api.conversations.mark_as_read')

    // Thu hồi tin nhắn
    router
      .post('/api/conversations/:id/messages/:messageId/recall', [
        RecallMessageController,
        'handle',
      ])
      .as('api.conversations.recall_message')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])
