<script lang="ts">
  import Button from '@/components/ui/button.svelte'
  import Pagination from '@/components/ui/pagination.svelte'
  import Table from '@/components/ui/table.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableRow from '@/components/ui/table_row.svelte'

  import { createPendingApproval } from '../hooks/use_pending_approval.svelte'
  import type { User } from '../types'

  interface Props {
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
      status?: string
    }
  }

  const { users, filters }: Props = $props()
  const { isSubmitting, getUserDisplayName, approveUser } = createPendingApproval(() => users)
</script>

<div class="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Tên</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Ngày đăng ký</TableHead>
        <TableHead class="text-right">Thao tác</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#if users.data.length === 0}
        <TableRow>
          <TableCell colspan={4} class="text-center py-8">
            Không có người dùng nào cần phê duyệt
          </TableCell>
        </TableRow>
      {:else}
        {#each users.data as user (user.id)}
          <TableRow>
            <TableCell>{getUserDisplayName(user)}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString('vi-VN')
                : 'N/A'}
            </TableCell>
            <TableCell class="text-right">
              <Button
                onclick={() => { approveUser(user); }}
                disabled={$isSubmitting[user.id]}
              >
                {$isSubmitting[user.id] ? 'Đang xử lý...' : 'Phê duyệt'}
              </Button>
            </TableCell>
          </TableRow>
        {/each}
      {/if}
    </TableBody>
  </Table>
</div>

{#if users.meta.last_page > 1}
  <div class="mt-4">
    <Pagination
      currentPage={users.meta.current_page}
      totalPages={users.meta.last_page}
      baseUrl="/users/pending-approval"
      queryParams={filters}
    />
  </div>
{/if}
