import React from 'react'
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
import { User } from '../types'
import { usePendingApproval } from '../hooks/use_pending_approval'

type PendingApprovalTableProps = {
  users: {
    data: User[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
  filters: {
    search?: string
    status_id?: number
  }
}

export default function PendingApprovalTable({ users, filters }: PendingApprovalTableProps) {
  const { isSubmitting, getUserDisplayName, approveUser } = usePendingApproval(users)

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Ngày đăng ký</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Không có người dùng nào cần phê duyệt
                </TableCell>
              </TableRow>
            ) : (
              users.data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{getUserDisplayName(user)}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.created_at 
                      ? new Date(user.created_at).toLocaleDateString('vi-VN')
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={() => approveUser(user)}
                      disabled={isSubmitting[user.id]}
                    >
                      {isSubmitting[user.id] ? 'Đang xử lý...' : 'Phê duyệt'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {users.meta.last_page > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={users.meta.current_page}
            totalPages={users.meta.last_page}
            baseUrl="/users/pending-approval"
            queryParams={filters}
          />
        </div>
      )}
    </>
  )
} 