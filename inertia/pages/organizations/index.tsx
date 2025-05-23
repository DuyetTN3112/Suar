import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Users, Building, ArrowRight } from 'lucide-react'
import AppLayout from '@/layouts/app_layout'

interface Organization {
  id: number
  name: string
  description: string | null
  address: string | null
  email: string | null
  phone: string | null
  website: string | null
  logo_url: string | null
  role_id: number
  role_name: string
  created_at: string
  updated_at: string
}

interface Props {
  organizations: Organization[]
  currentOrganizationId: number | null
}

export default function OrganizationsList({ organizations, currentOrganizationId }: Props) {
  return (
    <>
      <Head title="Danh sách tổ chức" />

      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tổ chức của bạn</h1>
            <p className="text-muted-foreground mt-1">
              Quản lý và tham gia các tổ chức trong hệ thống
            </p>
          </div>
          <Button asChild>
            <Link href="/organizations/create">
              <Plus className="mr-2 h-4 w-4" /> Tạo tổ chức mới
            </Link>
          </Button>
        </div>

        {organizations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Building className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Bạn chưa tham gia tổ chức nào</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              Bạn cần tham gia hoặc tạo một tổ chức mới để sử dụng đầy đủ các tính năng của hệ thống.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/organizations/create">
                <Plus className="mr-2 h-4 w-4" /> Tạo tổ chức mới
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <Card key={org.id} className={`overflow-hidden transition-all duration-200 ${
                currentOrganizationId === org.id ? 'ring-2 ring-primary' : ''
              }`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">
                      {org.name}
                    </CardTitle>
                    {currentOrganizationId === org.id && (
                      <Badge variant="outline" className="bg-primary/10 text-primary">Hiện tại</Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {org.description || 'Chưa có mô tả'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground mb-2">
                    <Users className="h-4 w-4 mr-2" />
                    <span>Vai trò: {org.role_name}</span>
                  </div>
                  {org.website && (
                    <div className="text-sm text-muted-foreground truncate">
                      {org.website}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <Button asChild variant="outline">
                    <Link href={`/organizations/${org.id}`}>
                      Xem chi tiết
                    </Link>
                  </Button>
                  {currentOrganizationId !== org.id && (
                    <Button asChild variant="secondary">
                      <Link href={`/organizations/switch/${org.id}`}>
                        Chọn <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

OrganizationsList.layout = (page: React.ReactNode) => <AppLayout title="Danh sách tổ chức">{page}</AppLayout> 