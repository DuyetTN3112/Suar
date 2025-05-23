import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2 } from 'lucide-react'
import useTranslation from '@/hooks/use_translation'

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

export const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  isLoading = false
}) => {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const { t } = useTranslation()

  return (
    <div className="p-4 border-t">
      {/* Sử dụng form truyền thống với method POST và action trỏ tới endpoint */}
      <form 
        method="POST" 
        action={`/conversations/${conversationId}/messages`}
        target="hidden-frame" 
        onSubmit={() => {
          if (message.trim()) {
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
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading || sending}
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