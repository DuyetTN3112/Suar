import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Message } from './types'
import { getAvatarInitials, formatMessageDate, calculateMessageSize } from '../utils/message_utils'
import useTranslation from '@/hooks/use_translation'
import { Button } from '@/components/ui/button'

interface MessageItemProps {
  message: Message
  isOutgoing: boolean
  loggedInUserAvatar?: string
  loggedInUserName?: string
  showSenderInfo: boolean
}

const MAX_PREVIEW_LENGTH = 200
const MAX_EXPANDED_HEIGHT = 300 // px
const MAX_ZALGO_PREVIEW_LENGTH = 100 // Hiển thị ngắn hơn đối với các tin nhắn có khả năng là Zalgo

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOutgoing,
  loggedInUserAvatar,
  loggedInUserName,
  showSenderInfo
}) => {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  // Kiểm tra xem tin nhắn có khả năng là Zalgo text không
  const isPotentialZalgo = React.useMemo(() => {
    // Phát hiện các ký tự đặc biệt Unicode hoặc các mẫu lặp lại
    const hasCombiningChars = /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F\u02EC\u20DD]{3,}/g.test(message.message)
    const hasRepeatingPattern = /([\u02EC\u20DD\u0300-\u036F])\1{10,}/g.test(message.message)

    // Các tin nhắn có quá nhiều Unicode đặc biệt
    const tooManySpecialChars = Array.from(message.message).filter(ch => ch.codePointAt(0)! > 0xffff).length > 10

    // Phát hiện ký tự Zalgo cụ thể (꙰)
    const hasZalgoChar = /꙰/.test(message.message)

    // Kiểm tra mật độ ký tự đặc biệt
    const specialCharDensity = () => {
      // Chia nhỏ tin nhắn thành các đoạn 50 ký tự
      const chunks = []
      for (let i = 0; i < message.message.length; i += 50) {
        chunks.push(message.message.substring(i, i + 50))
      }

      // Kiểm tra mật độ trong từng đoạn
      return chunks.some(chunk => {
        const specialChars = Array.from(chunk).filter(ch => {
          const code = ch.codePointAt(0)!
          return code > 0x7f
        })
        // Nếu mật độ ký tự đặc biệt > 20% thì coi là đáng ngờ
        return specialChars.length > chunk.length * 0.2
      })
    }

    // Phát hiện mẫu hình mờ nhạt có thể gây hại
    const suspiciousPatterns = /(.)\1{20,}|([^\x00-\x7F]){50,}/g.test(message.message)

    return hasCombiningChars ||
           hasRepeatingPattern ||
           tooManySpecialChars ||
           hasZalgoChar ||
           specialCharDensity() ||
           suspiciousPatterns
  }, [message.message])

  // Sử dụng độ dài nhỏ hơn cho tin nhắn Zalgo
  const previewLength = isPotentialZalgo ? MAX_ZALGO_PREVIEW_LENGTH : MAX_PREVIEW_LENGTH

  const shouldShowExpand = message.message.length > previewLength
  const displayMessage = isExpanded
    ? message.message
    : message.message.slice(0, previewLength) + (shouldShowExpand ? (isPotentialZalgo ? '... (Nội dung đã được cắt giảm)' : '...') : '')

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isOutgoing && (
        <div className="flex-shrink-0 mr-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{message.sender?.username?.[0]?.toUpperCase() || message.sender?.email?.[0]?.toUpperCase() || 'UN'}</AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className="flex flex-col max-w-[70%] min-w-0">
        {!isOutgoing && showSenderInfo && (
          <span className="text-xs font-medium text-slate-600 mb-1 ml-1">
            {message.sender?.username || message.sender?.email || t('conversation.user', {}, 'Người dùng')}
          </span>
        )}

        <div className={`px-3 py-2 rounded-2xl ${
          isOutgoing
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted text-foreground rounded-bl-none'
        }`}>
          <div
            className={`break-words whitespace-pre-wrap ${isPotentialZalgo ? 'zalgo-message' : ''}`}
            style={{
              maxWidth: '100%',
              width: '100%',
              maxHeight: isExpanded ? MAX_EXPANDED_HEIGHT : 'auto',
              overflowY: isExpanded ? 'auto' : 'hidden',
              overflowX: 'hidden',
              textOverflow: 'ellipsis',
              position: 'relative',
              wordBreak: 'break-all',
              overflowWrap: 'break-word',
              wordWrap: 'break-word',
              hyphens: 'auto',
              lineHeight: '1.5',
            }}
          >
            {isPotentialZalgo ? (
                // Hiển thị an toàn cho tin nhắn độc hại
                <div>
                  <div className="bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded mb-2 border-l-2 border-yellow-500">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Tin nhắn này có thể chứa nội dung độc hại
                    </p>
                  </div>

                  {!isExpanded ? (
                    // Khi chưa mở rộng - hiển thị tóm tắt an toàn
                    <div className="relative">
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent to-background/50 pointer-events-none"
                        style={{ zIndex: 2 }}
                      />
                      <p
                        className="text-sm leading-relaxed m-0 user-content text-muted-foreground"
                        style={{
                          overflow: 'hidden',
                          maxHeight: '40px',
                          opacity: 0.7,
                          filter: 'blur(0.3px)',
                        }}
                      >
                        {displayMessage.substring(0, 60)}
                        {displayMessage.length > 60 ? '...' : ''}
                      </p>
                      <div className="text-xs text-muted-foreground mt-1">
                        Nội dung đã bị giới hạn hiển thị vì lý do bảo mật
                      </div>
                    </div>
                  ) : (
                    // Khi đã mở rộng - hiển thị trong iframe hoặc container riêng biệt
                    <div className="relative border border-amber-200 dark:border-amber-900 rounded p-2 bg-amber-50/50 dark:bg-amber-950/10">
                      <p
                        className="text-sm leading-relaxed m-0 user-content"
                        style={{
                          overflow: 'auto',
                          maxHeight: MAX_EXPANDED_HEIGHT,
                          opacity: 0.9,
                          wordBreak: 'break-all',
                          overflowWrap: 'break-word',
                          wordWrap: 'break-word',
                          width: '100%',
                        }}
                      >
                        {displayMessage}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Hiển thị bình thường cho tin nhắn thông thường
                <p
                  className="text-sm leading-relaxed m-0 user-content"
                  style={{
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: isExpanded ? 'unset' : 5, // Giới hạn hiển thị 5 dòng khi chưa mở rộng
                    overflow: 'hidden',
                    wordBreak: 'break-all',
                    overflowWrap: 'break-word',
                    wordWrap: 'break-word',
                  }}
                >
                  {displayMessage}
                </p>
              )}
            {shouldShowExpand && (
              <Button
                variant="link"
                className="text-xs p-0 h-auto mt-1"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded
                  ? t('conversation.show_less', {}, 'Thu gọn')
                  : t('conversation.show_more', {}, 'Xem thêm')}
              </Button>
            )}
          </div>
          <div className={`text-xs mt-1 text-right ${
            isOutgoing ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}>
            {formatMessageDate(message.timestamp)}
            {isOutgoing && ` • ${t('conversation.you', {}, 'Bạn')}`}
            <span className="ml-1">• {calculateMessageSize(message.message)}</span>
          </div>
        </div>
      </div>

      {isOutgoing && (
        <div className="flex-shrink-0 ml-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={loggedInUserAvatar || ''} alt={loggedInUserName || t('conversation.you', {}, 'Bạn')} />
            <AvatarFallback>{getAvatarInitials(loggedInUserName || t('conversation.you', {}, 'Bạn'))}</AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  )
}
