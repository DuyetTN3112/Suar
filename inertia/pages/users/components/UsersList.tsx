import React from 'react'
import { Link } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import useTranslation from '@/hooks/use_translation'
import { User, UsersProps } from '../types'
import { getUserDisplayName, getUserOrganizationRole } from '../utils/user_utils'

type UsersListProps = {
  users: UsersProps['users']
  filters: UsersProps['filters']
  currentUserId: number
  isSuperAdmin: boolean
  onEditPermissions: (user: User) => void
  onDeleteUser: (user: User) => void
}

export default function UsersList({
  users,
  filters,
  currentUserId,
  isSuperAdmin,
  onEditPermissions,
  onDeleteUser
}: UsersListProps) {
  const { t } = useTranslation()
  
  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('user.name', {}, "Tên")}</TableHead>
              <TableHead>{t('user.email', {}, "Email")}</TableHead>
              <TableHead>{t('user.role', {}, "Vai trò")}</TableHead>
              <TableHead>{t('user.status', {}, "Trạng thái")}</TableHead>
              <TableHead className="text-right">{t('common.actions', {}, "Thao tác")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.data.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{getUserDisplayName(user)}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getUserOrganizationRole(user)}</TableCell>
                <TableCell>{t(`user.status_${user.status?.name.toLowerCase()}`, {}, user.status?.name)}</TableCell>
                <TableCell className="text-right">
                  {/* Chỉ dành cho phát triển */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="hidden">
                      {/* Không hiển thị debug info trong UI */}
                    </div>
                  )}
                  
                  {user.id !== currentUserId && (
                    <>
                      {/* Kiểm tra vai trò superadmin trong tổ chức */}
                      {isSuperAdmin && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mr-2"
                            onClick={() => onEditPermissions(user)}
                          >
                            {t('user.edit_role', {}, "Sửa vai trò")}
                          </Button>
                        </>
                      )}
                      
                      {/* Kiểm tra vai trò superadmin trong tổ chức */}
                      {isSuperAdmin && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => onDeleteUser(user)}
                        >
                          {t('user.remove_from_org', {}, "Xóa khỏi tổ chức")}
                        </Button>
                      )}
                    </>
                  )}
                  {user.id === currentUserId && (
                    <Link href={`/users/${user.id}/edit`}>
                      <Button variant="outline" size="sm" className="mr-2">
                        {t('user.my_account', {}, "Tài khoản của tôi")}
                      </Button>
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {users.meta.last_page > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={users.meta.current_page}
            totalPages={users.meta.last_page}
            baseUrl="/users"
            queryParams={filters}
          />
        </div>
      )}
    </>
  )
} 