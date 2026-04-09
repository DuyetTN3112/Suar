<script lang="ts">
  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Table from '@/components/ui/table.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import { CircleCheckBig, CircleX, UserCheck } from 'lucide-svelte'
  import { formatRequestDateTime } from '../members_types'

  interface PendingRequest {
    user_id: string
    username: string | null
    email: string
    invited_by: string | null
    inviter_name: string | null
    created_at: string
  }

  interface Props {
    open: boolean
    organizationName: string
    pendingRequests: PendingRequest[]
    onProcessRequest: (userId: string, action: 'approve' | 'reject') => void
    onOpenChange: (open: boolean) => void
  }

  const {
    open,
    organizationName,
    pendingRequests,
    onProcessRequest,
    onOpenChange,
  }: Props = $props()
</script>

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent class="max-w-4xl">
    <DialogHeader>
      <DialogTitle class="flex items-center">
        <UserCheck class="h-5 w-5 mr-2 text-destructive" />
        Phê duyệt yêu cầu tham gia tổ chức
      </DialogTitle>
      <DialogDescription>
        Duyệt hoặc từ chối các yêu cầu tham gia tổ chức {organizationName}
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
              <TableCell>{formatRequestDateTime(request.created_at)}</TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => { onProcessRequest(request.user_id, 'reject') }}
                  >
                    <CircleX class="w-4 h-4 mr-2" />
                    Từ chối
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    class="bg-green-600 hover:bg-green-700"
                    onclick={() => { onProcessRequest(request.user_id, 'approve') }}
                  >
                    <CircleCheckBig class="w-4 h-4 mr-2" />
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
      <Button variant="outline" onclick={() => { onOpenChange(false) }}>Đóng</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
