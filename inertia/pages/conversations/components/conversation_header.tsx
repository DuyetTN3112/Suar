import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Phone, Video, MoreVertical } from 'lucide-react'
import { Conversation } from './types'
import { getAvatarInitials } from '../utils/message_utils'
import useTranslation from '@/hooks/use_translation'

interface ConversationHeaderProps {
  conversation: Conversation | null
  otherParticipant?: any
  loggedInUserId?: string
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation,
  otherParticipant,
  loggedInUserId
}) => {
  const { t } = useTranslation()

  if (!conversation) return null

  return (
    <div className="p-4 border-b flex items-center justify-between bg-card">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback>
            {otherParticipant?.username?.[0]?.toUpperCase() || otherParticipant?.email?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold">
            {otherParticipant?.username || otherParticipant?.email || t('conversation.title_default', {}, 'Cuộc trò chuyện')}
          </h2>
          {otherParticipant?.description ? (
            <p className="text-sm text-muted-foreground">{otherParticipant.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {conversation.conversation_participants.length} {t('conversation.participants', {}, 'người tham gia')}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" title={t('conversation.call', {}, 'Gọi điện')}>
          <Phone className="h-5 w-5" />
        </Button>
        <Button size="icon" variant="ghost" title={t('conversation.video_call', {}, 'Gọi video')}>
          <Video className="h-5 w-5" />
        </Button>
        <Button size="icon" variant="ghost" title={t('common.more', {}, 'Thêm')}>
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
