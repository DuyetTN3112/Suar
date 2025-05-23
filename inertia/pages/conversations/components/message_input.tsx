import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2 } from 'lucide-react'
import useTranslation from '@/hooks/use_translation'
import { toast } from 'sonner'

// Mở rộng kiểu Window để thêm refreshMessages
declare global {
  interface Window {
    refreshMessages?: () => void;
  }
}

interface MessageInputProps {
  conversationId?: string
  isLoading?: boolean
}

// Hằng số cho giới hạn tin nhắn
const MAX_MESSAGE_LENGTH = 50005000;
const SPAM_THRESHOLD = 20; // Số tin nhắn tối đa trong khoảng thời gian
const SPAM_TIME_WINDOW = 10000; // 10 giây tính bằng milliseconds

export const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  isLoading = false
}) => {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [messageCount, setMessageCount] = useState(0)
  const [lastMessageTime, setLastMessageTime] = useState<number>(0)
  const { t } = useTranslation()

  // Kiểm tra spam
  const checkSpam = () => {
    const now = Date.now()
    if (now - lastMessageTime < SPAM_TIME_WINDOW) {
      if (messageCount >= SPAM_THRESHOLD) {
        toast.error(t('conversation.spam_detected', {}, 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng đợi một chút.'))
        return true
      }
      setMessageCount(prev => prev + 1)
    } else {
      setMessageCount(1)
      setLastMessageTime(now)
    }
    return false
  }

  // Kiểm tra ký tự đặc biệt
  const hasSpecialCharacters = (text: string) => {
    // Kiểm tra các ký tự đặc biệt có thể gây ra vấn đề
    const specialChars = /[<>{}[\]\\^~|]/g
    return specialChars.test(text)
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMessage = e.target.value
    
    if (newMessage.length > MAX_MESSAGE_LENGTH) {
      toast.error(t('conversation.message_too_long', {}, 
        `Tin nhắn quá dài. Vui lòng chia thành nhiều tin nhắn ngắn hơn (tối đa ${MAX_MESSAGE_LENGTH} ký tự)`))
      setMessage(newMessage.slice(0, MAX_MESSAGE_LENGTH))
      return
    }

    // Kiểm tra ký tự đặc biệt
    if (hasSpecialCharacters(newMessage)) {
      toast.error(t('conversation.invalid_characters', {}, 'Tin nhắn chứa ký tự không hợp lệ'))
      return
    }

    setMessage(newMessage)
  }

  return (
    <div className="p-4 border-t">
      {/* Sử dụng form truyền thống với method POST và action trỏ tới endpoint */}
      <form 
        method="POST" 
        action={`/conversations/${conversationId}/messages`}
        target="hidden-frame" 
        onSubmit={(e) => {
          e.preventDefault()
          if (message.trim()) {
            // Kiểm tra spam trước khi gửi
            if (checkSpam()) {
              return
            }

            setSending(true)
            // Reset form sau 1 giây để giả lập gửi tin nhắn
            setTimeout(() => {
              setMessage('')
              setSending(false)
              // Tải lại trang sau khi gửi
              window.location.reload()
            }, 1000)
          }
        }}
      >
        {/* Thêm CSRF token field - quan trọng cho Laravel */}
        <input 
          type="hidden" 
          name="_token" 
          value={document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''}
        />
        
        {/* Field tin nhắn */}
        <input type="hidden" name="content" value={message} />
        <input type="hidden" name="message" value={message} />
        
        <div className="flex items-center gap-2">
          <Input 
            name="message_display"
            placeholder={t('conversation.message_placeholder', {}, 'Nhập tin nhắn của bạn...')} 
            className="flex-1"
            value={message}
            onChange={handleMessageChange}
            disabled={isLoading || sending}
            maxLength={MAX_MESSAGE_LENGTH}
          />
          <Button 
            type="submit" 
            disabled={!message.trim() || isLoading || sending} 
            size="icon"
            className="h-10 w-10 rounded-full"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
      
      {/* iframe ẩn để nhận phản hồi từ form submit mà không làm mới trang */}
      <iframe name="hidden-frame" style={{display: 'none'}}></iframe>
    </div>
  )
} 