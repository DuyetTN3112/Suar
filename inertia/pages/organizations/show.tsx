import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Building, Mail, MapPin, Phone, Globe, Calendar } from 'lucide-react'
import AppLayout from '@/layouts/app_layout'
import { formatDate } from '@/lib/utils'

interface Organization {
  id: number
  name: string
  description: string | null
  address: string | null
  email: string | null
  phone: string | null
  website: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

interface Member {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  username: string
  role_id: number
  role_name: string
}

interface Props {
  organization: Organization
  members: Member[]
  userRole: number
}

export default function OrganizationDetail({ organization, members, userRole }: Props) {
  // Check if user has admin permissions (role_id 1 = admin, 2 = manager)
  const isAdmin = userRole === 1 || userRole === 2

  return (
    <>
      <Head title={organization.name} />

      <div className="container py-6">
        <div className="mb-6">
          <Button variant="ghost" asChild className="pl-0">
            <Link href="/organizations">
              <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex justify-center mb-4">
                  {organization.logo_url ? (
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={organization.logo_url} alt={organization.name} />
                      <AvatarFallback>{organization.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                      <Building className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardTitle className="text-center text-2xl">{organization.name}</CardTitle>
                <CardDescription className="text-center">
                  {organization.description || 'Chưa có mô tả'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {organization.address && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{organization.address}</span>
                  </div>
                )}
                {organization.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{organization.email}</span>
                  </div>
                )}
                {organization.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{organization.phone}</span>
                  </div>
                )}
                {organization.website && (
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{organization.website}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Ngày tạo: {formatDate(organization.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs defaultValue="members" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="members" className="flex-1">
                  Thành viên ({members.length})
                </TabsTrigger>
                <TabsTrigger value="projects" className="flex-1">
                  Dự án
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="members">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Danh sách thành viên</CardTitle>
                      {isAdmin && (
                        <Button asChild size="sm">
                          <Link href="/users/create">
                            Thêm thành viên
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {members.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        Tổ chức chưa có thành viên nào
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tên</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Vai trò</TableHead>
                            {isAdmin && <TableHead className="w-[100px]">Thao tác</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell>
                                <div className="font-medium">{member.full_name}</div>
                                <div className="text-sm text-muted-foreground">@{member.username}</div>
                              </TableCell>
                              <TableCell>{member.email}</TableCell>
                              <TableCell>{member.role_name}</TableCell>
                              {isAdmin && (
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="h-8 w-8 p-0"
                                  >
                                    <Link href={`/organizations/users/${member.id}/edit-permissions`}>
                                      <span className="sr-only">Chỉnh sửa quyền</span>
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4"
                                      >
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                    </Link>
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="projects">
                <Card>
                  <CardHeader>
                    <CardTitle>Dự án</CardTitle>
                    <CardDescription>
                      Danh sách các dự án của tổ chức
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6 text-muted-foreground">
                      Tính năng đang được phát triển
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  )
}

OrganizationDetail.layout = (page: React.ReactNode) => <AppLayout title="Chi tiết tổ chức">{page}</AppLayout> 