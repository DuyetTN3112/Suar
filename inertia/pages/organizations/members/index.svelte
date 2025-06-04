<script lang="ts">
  import { router, useForm } from '@inertiajs/svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'
  import Input from '@/components/ui/input.svelte'
  import Button from '@/components/ui/button.svelte'
  import Label from '@/components/ui/label.svelte'
  import Table from '@/components/ui/table.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import { Plus, UserCheck, CheckCircle, XCircle, Mail, Trash2 } from 'lucide-svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'

  // Định nghĩa các kiểu dữ liệu
  interface OrganizationMember {
    id: string
    username: string
    email: string
    org_role: string
    role_name: string
  }

  interface PendingRequest {
    user_id: string
    username: string
    email: string
    invited_by: string | null
    inviter_name: string | null
    created_at: string
  }

  interface Organization {
    id: string
    name: string
    description: string | null
    logo: string | null
    website: string | null
  }

  interface Role {
    value: string
    label: string
    description: string | null
  }

  interface Props {
    organization: Organization
    members?: OrganizationMember[]
    roles: Role[]
    userRole: string
    pendingRequests?: PendingRequest[]
  }

  const { organization, members = [], roles, userRole, pendingRequests = [] }: Props = $props()

  let showAddMemberDialog = $state(false)
  let showInviteDialog = $state(false)
  let showPendingRequestsDialog = $state(false)
  let pendingRequestsCount = $derived(pendingRequests.length)

  // Kiểm tra quyền (chỉ owner/admin mới có thể phê duyệt thành viên)
  const canManageRequests = $derived(userRole === 'org_owner' || userRole === 'org_admin')
  const isSuperAdmin = $derived(userRole === 'org_owner')

  // Gọi lại trang khi có thay đổi về thành viên hoặc yêu cầu
  function refreshPage() {
    router.reload({
      only: ['members', 'pendingRequests'],
    })
  }

  // Xử lý duyệt/từ chối yêu cầu
  function handleProcessRequest(userId: string, action: 'approve' | 'reject') {
    router.post(`/organizations/${organization.id}/members/process-request/${userId}`, {
      action,
    }, {
      onSuccess: () => {
        notificationStore.success(`Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu thành công`)
        refreshPage()
      },
      onError: () => {
        notificationStore.error(`Có lỗi xảy ra khi ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu`)
      },
    })
  }

  // Xử lý cập nhật vai trò
  function handleUpdateRole(memberId: string, newRole: string) {
    router.post(`/organizations/${organization.id}/members/update-role/${memberId}`, {
      org_role: newRole,
    }, {
      onSuccess: () => {
        notificationStore.success('Đã cập nhật vai trò thành công')
        refreshPage()
      },
      onError: () => {
        notificationStore.error('Có lỗi xảy ra khi cập nhật vai trò')
      },
    })
  }

  // Xử lý xóa thành viên
  function handleRemoveMember(memberId: string) {
    if (confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi tổ chức?')) {
      router.delete(`/organizations/${organization.id}/members/${memberId}`, {
        onSuccess: () => {
          notificationStore.success('Đã xóa thành viên thành công')
          refreshPage()
        },
        onError: () => {
          notificationStore.error('Có lỗi xảy ra khi xóa thành viên')
        },
      })
    }
  }

  // Format thời gian
  function formatDateTime(dateString: string) {
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

  // Effect để cập nhật count khi props thay đổi
  $effect(() => {
    pendingRequestsCount = pendingRequests.length
  })
</script>

<svelte:head>
  <title>Quản lý thành viên - {organization.name}</title>
</svelte:head>

<AppLayout title={`Quản lý thành viên - ${organization.name}`}>
  <div class="container py-4 space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Quản lý thành viên tổ chức</h1>
      <div class="flex items-center gap-2">
        <!-- Nút phê duyệt thành viên chỉ dành cho superadmin -->
        {#if isSuperAdmin && pendingRequestsCount > 0}
          <Button
            variant="destructive"
            onclick={() => { showPendingRequestsDialog = true; }}
            class="font-medium"
          >
            <UserCheck class="h-5 w-5 mr-2" />
            Phê duyệt thành viên
            <Badge class="ml-2 bg-white text-red-600 hover:bg-white">
              {pendingRequestsCount}
            </Badge>
          </Button>
        {/if}

        <Button onclick={() => { showInviteDialog = true; }}>
          <Mail class="h-4 w-4 mr-2" />
          Mời người dùng
        </Button>

        <Button onclick={() => { showAddMemberDialog = true; }}>
          <Plus class="h-4 w-4 mr-2" />
          Thêm thành viên
        </Button>
      </div>
    </div>

    <!-- Hiển thị danh sách thành viên -->
    <Card>
      <CardHeader class="pb-2">
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
              <TableHead class="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each members as member (member.id)}
              <TableRow>
                <TableCell class="font-medium">{member.username || member.email}</TableCell>
                <TableCell>{member.username}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <Select
                    value={member.org_role}
                    onValueChange={(value) => { handleUpdateRole(member.id, value); }}
                    disabled={userRole !== 'org_owner'}
                  >
                    <SelectTrigger class="w-32">
                      <SelectValue placeholder={member.role_name} />
                    </SelectTrigger>
                    <SelectContent>
                      {#each roles as role (role.value)}
                        <SelectItem
                          value={role.value}
                          disabled={role.value === 'org_owner' && userRole !== 'org_owner'}
                        >
                          {role.label}
                        </SelectItem>
                      {/each}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell class="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => { handleRemoveMember(member.id); }}
                    disabled={userRole !== 'org_owner'}
                  >
                    <Trash2 class="h-4 w-4 mr-2" />
                    Xóa
                  </Button>
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>

  <!-- Dialog thêm thành viên -->
  <Dialog bind:open={showAddMemberDialog}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Thêm thành viên mới</DialogTitle>
        <DialogDescription>
          Thêm thành viên vào tổ chức {organization.name}
        </DialogDescription>
      </DialogHeader>
      <AddMemberForm
        {organization}
        {roles}
        onSuccess={() => {
          showAddMemberDialog = false
          refreshPage()
        }}
      />
    </DialogContent>
  </Dialog>

  <!-- Dialog mời người dùng -->
  <Dialog bind:open={showInviteDialog}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Mời người dùng</DialogTitle>
        <DialogDescription>
          Gửi lời mời tham gia tổ chức {organization.name}
        </DialogDescription>
      </DialogHeader>
      <InviteUserForm
        {organization}
        {roles}
        onSuccess={() => {
          showInviteDialog = false
          refreshPage()
        }}
      />
    </DialogContent>
  </Dialog>

  <!-- Modal hiển thị yêu cầu đang chờ duyệt - chỉ hiển thị cho superadmin -->
  {#if isSuperAdmin}
    <Dialog bind:open={showPendingRequestsDialog}>
      <DialogContent class="max-w-4xl">
        <DialogHeader>
          <DialogTitle class="flex items-center">
            <UserCheck class="h-5 w-5 mr-2 text-destructive" />
            Phê duyệt yêu cầu tham gia tổ chức
          </DialogTitle>
          <DialogDescription>
            Duyệt hoặc từ chối các yêu cầu tham gia tổ chức {organization.name}
          </DialogDescription>
        </DialogHeader>

        {#if pendingRequests.length === 0}
          <div class="text-center py-6">
            <p class="text-muted-foreground">Không có yêu cầu tham gia tổ chức nào đang chờ duyệt</p>
          </div>
        {:else}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Được mời bởi</TableHead>
                <TableHead>Thời gian yêu cầu</TableHead>
                <TableHead class="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each pendingRequests as request (request.user_id)}
                <TableRow>
                  <TableCell class="font-medium">{request.username || request.email}</TableCell>
                  <TableCell>{request.email}</TableCell>
                  <TableCell>
                    {#if request.invited_by}
                      {request.inviter_name}
                    {:else}
                      <Badge variant="outline">Tự yêu cầu</Badge>
                    {/if}
                  </TableCell>
                  <TableCell>{formatDateTime(request.created_at)}</TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => { handleProcessRequest(request.user_id, 'reject'); }}
                      >
                        <XCircle class="w-4 h-4 mr-2" />
                        Từ chối
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        class="bg-green-600 hover:bg-green-700"
                        onclick={() => { handleProcessRequest(request.user_id, 'approve'); }}
                      >
                        <CheckCircle class="w-4 h-4 mr-2" />
                        Phê duyệt
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        {/if}

        <DialogFooter>
          <Button variant="outline" onclick={() => { showPendingRequestsDialog = false; }}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  {/if}
</AppLayout>

<!-- Form Components -->
{#snippet AddMemberForm({ organization, roles, onSuccess }: { organization: Organization, roles: Role[], onSuccess?: () => void })}
  {@const form = useForm({
    email: '',
    roleId: 'org_member',
  })}

  <form onsubmit={(e) => {
    e.preventDefault()
    form.post(`/organizations/${organization.id}/members/add`, {
      onSuccess: () => {
        form.reset()
        notificationStore.success('Đã thêm thành viên thành công')
        if (onSuccess) onSuccess()
      },
      onError: () => {
        notificationStore.error('Có lỗi xảy ra khi thêm thành viên')
      },
    })
  }} class="space-y-4">
    <div class="space-y-2">
      <Label for="email">Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="Email người dùng cần thêm"
        bind:value={form.data.email}
        required
      />
      {#if form.errors.email}
        <div class="text-red-500 text-sm">{form.errors.email}</div>
      {/if}
    </div>

    <div class="space-y-2">
      <Label for="roleId">Vai trò</Label>
      <Select
        value={form.data.roleId}
        onValueChange={(value) => { form.data.roleId = value; }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Chọn vai trò" />
        </SelectTrigger>
        <SelectContent>
          {#each roles as role (role.value)}
            <SelectItem value={role.value}>
              {role.label}
            </SelectItem>
          {/each}
        </SelectContent>
      </Select>
      {#if form.errors.roleId}
        <div class="text-red-500 text-sm">{form.errors.roleId}</div>
      {/if}
    </div>

    <Button type="submit" disabled={form.processing} class="w-full">
      Thêm thành viên
    </Button>
  </form>
{/snippet}

{#snippet InviteUserForm({ organization, roles, onSuccess }: { organization: Organization, roles: Role[], onSuccess?: () => void })}
  {@const form = useForm({
    email: '',
    roleId: 'org_member',
  })}

  <form onsubmit={(e) => {
    e.preventDefault()
    form.post(`/organizations/${organization.id}/members/invite`, {
      onSuccess: () => {
        form.reset()
        notificationStore.success('Đã gửi lời mời thành công')
        if (onSuccess) onSuccess()
      },
      onError: () => {
        notificationStore.error('Có lỗi xảy ra khi gửi lời mời')
      },
    })
  }} class="space-y-4">
    <div class="space-y-2">
      <Label for="invite-email">Email</Label>
      <Input
        id="invite-email"
        type="email"
        placeholder="Email người dùng cần mời"
        bind:value={form.data.email}
        required
      />
      {#if form.errors.email}
        <div class="text-red-500 text-sm">{form.errors.email}</div>
      {/if}
    </div>

    <div class="space-y-2">
      <Label for="invite-roleId">Vai trò</Label>
      <Select
        value={form.data.roleId}
        onValueChange={(value) => { form.data.roleId = value; }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Chọn vai trò" />
        </SelectTrigger>
        <SelectContent>
          {#each roles as role (role.value)}
            <SelectItem value={role.value}>
              {role.label}
            </SelectItem>
          {/each}
        </SelectContent>
      </Select>
      {#if form.errors.roleId}
        <div class="text-red-500 text-sm">{form.errors.roleId}</div>
      {/if}
    </div>

    <Button type="submit" disabled={form.processing} class="w-full">
      Gửi lời mời
    </Button>
  </form>
{/snippet}
