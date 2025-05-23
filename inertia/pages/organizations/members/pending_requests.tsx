import React from 'react'
import { Head, router } from '@inertiajs/react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { UserCheck, UserX, ArrowLeft } from 'lucide-react'
import AppLayout from '@/layouts/app_layout'
import { toast } from 'sonner'

// Định nghĩa các kiểu dữ liệu
interface PendingRequest {
  user_id: number
  full_name: string
  email: string
  invited_by: number | null
  inviter_name: string | null
  created_at: string
}

interface Organization {
  id: number
  name: string
  description: string | null
  logo: string | null
  website: string | null
}

interface PendingRequestsProps {
  organization: Organization
  pendingRequests: PendingRequest[]
}

// Component chính cho trang yêu cầu tham gia tổ chức đang chờ duyệt
const PendingRequests = ({ organization, pendingRequests }: PendingRequestsProps) => {
  // Xử lý duyệt/từ chối yêu cầu
  const handleProcessRequest = (userId: number, action: 'approve' | 'reject') => {
    router.post(`/organizations/${organization.id}/members/process-request/${userId}`, {
      action,
    }, {
      onSuccess: () => {
        toast.success(`Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu thành công`)
      },
      onError: () => {
        toast.error(`Có lỗi xảy ra khi ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu`)
      },
    })
  }

  // Format thời gian
  const formatDateTime = (dateString: string) => {
    try {
      // Chuyển đổi đơn giản
      const date = new Date(dateString)
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }

  return (
    <AppLayout title={`Yêu cầu chờ duyệt - ${organization.name}`}>
      <Head title={`Yêu cầu chờ duyệt - ${organization.name}`} />

      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Yêu cầu tham gia tổ chức chờ duyệt</h1>
          
          <Button variant="outline" onClick={() => router.get(`/organizations/${organization.id}/members`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại quản lý thành viên
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Yêu cầu tham gia tổ chức {organization.name}</CardTitle>
            <CardDescription>
              Duyệt hoặc từ chối các yêu cầu tham gia tổ chức đang chờ xử lý
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">Không có yêu cầu tham gia tổ chức nào đang chờ duyệt</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Được mời bởi</TableHead>
                    <TableHead>Thời gian yêu cầu</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.user_id}>
                      <TableCell className="font-medium">{request.full_name}</TableCell>
                      <TableCell>{request.email}</TableCell>
                      <TableCell>
                        {request.invited_by ? (
                          request.inviter_name
                        ) : (
                          <Badge variant="outline">Tự yêu cầu</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(request.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleProcessRequest(request.user_id, 'reject')}
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Từ chối
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleProcessRequest(request.user_id, 'approve')}
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Duyệt
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

export default PendingRequests 