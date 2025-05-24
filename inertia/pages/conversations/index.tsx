import React from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import useTranslation from '@/hooks/use_translation'
import { ConversationsProps } from './types'
import { useConversation } from './hooks/use_conversation'
import ConversationList from './components/conversation_list'
import ConversationDetail from './components/conversation_detail'
import EmptyConversation from './components/empty_conversation'
import MessageInputForm from './components/message_input_form'
import CreateConversationDialog from './components/create_conversation_dialog'
import RecallMessageDialog from './components/recall_message_dialog'

// CSS cho thanh cuộn tùy chỉnh
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(155, 155, 155, 0.5);
    border-radius: 20px;
    border: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(155, 155, 155, 0.7);
  }

  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
  }

  /* Fix cho input search */
  input[type="search"]::placeholder,
  input[type="text"]::placeholder {
    opacity: 1;
  }
`;

export default function Conversations({ conversations }: ConversationsProps) {
  const { t } = useTranslation()
  const loggedInUserId = (window as any).auth?.user?.id || ''
  const hasConversations = conversations?.data && conversations.data.length > 0

  const {
    selectedId,
    setSelectedId,
    selectedConversation,
    messages,
    isLoading,
    hasMore,
    newMessage,
    setNewMessage,
    recallDialogOpen,
    setRecallDialogOpen,
    loadConversation,
    loadMoreMessages,
    sendMessage,
    handleRecallMessage,
    handleRecallForEveryone,
    handleRecallForSelf,
    messagesEndRef
  } = useConversation()

  return (
    <>
      <Head title={t('conversations.title', {}, 'Hội thoại')}>
        <style>{scrollbarStyles}</style>
      </Head>
      <div className="container py-6">
        <div className="flex justify-between mb-6 items-center">
          <h1 className="text-3xl font-bold">{t('conversations.title', {}, 'Hội thoại')}</h1>
          <CreateConversationDialog
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t('conversation.new_conversation', {}, 'Cuộc trò chuyện mới')}
              </Button>
            }
          />
        </div>

        <div className="flex gap-6 h-[calc(100vh-12rem)]">
          {/* Danh sách cuộc trò chuyện */}
          <div className="w-1/3 border rounded-lg flex flex-col">
            <ConversationList
              conversations={conversations?.data || []}
              selectedId={selectedId}
              onSelectConversation={(conversation) => {
                setSelectedId(conversation.id)
                loadConversation(conversation.id)
              }}
              loggedInUserId={loggedInUserId}
            />
          </div>

          {/* Phần nội dung cuộc trò chuyện */}
          <div className="flex-1 flex flex-col">
            {selectedId && selectedConversation ? (
              <>
                <ConversationDetail
                  conversation={selectedConversation}
                  messages={messages}
                  loggedInUserId={loggedInUserId}
                  isLoading={isLoading}
                  hasMore={hasMore}
                  onLoadMore={loadMoreMessages}
                  onRecallMessage={handleRecallMessage}
                />

                <MessageInputForm
                  message={newMessage}
                  setMessage={setNewMessage}
                  onSendMessage={sendMessage}
                  isLoading={isLoading}
                />
              </>
            ) : (
              <EmptyConversation />
            )}
          </div>
        </div>
      </div>

      {/* Dialog xác nhận thu hồi tin nhắn */}
      <RecallMessageDialog
        open={recallDialogOpen}
        onClose={() => setRecallDialogOpen(false)}
        onRecallForEveryone={handleRecallForEveryone}
        onRecallForSelf={handleRecallForSelf}
      />
    </>
  )
}

// Không sử dụng useTranslation trong layout function
Conversations.layout = (page: React.ReactNode) => <AppLayout title="Tin nhắn">{page}</AppLayout>
