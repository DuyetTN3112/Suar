import React, { useState } from 'react'
import { router } from '@inertiajs/react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import { Conversation } from '../types'
import { getAvatarInitials, formatDate } from '../utils/conversation_utils'
import useTranslation from '@/hooks/use_translation'

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelectConversation: (conversation: Conversation) => void
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelectConversation
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const { t, locale } = useTranslation()
  const loggedInUserId = (window as any).auth?.user?.id || ''

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.get('/conversations', { search: searchQuery }, { preserveState: true })
  }

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-15rem)]">
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <form onSubmit={handleSearch}>
          <Input
            type="search"
            placeholder={t('conversations.search', {}, 'Tìm kiếm cuộc trò chuyện...')}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {t('conversation.no_conversations', {}, 'Chưa có cuộc trò chuyện nào')}
          </div>
        ) : (
          <div>
            {conversations.map((conversation) => {
              // Xác định loại cuộc trò chuyện
              const participants = conversation.participants || []
              const isDirectMessage = participants.length === 2
              let displayName = conversation.title || ''
              let displayAvatar = ''

              // Nếu là cuộc trò chuyện 1-1, lấy thông tin người còn lại
              if (isDirectMessage && !conversation.title) {
                const otherParticipant = participants.find(
                  p => p.id !== loggedInUserId
                )

                if (otherParticipant) {
                  displayName = otherParticipant.username || otherParticipant.email || t('conversation.unknown_user', {}, 'Người dùng không xác định')
                }
              }

              // Nếu là nhóm không có tiêu đề, tạo tiêu đề từ danh sách thành viên
              if (!isDirectMessage && !conversation.title) {
                const otherParticipants = participants
                  .filter(p => p.id !== loggedInUserId)

                const names = otherParticipants
                  .slice(0, 2)
                  .map(p => p.username || p.email)
                  .filter(Boolean)
                  .join(", ")

                const remainingCount = otherParticipants.length - 2
                displayName = remainingCount > 0
                  ? `${names} và ${remainingCount} người khác`
                  : names || t('conversation.group_chat', {}, 'Trò chuyện nhóm')
              }

              return (
                <div
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  className={`p-4 hover:bg-muted/50 transition-colors flex items-center gap-3 cursor-pointer ${
                    selectedId === conversation.id ? 'bg-muted/50' : ''
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={displayAvatar} alt={displayName} />
                    <AvatarFallback>
                      {getAvatarInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">{displayName}</h3>
                      <span className="text-xs text-muted-foreground">
                        {conversation.updated_at && formatDate(conversation.updated_at, locale)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-muted-foreground truncate">
                        {!isDirectMessage && participants.length > 2
                          ? t('conversation.participant_count', { count: participants.length }, `${participants.length} người tham gia`)
                          : ''}
                      </p>
                      {conversation.$extras && conversation.$extras.unreadCount > 0 && (
                        <Badge variant="destructive" className="rounded-full">
                          {conversation.$extras.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ConversationList
