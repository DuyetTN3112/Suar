import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2 } from 'lucide-react'
import useTranslation from '@/hooks/use_translation'

interface MessageInputFormProps {
  message: string
  setMessage: (message: string) => void
  onSendMessage: () => void
  isLoading: boolean
}

export const MessageInputForm: React.FC<MessageInputFormProps> = ({
  message,
  setMessage,
  onSendMessage,
  isLoading
}) => {
  const { t } = useTranslation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isLoading) {
      onSendMessage()
    }
  }

  return (
    <div className="p-4 border-t">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2">
          <Input 
            placeholder={t('conversation.message_placeholder', {}, 'Nhập tin nhắn của bạn...')}
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
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default MessageInputForm 