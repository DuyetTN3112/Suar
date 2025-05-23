import React from 'react'
import { Head, Link, router } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type OrganizationUser = {
  user_id: number
  organization_id: number
  role_id: number
  user: {
    id: number
    first_name: string | null
    last_name: string | null
    full_name: string | null
    email: string
  }
  role: {
    id: number
    name: string
  }
}

type Organization = {
  id: number
  name: string
  description: string | null
  organization_users: OrganizationUser[]
}

type UserRole = {
  roleName: string
  roleId: number
}

type EditMemberPermissionsProps = {
  organization: Organization
  userId: number
  userRole?: UserRole
}

export default function EditMemberPermissions({ organization, userId, userRole }: EditMemberPermissionsProps) {
  const [roleId, setRoleId] = React.useState<string>('')
  
  // Tìm thành viên cần chỉnh sửa quyền
  const member = organization?.organization_users?.find(ou => ou.user_id === userId)
  
  React.useEffect(() => {
    if (member?.role_id) {
      setRoleId(String(member.role_id))
    }
  }, [member])
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleId) {
      alert('Vui lòng chọn vai trò')
      return
    }
    
    router.post(
      `/organizations/users/${userId}/update-permissions`,
      { role_id: parseInt(roleId) },
      { preserveState: true }
    )
  }
  
  if (!organization || !organization.organization_users) {
    return (
      <>
        <Head title="Lỗi tải dữ liệu" />
        <div className="container py-8">
          <h1 className="text-3xl font-bold">Lỗi tải dữ liệu tổ chức</h1>
          <p className="mt-4">Không thể tải thông tin tổ chức.</p>
          <Link href="/users">
            <Button className="mt-4">Quay lại danh sách</Button>
          </Link>
        </div>
      </>
    )
  }
  
  if (!member) {
    return (
      <>
        <Head title="Không tìm thấy thành viên" />
        <div className="container py-8">
          <h1 className="text-3xl font-bold">Không tìm thấy thành viên</h1>
          <p className="mt-4">Thành viên không tồn tại trong tổ chức này.</p>
          <Link href="/users">
            <Button className="mt-4">Quay lại danh sách</Button>
          </Link>
        </div>
      </>
    )
  }
  
  // Lấy tên hiển thị từ thông tin người dùng
  const getUserDisplayName = (user: any): string => {
    if (user.full_name && user.full_name.trim() !== '') {
      return user.full_name;
    }
    
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    
    if (firstName.trim() !== '' || lastName.trim() !== '') {
      return `${firstName} ${lastName}`.trim();
    }
    
    return user.email.split('@')[0];
  }
  
  return (
    <>
      <Head title="Chỉnh sửa quyền hạn thành viên" />
      <div className="container py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Chỉnh sửa quyền hạn thành viên</h1>
          <Link href="/users">
            <Button variant="outline">Quay lại danh sách</Button>
          </Link>
        </div>
        
        <Card className="mt-6 max-w-xl">
          <CardHeader>
            <CardTitle>
              Thành viên: {getUserDisplayName(member.user)}
            </CardTitle>
            <CardDescription>{member.user.email}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="role" className="font-medium">
                    Vai trò trong tổ chức
                  </label>
                  <Select value={roleId} onValueChange={setRoleId} required>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Chọn vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">Thành viên</SelectItem>
                      <SelectItem value="2">Quản trị viên</SelectItem>
                      <SelectItem value="1">Chủ sở hữu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Link href="/users">
                <Button variant="outline">Hủy</Button>
              </Link>
              <Button type="submit">Lưu thay đổi</Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  )
}

EditMemberPermissions.layout = (page: React.ReactNode) => (
  <AppLayout title="Chỉnh sửa quyền hạn thành viên">{page}</AppLayout>
) 