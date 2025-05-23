import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import useTranslation from '@/hooks/use_translation'
import { User } from '../types'
import { getUserDisplayName } from '../utils/user_utils'

type ApprovalModalProps = {
  open: boolean
  onClose: () => void
  pendingUsers: User[]
  isLoadingPendingUsers: boolean
  isApprovingUser: Record<number, boolean>
  onApproveUser: (user: User) => void
  onApproveAll: () => void
}

export default function ApprovalModal({
  open,
  onClose,
  pendingUsers,
  isLoadingPendingUsers,
  isApprovingUser,
  onApproveUser,
  onApproveAll
}: ApprovalModalProps) {
  const { t } = useTranslation()
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('user.approve_users', {}, "Phê duyệt người dùng")}</DialogTitle>
          <DialogDescription>
            {t('user.pending_approval_list', {}, "Danh sách người dùng đang chờ phê duyệt")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {isLoadingPendingUsers ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500">{t('user.no_pending_users', {}, "Không có người dùng nào đang chờ phê duyệt")}</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <Button onClick={onApproveAll}>{t('user.approve_all', {}, "Phê duyệt tất cả")}</Button>
              </div>
              
              <div className="overflow-y-auto max-h-[400px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('user.name', {}, "Tên")}</TableHead>
                      <TableHead>{t('user.email', {}, "Email")}</TableHead>
                      <TableHead className="text-right">{t('common.actions', {}, "Thao tác")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>{getUserDisplayName(user)}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => onApproveUser(user)}
                            disabled={isApprovingUser[user.id]}
                          >
                            {isApprovingUser[user.id] ? t('common.processing', {}, 'Đang xử lý...') : t('user.approve', {}, 'Phê duyệt')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
          >
            {t('common.close', {}, "Đóng")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 