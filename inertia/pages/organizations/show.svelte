<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import AvatarImage from '@/components/ui/avatar_image.svelte'
  import Button from '@/components/ui/button.svelte'
  import Table from '@/components/ui/table.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import { ArrowLeft, Building, Mail, MapPin, Phone, Globe, Calendar } from 'lucide-svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
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
    username: string
    email: string
    role_id: number
    role_name: string
  }

  interface Props {
    organization: Organization
    members: Member[]
    userRole: number
  }

  const { organization, members, userRole }: Props = $props()

  // Check if user has admin permissions (role_id 1 = admin, 2 = manager)
  const isAdmin = $derived(userRole === 1 || userRole === 2)
  // Kiểm tra nếu người dùng là superadmin của tổ chức
  const isSuperAdmin = $derived(userRole === 1)
</script>

<svelte:head>
  <title>{organization.name}</title>
</svelte:head>

<AppLayout title="Chi tiết tổ chức">
  <div class="container py-6">
    <div class="mb-6">
      <Button variant="ghost" class="pl-0">
        <Link href="/organizations">
          <ArrowLeft class="mr-2 h-4 w-4" /> Quay lại danh sách
        </Link>
      </Button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-1">
        <Card>
          <CardHeader>
            <div class="flex justify-center mb-4">
              {#if organization.logo_url}
                <Avatar class="h-24 w-24">
                  <AvatarImage src={organization.logo_url} alt={organization.name} />
                  <AvatarFallback>{organization.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
              {:else}
                <div class="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                  <Building class="h-12 w-12 text-muted-foreground" />
                </div>
              {/if}
            </div>
            <CardTitle class="text-center text-2xl">{organization.name}</CardTitle>
            <CardDescription class="text-center">
              {organization.description || 'Chưa có mô tả'}
            </CardDescription>
          </CardHeader>

          <CardContent class="space-y-4">
            {#if organization.address}
              <div class="flex items-center">
                <MapPin class="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{organization.address}</span>
              </div>
            {/if}
            {#if organization.email}
              <div class="flex items-center">
                <Mail class="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{organization.email}</span>
              </div>
            {/if}
            {#if organization.phone}
              <div class="flex items-center">
                <Phone class="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{organization.phone}</span>
              </div>
            {/if}
            {#if organization.website}
              <div class="flex items-center">
                <Globe class="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{organization.website}</span>
              </div>
            {/if}
            <div class="flex items-center">
              <Calendar class="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Ngày tạo: {formatDate(organization.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="lg:col-span-2">
        <Tabs value="members" class="w-full">
          <TabsList class="w-full">
            <TabsTrigger value="members" class="flex-1">
              Thành viên ({members.length})
            </TabsTrigger>
            <TabsTrigger value="projects" class="flex-1">
              Dự án
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <div class="flex justify-between items-center">
                  <CardTitle>Danh sách thành viên</CardTitle>
                  {#if isAdmin}
                    <Button size="sm">
                      <Link href="/users/create">
                        Thêm thành viên
                      </Link>
                    </Button>
                  {/if}
                </div>
              </CardHeader>
              <CardContent>
                {#if members.length === 0}
                  <div class="text-center py-6 text-muted-foreground">
                    Tổ chức chưa có thành viên nào
                  </div>
                {:else}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Vai trò</TableHead>
                        {#if isSuperAdmin}
                          <TableHead class="w-[100px]">Thao tác</TableHead>
                        {/if}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {#each members as member (member.id)}
                        <TableRow>
                          <TableCell>
                            <div class="font-medium">{member.username || member.email}</div>
                            <div class="text-sm text-muted-foreground">@{member.username}</div>
                          </TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>{member.role_name}</TableCell>
                          {#if isSuperAdmin}
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                class="h-8 w-8 p-0"
                              >
                                <Link href={`/organizations/users/${member.id}/edit-permissions`}>
                                  <span class="sr-only">Chỉnh sửa quyền</span>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    class="h-4 w-4"
                                  >
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </Link>
                              </Button>
                            </TableCell>
                          {/if}
                        </TableRow>
                      {/each}
                    </TableBody>
                  </Table>
                {/if}
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
                <div class="text-center py-6 text-muted-foreground">
                  Tính năng đang được phát triển
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </div>
</AppLayout>
