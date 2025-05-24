import React, { useEffect, useRef } from 'react'
import { Head, router } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import { ConversationProps } from './types'
import { groupMessagesByDate } from './utils/message_utils'
import { ConversationHeader } from './components/conversation_header'
import { MessageGroupComponent } from './components/message_group'
import { MessageInput } from './components/message_input'
import useTranslation from '@/hooks/use_translation'

export default function ShowConversation({ conversation, messages, pagination, currentUser }: ConversationProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const auth = (window as any).auth || {}
  const loggedInUserFromWindow = auth?.user || null
  const { t } = useTranslation()

  // Ưu tiên sử dụng currentUser từ props, nếu không có thì dùng từ window
  const loggedInUser = currentUser || loggedInUserFromWindow || null
  const loggedInUserId = loggedInUser?.id || ''

  // Kiểm tra thông tin auth
  useEffect(() => {
    if (!loggedInUser) {
      console.warn("Cảnh báo: Không có thông tin người dùng đăng nhập!")
    }
  }, [loggedInUser])

  // Thêm hàm refreshMessages vào window để component MessageInput có thể gọi
  useEffect(() => {
    window.refreshMessages = () => {
      // Gọi API để làm mới tin nhắn
      router.reload({ only: ['messages', 'pagination'] })
    }

    // Dọn dẹp khi component unmount
    return () => {
      window.refreshMessages = undefined
    }
  }, [])

  // Cuộn xuống tin nhắn mới nhất (cuối trang)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMoreMessages = () => {
    if (pagination.hasMore) {
      router.get(`/conversations/${conversation.id}`, {
        page: pagination.page + 1,
        limit: pagination.limit
      }, {
        preserveState: true,
        preserveScroll: true,
        only: ['messages', 'pagination']
      })
    }
  }

  // Nhóm tin nhắn theo ngày
  const messageGroups = groupMessagesByDate(messages?.data)

  // Tên của cuộc trò chuyện để hiển thị trong tiêu đề
  const conversationName = conversation.title || conversation.conversation_participants
    .map(cp => cp.user.full_name)
    .filter(name => name)
    .join(', ')

  // Tìm người tham gia khác (nếu là cuộc trò chuyện 1-1)
  const otherParticipant = conversation.conversation_participants
    .find(cp => cp.user.id !== loggedInUserId)?.user || null

  return (
    <>
      <Head title={`${t('conversation.messages', {}, 'Tin nhắn')} - ${conversationName}`} />

      <div className="h-[calc(100vh-6rem)] flex flex-col">
        <ConversationHeader
          conversation={conversation}
          loggedInUserId={loggedInUserId}
          otherParticipant={otherParticipant}
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messageGroups.map((group) => (
            <MessageGroupComponent
              key={group.date}
              group={group}
              loggedInUserId={loggedInUserId}
              loggedInUser={loggedInUser}
              showMultiUserUI={conversation.conversation_participants.length > 2}
            />
          ))}

          {pagination.hasMore && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={loadMoreMessages} size="sm">
                {t('conversation.load_more', {}, 'Tải thêm tin nhắn')}
              </Button>
            </div>
          )}

          {/* Phần tử để cuộn đến cuối danh sách tin nhắn */}
          <div ref={messagesEndRef} />
        </div>

        <MessageInput conversationId={conversation.id} />
      </div>
    </>
  )
}

ShowConversation.layout = (page: React.ReactNode) => <AppLayout title={useTranslation().t('conversation.messages', {}, 'Tin nhắn')}>{page}</AppLayout>
