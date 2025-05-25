import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import useTranslation from '@/hooks/use_translation'
import type { RecallDialogProps } from '../types'

export const RecallMessageDialog: React.FC<RecallDialogProps> = ({
  open,
  onClose,
  onRecallForEveryone,
  onRecallForSelf
}) => {
  const { t } = useTranslation()
  const [recallType, setRecallType] = useState<'everyone' | 'self'>('everyone')
  const [isRecalling, setIsRecalling] = useState(false)

  // Hàm xử lý thu hồi dựa trên lựa chọn của người dùng
  const handleRecall = async () => {
    setIsRecalling(true)
    try {
      if (recallType === 'everyone') {
        await onRecallForEveryone();
      } else {
        await onRecallForSelf();
      }
      // Thông báo thành công
      toast.success(t('conversation.recall_success', {}, 'Thu hồi tin nhắn thành công'), {
        description: recallType === 'everyone'
          ? t('conversation.recalled_for_everyone', {}, 'Tin nhắn đã được thu hồi với tất cả người dùng')
          : t('conversation.recalled_for_self', {}, 'Tin nhắn đã được thu hồi chỉ với bạn'),
      })
    } catch (error) {
      console.error('Lỗi khi thu hồi tin nhắn:', error)
      // Thông báo lỗi
      toast.error(t('conversation.recall_error_title', {}, 'Lỗi thu hồi tin nhắn'), {
        description: t('conversation.recall_error', {}, 'Không thể thu hồi tin nhắn. Vui lòng thử lại.'),
      })
    } finally {
      setIsRecalling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('conversation.recall_message', {}, 'Thu hồi tin nhắn')}</DialogTitle>
          <DialogDescription>
            {t('conversation.recall_message_description', {}, 'Bạn muốn thu hồi tin nhắn này ở phía ai?')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="everyone"
                name="recallType"
                className="w-4 h-4"
                checked={recallType === 'everyone'}
                onChange={() => setRecallType('everyone')}
              />
              <label htmlFor="everyone" className="text-sm font-medium">
                {t('conversation.recall_for_everyone', {}, 'Thu hồi với mọi người')}
              </label>
            </div>
            <div className="pl-6 text-sm text-muted-foreground">
              {t('conversation.recall_for_everyone_desc', {}, 'Tin nhắn này sẽ bị thu hồi với mọi người trong đoạn chat.')}
            </div>

            <div className="flex items-center space-x-2 mt-3">
              <input
                type="radio"
                id="self"
                name="recallType"
                className="w-4 h-4"
                checked={recallType === 'self'}
                onChange={() => setRecallType('self')}
              />
              <label htmlFor="self" className="text-sm font-medium">
                {t('conversation.recall_for_self', {}, 'Thu hồi với bạn')}
              </label>
            </div>
            <div className="pl-6 text-sm text-muted-foreground">
              {t('conversation.recall_for_self_desc', {}, 'Tin nhắn này sẽ bị gỡ khỏi thiết bị của bạn, nhưng vẫn hiển thị với các thành viên khác trong đoạn chat.')}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRecalling}>
            {t('common.cancel', {}, 'Hủy')}
          </Button>
          <Button variant="destructive" onClick={handleRecall} disabled={isRecalling}>
            {isRecalling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('conversation.recalling', {}, 'Đang thu hồi...')}
              </>
            ) : (
              t('conversation.recall', {}, 'Thu hồi')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RecallMessageDialog
