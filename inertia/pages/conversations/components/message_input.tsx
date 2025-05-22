import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'
import { router } from '@inertiajs/react'

interface MessageInputProps {
  onSendMessage?: (message: string) => void
  conversationId?: string
  isLoading?: boolean
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  conversationId,
  isLoading = false
}) => {
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    
    if (onSendMessage) {
      onSendMessage(message)
    } else if (conversationId) {
      router.post(`/conversations/${conversationId}/messages`, {
        content: message
      }, {
        preserveScroll: true,
        onSuccess: () => {
          setMessage('')
        }
      })
    }
    
    setMessage('')
  }

  return (
    <div className="p-4 border-t">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Nhập tin nhắn của bạn..." 
            className="flex-1"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            disabled={!message.trim() || isLoading} 
            size="icon"
            className="h-10 w-10 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
} 