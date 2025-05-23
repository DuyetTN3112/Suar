import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CreateConversationDialog from './create_conversation_dialog'
import useTranslation from '@/hooks/use_translation'

export const EmptyConversation: React.FC = () => {
  const { t } = useTranslation()
  
  return (
    <div className="flex-1 flex items-center justify-center">
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">
              {t('conversation.no_messages_selected', {}, 'Chưa có tin nhắn nào được chọn')}
            </h3>
            <p className="text-muted-foreground">
              {t('conversation.select_or_create', {}, 'Chọn một cuộc trò chuyện từ danh sách để bắt đầu hoặc tạo mới')}
            </p>
            <CreateConversationDialog 
              trigger={
                <Button className="mt-4">
                  {t('conversation.create_button', {}, 'Tạo cuộc trò chuyện mới')}
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EmptyConversation 