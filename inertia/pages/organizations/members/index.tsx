import React, { useState, useEffect } from 'react'
import { Head, router, useForm } from '@inertiajs/react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu'
import { Badge } from '@/components/ui/badge'
import { Plus, UserPlus, MoreVertical, Send, UserCheck, Clock, CheckCircle, XCircle, Mail, Trash2 } from 'lucide-react'
import AppLayout from '@/layouts/app_layout'
import { toast } from 'sonner'

// Định nghĩa các kiểu dữ liệu
interface OrganizationMember {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  username: string
  role_id: number
  role_name: string
}

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

interface Role {
  id: number
  name: string
  description: string | null
}

interface MembersIndexProps {
  organization: Organization
  members?: OrganizationMember[]
  roles: Role[]
  userRole: number
  pendingRequests?: PendingRequest[]
}

// Form thêm thành viên
const AddMemberForm = ({ organization, roles, onSuccess }: { organization: Organization, roles: Role[], onSuccess?: () => void }) => {
  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    roleId: '3', // Mặc định là user thường
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(`/organizations/${organization.id}/members/add`, {
      onSuccess: () => {
        reset()
        toast.success('Đã thêm thành viên thành công')
        if (onSuccess) onSuccess()
      },
      onError: (errors) => {
        toast.error('Có lỗi xảy ra khi thêm thành viên')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Email người dùng cần thêm"
          value={data.email}
          onChange={(e) => setData('email', e.target.value)}
          required
        />
        {errors.email && <div className="text-red-500 text-sm">{errors.email}</div>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="roleId">Vai trò</Label>
        <Select
          value={data.roleId}
          onValueChange={(value) => setData('roleId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn vai trò" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id.toString()}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.roleId && <div className="text-red-500 text-sm">{errors.roleId}</div>}
      </div>

      <Button type="submit" disabled={processing} className="w-full">
        Thêm thành viên
      </Button>
    </form>
  )
}

// Form mời người dùng
const InviteUserForm = ({ organization, roles, onSuccess }: { organization: Organization, roles: Role[], onSuccess?: () => void }) => {
  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    roleId: '3', // Mặc định là user thường
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(`/organizations/${organization.id}/members/invite`, {
      onSuccess: () => {
        reset()
        toast.success('Đã gửi lời mời thành công')
        if (onSuccess) onSuccess()
      },
      onError: (errors) => {
        toast.error('Có lỗi xảy ra khi gửi lời mời')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Email người dùng cần mời"
          value={data.email}
          onChange={(e) => setData('email', e.target.value)}
          required
        />
        {errors.email && <div className="text-red-500 text-sm">{errors.email}</div>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="roleId">Vai trò</Label>
        <Select
          value={data.roleId}
          onValueChange={(value) => setData('roleId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn vai trò" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id.toString()}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.roleId && <div className="text-red-500 text-sm">{errors.roleId}</div>}
      </div>

      <Button type="submit" disabled={processing} className="w-full">
        Gửi lời mời
      </Button>
    </form>
  )
}

// Component chính cho trang quản lý thành viên
const MembersIndex = ({ organization, members = [], roles, userRole, pendingRequests = [] }: MembersIndexProps) => {
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showPendingRequestsDialog, setShowPendingRequestsDialog] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(pendingRequests.length)
  
  // Cập nhật số lượng yêu cầu chờ duyệt khi prop thay đổi
  useEffect(() => {
    setPendingRequestsCount(pendingRequests.length)
  }, [pendingRequests])
  
  // Kiểm tra quyền (chỉ superadmin mới có thể phê duyệt thành viên)
  const canManageRequests = userRole === 1 || userRole === 2
  const isSuperAdmin = userRole === 1

  // Gọi lại trang khi có thay đổi về thành viên hoặc yêu cầu
  const refreshPage = () => {
    router.reload({
      only: ['members', 'pendingRequests'],
    })
  }
  
  // Xử lý duyệt/từ chối yêu cầu
  const handleProcessRequest = (userId: number, action: 'approve' | 'reject') => {
    router.post(`/organizations/${organization.id}/members/process-request/${userId}`, {
      action,
    }, {
      onSuccess: () => {
        toast.success(`Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu thành công`)
        refreshPage()
      },
      onError: () => {
        toast.error(`Có lỗi xảy ra khi ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu`)
      },
    })
  }
  
  // Xử lý cập nhật vai trò
  const handleUpdateRole = (memberId: number, roleId: string) => {
    router.post(`/organizations/${organization.id}/members/update-role/${memberId}`, {
      roleId,
    }, {
      onSuccess: () => {
        toast.success('Đã cập nhật vai trò thành công')
        refreshPage()
      },
      onError: () => {
        toast.error('Có lỗi xảy ra khi cập nhật vai trò')
      },
    })
  }
  
  // Xử lý xóa thành viên
  const handleRemoveMember = (memberId: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi tổ chức?')) {
      router.delete(`/organizations/${organization.id}/members/${memberId}`, {
        onSuccess: () => {
          toast.success('Đã xóa thành viên thành công')
          refreshPage()
        },
        onError: () => {
          toast.error('Có lỗi xảy ra khi xóa thành viên')
        },
      })
    }
  }

  // Format thời gian
  const formatDateTime = (dateString: string) => {
    try {
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
    <AppLayout title={`Quản lý thành viên - ${organization.name}`}>
      <Head title={`Quản lý thành viên - ${organization.name}`} />

      <div className="container py-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Quản lý thành viên tổ chức</h1>
          <div className="flex items-center gap-2">
            {/* Nút phê duyệt thành viên chỉ dành cho superadmin */}
            {isSuperAdmin && pendingRequestsCount > 0 && (
              <Button 
                variant="destructive"
                onClick={() => setShowPendingRequestsDialog(true)}
                className="font-medium"
              >
                <UserCheck className="h-5 w-5 mr-2" />
                Phê duyệt thành viên
                <Badge className="ml-2 bg-white text-red-600 hover:bg-white">
                  {pendingRequestsCount}
                </Badge>
              </Button>
            )}
            
            <Button onClick={() => setShowInviteDialog(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Mời người dùng
            </Button>
            
            <Button onClick={() => setShowAddMemberDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm thành viên
            </Button>
          </div>
        </div>
        
        {/* Hiển thị danh sách thành viên */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Danh sách thành viên</CardTitle>
            <CardDescription>
              Tổ chức hiện có {members.length} thành viên
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>{member.username}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Select
                        defaultValue={member.role_id.toString()}
                        onValueChange={(value) => handleUpdateRole(member.id, value)}
                        disabled={userRole !== 1} // Chỉ superadmin mới có thể thay đổi vai trò
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder={member.role_name} />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem 
                              key={role.id} 
                              value={role.id.toString()}
                              disabled={role.id === 1 && userRole !== 1} // Chỉ superadmin mới có thể đặt vai trò superadmin
                            >
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={userRole !== 1 || member.id === userRole} // Chỉ superadmin mới có thể xóa và không thể tự xóa mình
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Xóa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog thêm thành viên */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm thành viên mới</DialogTitle>
            <DialogDescription>
              Thêm thành viên vào tổ chức {organization.name}
            </DialogDescription>
          </DialogHeader>
          <AddMemberForm
            organization={organization}
            roles={roles}
            onSuccess={() => {
              setShowAddMemberDialog(false)
              refreshPage()
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Dialog mời người dùng */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mời người dùng</DialogTitle>
            <DialogDescription>
              Gửi lời mời tham gia tổ chức {organization.name}
            </DialogDescription>
          </DialogHeader>
          <InviteUserForm
            organization={organization}
            roles={roles}
            onSuccess={() => {
              setShowInviteDialog(false)
              refreshPage()
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Modal hiển thị yêu cầu đang chờ duyệt - chỉ hiển thị cho superadmin */}
      {isSuperAdmin && (
        <Dialog open={showPendingRequestsDialog} onOpenChange={setShowPendingRequestsDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <UserCheck className="h-5 w-5 mr-2 text-destructive" />
                Phê duyệt yêu cầu tham gia tổ chức
              </DialogTitle>
              <DialogDescription>
                Duyệt hoặc từ chối các yêu cầu tham gia tổ chức {organization.name}
              </DialogDescription>
            </DialogHeader>
            
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
                            <XCircle className="w-4 h-4 mr-2" />
                            Từ chối
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleProcessRequest(request.user_id, 'approve')}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Phê duyệt
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPendingRequestsDialog(false)}>Đóng</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  )
}

export default MembersIndex 