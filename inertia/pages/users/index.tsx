import React from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
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
import { Pagination } from '@/components/ui/pagination'
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
import { toast } from 'sonner'

type User = {
  id: number
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string
  username?: string
  role: {
    id: number
    name: string
  }
  organization_role?: {
    id: number
    name: string
  }
  status: {
    id: number
    name: string
  }
}

type UsersProps = {
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
    role_id?: number
    status_id?: number
  }
  metadata: {
    roles: { id: number, name: string }[]
    statuses: { id: number, name: string }[]
  }
}

export default function Users({ users, filters, metadata }: UsersProps) {
  const [search, setSearch] = React.useState(filters.search || '')
  const { auth } = usePage().props as any
  
  // State cho dialog chỉnh sửa quyền
  const [editModalOpen, setEditModalOpen] = React.useState(false)
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null)
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    window.location.href = `/users?search=${search}`
  }
  
  // Hàm mở dialog chỉnh sửa quyền
  const openEditPermissionsModal = (user: User) => {
    if (!user || !user.id) {
      toast.error("Không tìm thấy thông tin người dùng")
      return
    }
    
    setSelectedUserId(user.id)
    setSelectedUser(user)
    // Ưu tiên sử dụng organization_role nếu có
    setSelectedRoleId(user.organization_role?.id ? String(user.organization_role.id) : '')
    setEditModalOpen(true)
    
    console.log('Mở modal chỉnh sửa quyền với thông tin:', {
      userId: user.id,
      currentOrgRoleId: user.organization_role?.id,
      currentOrgRoleName: user.organization_role?.name,
      currentRoleId: user.role?.id,
      currentRoleName: user.role?.name,
      selectedRoleId: user.organization_role?.id ? String(user.organization_role.id) : ''
    })
  }
  
  // Hàm xử lý cập nhật quyền
  const handleUpdatePermissions = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId || !selectedRoleId) {
      toast.error("Vui lòng chọn vai trò")
      return
    }
    
    setIsSubmitting(true)
    
    // Đảm bảo roleId là số nguyên
    const roleIdNumber = parseInt(selectedRoleId, 10);
    
    console.log('Gửi request cập nhật quyền:', {
      userId: selectedUserId,
      roleId: roleIdNumber,
      roleIdType: typeof roleIdNumber,
      isForOrganization: true
    })
    
    // Sử dụng router.put để gửi PUT request
    router.put(
      `/organizations/users/${selectedUserId}/update-permissions`,
      { 
        role_id: roleIdNumber
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        preserveScroll: false,
        preserveState: false,
        onSuccess: (page) => {
          setEditModalOpen(false)
          setIsSubmitting(false)
          toast.success("Đã cập nhật quyền người dùng trong tổ chức thành công")
          
          // Tải lại toàn bộ trang thay vì chỉ tải lại một phần
          window.location.reload();
        },
        onError: (errors) => {
          setIsSubmitting(false)
          console.error("Lỗi cập nhật quyền:", errors)
          const errorMessage = errors.message || "Không thể cập nhật quyền. Vui lòng thử lại."
          toast.error(errorMessage)
        },
        onFinish: () => {
          setIsSubmitting(false)
        }
      }
    )
  }
  
  // Hàm lấy tên hiển thị của người dùng
  const getUserDisplayName = (user: User): string => {
    if (user.full_name && user.full_name.trim() !== '') {
      return user.full_name;
    }
    
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    
    if (firstName.trim() !== '' || lastName.trim() !== '') {
      return `${firstName} ${lastName}`.trim();
    }
    
    if (user.username && user.username.trim() !== '') {
      return user.username;
    }
    
    // Sử dụng phần đầu của email nếu không có tên
    return user.email.split('@')[0];
  }

  // Reset modal state khi đóng dialog
  const handleCloseModal = () => {
    setEditModalOpen(false)
    // Đảm bảo state được reset khi modal đóng
    setTimeout(() => {
      setSelectedUserId(null)
      setSelectedUser(null)
      setSelectedRoleId('')
    }, 100)
  }

  return (
    <>
      <Head title="Người dùng" />
      <div className="container py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Người dùng</h1>
          <Link href="/users/create">
            <Button>Thêm người dùng</Button>
          </Link>
        </div>
        
        <div className="mt-6">
          <form onSubmit={handleSearch} className="flex items-center gap-4">
            <Input 
              placeholder="Tìm kiếm người dùng..." 
              className="max-w-sm" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" type="submit">Tìm kiếm</Button>
          </form>
        </div>
        
        <div className="mt-6 rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{getUserDisplayName(user)}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.organization_role?.name || user.role?.name}</TableCell>
                  <TableCell>{user.status?.name}</TableCell>
                  <TableCell className="text-right">
                    {user.id !== auth.user.id && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mr-2"
                          onClick={() => openEditPermissionsModal(user)}
                        >
                          Sửa quyền
                        </Button>
                        <form
                          action={`/organizations/users/${user.id}/remove`}
                          method="post"
                          className="inline"
                          onSubmit={(e) => {
                            e.preventDefault()
                            if (confirm('Bạn có chắc chắn muốn xóa người dùng này khỏi tổ chức không?')) {
                              const form = e.target as HTMLFormElement
                              const csrfToken = document.querySelector<HTMLInputElement>('meta[name="csrf-token"]')?.value
                              
                              const methodInput = document.createElement('input')
                              methodInput.type = 'hidden'
                              methodInput.name = '_method'
                              methodInput.value = 'DELETE'
                              form.appendChild(methodInput)
                              
                              if (csrfToken) {
                                const csrfInput = document.createElement('input')
                                csrfInput.type = 'hidden'
                                csrfInput.name = '_csrf'
                                csrfInput.value = csrfToken
                                form.appendChild(csrfInput)
                              }
                              
                              form.submit()
                            }
                          }}
                        >
                          <Button variant="destructive" size="sm" type="submit">
                            Xóa khỏi tổ chức
                          </Button>
                        </form>
                      </>
                    )}
                    {user.id === auth.user.id && (
                      <Link href={`/users/${user.id}/edit`}>
                        <Button variant="outline" size="sm" className="mr-2">
                          Tài khoản của tôi
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
        
        {/* Modal chỉnh sửa quyền */}
        <Dialog open={editModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa quyền hạn</DialogTitle>
              <DialogDescription>
                {selectedUser && `Thay đổi quyền hạn cho ${getUserDisplayName(selectedUser)}`}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdatePermissions}>
              <div className="grid gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="role" className="font-medium">
                    Vai trò trong tổ chức
                  </label>
                  <Select value={selectedRoleId} onValueChange={setSelectedRoleId} required>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Chọn vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Superadmin</SelectItem>
                      <SelectItem value="2">Admin</SelectItem>
                      <SelectItem value="3">User</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Vai trò quyết định các quyền mà người dùng có trong tổ chức.
                  </p>
                  {process.env.NODE_ENV === 'development' && selectedUser && (
                    <div className="mt-2 text-xs text-gray-500 border border-gray-200 p-2 rounded">
                      <p>UserID: {selectedUser.id}</p>
                      <p>Vai trò trong tổ chức: {selectedUser.organization_role?.name || 'Không có'} (ID: {selectedUser.organization_role?.id || 'N/A'})</p>
                      <p>Vai trò hệ thống: {selectedUser.role?.name} (ID: {selectedUser.role?.id})</p>
                      <p>Vai trò đã chọn: {selectedRoleId} (Number: {parseInt(selectedRoleId, 10)})</p>
                      <p>Role Type: {typeof parseInt(selectedRoleId, 10)}</p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang xử lý...' : 'Lưu thay đổi'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}

Users.layout = (page: React.ReactNode) => <AppLayout title="Người dùng">{page}</AppLayout> 