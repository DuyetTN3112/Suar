import React from 'react'
import { Head, Link } from '@inertiajs/react'
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

type User = {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  role: {
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    window.location.href = `/users?search=${search}`
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
                <TableHead>ID</TableHead>
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
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.full_name || `${user.first_name} ${user.last_name}`}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role?.name}</TableCell>
                  <TableCell>{user.status?.name}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/users/${user.id}/edit`}>
                      <Button variant="outline" size="sm" className="mr-2">
                        Sửa
                      </Button>
                    </Link>
                    <Link href={`/users/${user.id}`} method="delete" as="button">
                      <Button variant="destructive" size="sm">
                        Xóa
                      </Button>
                    </Link>
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
      </div>
    </>
  )
}

Users.layout = (page: React.ReactNode) => <AppLayout title="Người dùng">{page}</AppLayout> 