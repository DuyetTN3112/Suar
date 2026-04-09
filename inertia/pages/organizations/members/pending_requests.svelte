<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Table from '@/components/ui/table.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import { UserCheck, UserX, ArrowLeft } from 'lucide-svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'

  // Định nghĩa các kiểu dữ liệu
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

  interface Props {
    organization: Organization
    pendingRequests: PendingRequest[]
  }

  const { organization, pendingRequests }: Props = $props()

  // Xử lý duyệt/từ chối yêu cầu
  function handleProcessRequest(userId: string, action: 'approve' | 'reject') {
    router.post(`/organizations/${organization.id}/members/process-request/${userId}`, {
      action,
    }, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        notificationStore.success(`Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu thành công`)
      },
      onError: () => {
        notificationStore.error(`Có lỗi xảy ra khi ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu`)
      },
    })
  }

  // Format thời gian
  function formatDateTime(dateString: string) {
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
    } catch (_error) {
      return dateString
    }
  }
</script>

<svelte:head>
  <title>Yêu cầu chờ duyệt - {organization.name}</title>
</svelte:head>

<AppLayout title={`Yêu cầu chờ duyệt - ${organization.name}`}>
  <div class="container mx-auto py-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Yêu cầu tham gia tổ chức chờ duyệt</h1>

      <Button variant="outline" onclick={() => { router.get(`/organizations/${organization.id}/members`) }}>
        <ArrowLeft class="w-4 h-4 mr-2" />
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
                        onclick={() => { handleProcessRequest(request.user_id, 'reject') }}
                      >
                        <UserX class="w-4 h-4 mr-2" />
                        Từ chối
                      </Button>
                      <Button
                        size="sm"
                        onclick={() => { handleProcessRequest(request.user_id, 'approve') }}
                      >
                        <UserCheck class="w-4 h-4 mr-2" />
                        Duyệt
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        {/if}
      </CardContent>
    </Card>
  </div>
</AppLayout>
