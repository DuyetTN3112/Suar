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
import { Input } from '@/components/ui/input'
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

type AddUserModalProps = {
  open: boolean
  onClose: () => void
  allSystemUsers: User[]
  selectedUserIds: number[]
  searchUserTerm: string
  setSearchUserTerm: (value: string) => void
  isLoadingSystemUsers: boolean
  isAddingUsers: boolean
  currentPage: number
  totalPages: number
  onSearch: (e: React.FormEvent) => void
  onToggleUserSelection: (userId: number) => void
  onAddUsers: () => void
  onChangePage: (page: number) => void
}

export default function AddUserModal({
  open,
  onClose,
  allSystemUsers,
  selectedUserIds,
  searchUserTerm,
  setSearchUserTerm,
  isLoadingSystemUsers,
  isAddingUsers,
  currentPage,
  totalPages,
  onSearch,
  onToggleUserSelection,
  onAddUsers,
  onChangePage
}: AddUserModalProps) {
  const { t } = useTranslation()
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{t('user.add_users_to_org', {}, "Thêm người dùng vào tổ chức")}</DialogTitle>
          <DialogDescription>
            {t('user.add_users_description', {}, "Chọn người dùng từ danh sách để thêm vào tổ chức hiện tại")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <form onSubmit={onSearch} className="flex items-center gap-2 mb-4">
            <Input
              placeholder={t('user.search_users', {}, "Tìm kiếm người dùng...")}
              value={searchUserTerm}
              onChange={(e) => setSearchUserTerm(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline">
              {t('common.search', {}, "Tìm kiếm")}
            </Button>
          </form>
          
          <div className="border rounded-md overflow-hidden">
            {isLoadingSystemUsers ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : allSystemUsers.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">{t('user.no_users_found', {}, "Không tìm thấy người dùng nào")}</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        {t('common.select', {}, "Chọn")}
                      </TableHead>
                      <TableHead>{t('user.name', {}, "Tên")}</TableHead>
                      <TableHead>{t('user.email', {}, "Email")}</TableHead>
                      <TableHead>{t('user.role', {}, "Vai trò")}</TableHead>
                      <TableHead>{t('user.status', {}, "Trạng thái")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allSystemUsers.map(user => (
                      <TableRow key={user.id} className={selectedUserIds.includes(user.id) ? "bg-blue-50" : ""}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => onToggleUserSelection(user.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </TableCell>
                        <TableCell>{getUserDisplayName(user)}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role?.name}</TableCell>
                        <TableCell>{t(`user.status_${user.status?.name.toLowerCase()}`, {}, user.status?.name)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChangePage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  {t('common.previous', {}, "Trước")}
                </Button>
                <span className="text-sm">
                  {t('common.page_of', { current: currentPage, total: totalPages }, `Trang ${currentPage} / ${totalPages}`)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChangePage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t('common.next', {}, "Sau")}
                </Button>
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {t('user.selected_users', { count: selectedUserIds.length }, `Đã chọn ${selectedUserIds.length} người dùng`)}
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isAddingUsers}
          >
            {t('common.cancel', {}, "Hủy")}
          </Button>
          <Button 
            onClick={onAddUsers} 
            disabled={selectedUserIds.length === 0 || isAddingUsers}
          >
            {isAddingUsers ? t('common.processing', {}, 'Đang xử lý...') : t('user.add_to_organization', {}, 'Thêm vào tổ chức')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 