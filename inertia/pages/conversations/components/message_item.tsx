import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Message } from './types'
import { getAvatarInitials, formatMessageDate } from '../utils/message_utils'

interface MessageItemProps {
  message: Message
  isOutgoing: boolean
  loggedInUserAvatar?: string
  loggedInUserName?: string
  showSenderInfo: boolean
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOutgoing,
  loggedInUserAvatar,
  loggedInUserName,
  showSenderInfo
}) => {
  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isOutgoing && (
        <div className="flex-shrink-0 mr-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.sender?.avatar || ''} alt={message.sender?.full_name || 'Người dùng'} />
            <AvatarFallback>{message.sender?.full_name ? getAvatarInitials(message.sender.full_name) : 'UN'}</AvatarFallback>
          </Avatar>
        </div>
      )}
      
      <div className="flex flex-col max-w-[70%]">
        {/* Hiển thị tên người gửi cho tin nhắn đến trong cuộc trò chuyện nhóm */}
        {!isOutgoing && showSenderInfo && (
          <span className="text-xs font-medium text-slate-600 mb-1 ml-1">
            {message.sender?.full_name || 'Người dùng'}
          </span>
        )}
        
        <div className={`px-3 py-2 rounded-2xl ${
          isOutgoing 
            ? 'bg-primary text-primary-foreground rounded-br-none' 
            : 'bg-muted text-foreground rounded-bl-none'
        }`}>
          <p className="break-words">{message.message}</p>
          <div className={`text-xs mt-1 text-right ${
            isOutgoing ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}>
            {formatMessageDate(message.timestamp)}
            {isOutgoing && ' • Bạn'}
          </div>
        </div>
      </div>
      
      {isOutgoing && (
        <div className="flex-shrink-0 ml-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={loggedInUserAvatar || ''} alt={loggedInUserName || 'Bạn'} />
            <AvatarFallback>{getAvatarInitials(loggedInUserName || 'Bạn')}</AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  )
}