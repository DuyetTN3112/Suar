import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import useTranslation from '@/hooks/use_translation'
import type { User } from '../types'
import { getUserDisplayName } from '../utils/user_utils'

type EditRoleModalProps = {
  open: boolean
  onClose: () => void
  selectedUser: User | null
  selectedRoleId: string
  setSelectedRoleId: (value: string) => void
  isSubmitting: boolean
  onSubmit: (e: React.FormEvent) => void
}

export default function EditRoleModal({
  open,
  onClose,
  selectedUser,
  selectedRoleId,
  setSelectedRoleId,
  isSubmitting,
  onSubmit
}: EditRoleModalProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('user.edit_permissions', {}, "Chỉnh sửa quyền hạn trong tổ chức")}</DialogTitle>
          <DialogDescription>
            {selectedUser && t('user.change_role_for', { name: getUserDisplayName(selectedUser) }, `Thay đổi vai trò của ${getUserDisplayName(selectedUser)} trong tổ chức hiện tại`)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="role" className="font-medium">
                {t('user.role_in_org', {}, "Vai trò trong tổ chức")}
              </label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId} required>
                <SelectTrigger id="role">
                  <SelectValue placeholder={t('user.select_role', {}, "Chọn vai trò")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('organization.role_owner', {}, "Superadmin")}</SelectItem>
                  <SelectItem value="2">{t('organization.role_admin', {}, "Admin")}</SelectItem>
                  <SelectItem value="3">{t('organization.role_member', {}, "User")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                {t('user.role_description', {}, "Vai trò quyết định các quyền mà người dùng có trong tổ chức.")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel', {}, "Hủy")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.processing', {}, 'Đang xử lý...') : t('common.save', {}, 'Lưu thay đổi')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
