
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import useTranslation from '@/hooks/use_translation'
import type { User } from '../types'
import { getUserDisplayName } from '../utils/user_utils'

type DeleteUserModalProps = {
  open: boolean
  onClose: () => void
  user: User | null
  isDeleting: boolean
  onConfirm: () => void
}

export default function DeleteUserModal({
  open,
  onClose,
  user,
  isDeleting,
  onConfirm
}: DeleteUserModalProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('common.confirm', {}, "Xác nhận xóa")}</DialogTitle>
          <DialogDescription>
            {user && t('user.confirm_remove', { name: getUserDisplayName(user) }, `Bạn có chắc chắn muốn xóa ${getUserDisplayName(user)} khỏi tổ chức không?`)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            {t('common.cancel', {}, "Hủy")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? t('common.processing', {}, 'Đang xử lý...') : t('common.confirm', {}, 'Xác nhận xóa')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
