<script lang="ts">
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Table from '@/components/ui/table.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { User } from '../types'
  import { getUserDisplayName } from '../utils/user_utils'

  interface Props {
    open: boolean
    onClose: () => void
    pendingUsers: User[]
    isLoadingPendingUsers: boolean
    isApprovingUser: Record<string, boolean>
    onApproveUser: (user: User) => void
    onApproveAll: () => void
  }

  export let open = false
  export let onClose: Props['onClose']
  export let pendingUsers: Props['pendingUsers']
  export let isLoadingPendingUsers: Props['isLoadingPendingUsers']
  export let isApprovingUser: Props['isApprovingUser']
  export let onApproveUser: Props['onApproveUser']
  export let onApproveAll: Props['onApproveAll']

  const { t } = useTranslation()
</script>

<Dialog bind:open onOpenChange={onClose}>
  <DialogContent class="sm:max-w-150">
    <DialogHeader>
      <DialogTitle>{t('user.approve_users', {}, "Phê duyệt người dùng")}</DialogTitle>
      <DialogDescription>
        {t('user.pending_approval_list', {}, "Danh sách người dùng đang chờ phê duyệt")}
      </DialogDescription>
    </DialogHeader>

    <div class="py-4">
      {#if isLoadingPendingUsers}
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      {:else if pendingUsers.length === 0}
        <div class="text-center py-4">
          <p class="text-gray-500">{t('user.no_pending_users', {}, "Không có người dùng nào đang chờ phê duyệt")}</p>
        </div>
      {:else}
        <div class="flex justify-end mb-4">
          <Button onclick={onApproveAll}>{t('user.approve_all', {}, "Phê duyệt tất cả")}</Button>
        </div>

        <div class="overflow-y-auto max-h-[400px] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('user.name', {}, "Tên")}</TableHead>
                <TableHead>{t('user.email', {}, "Email")}</TableHead>
                <TableHead class="text-right">{t('common.actions', {}, "Thao tác")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each pendingUsers as user (user.id)}
                <TableRow>
                  <TableCell>{getUserDisplayName(user)}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell class="text-right">
                    <Button
                      size="sm"
                      onclick={() => { onApproveUser(user) }}
                      disabled={isApprovingUser[user.id]}
                    >
                      {isApprovingUser[user.id] ? t('common.processing', {}, 'Đang xử lý...') : t('user.approve', {}, 'Phê duyệt')}
                    </Button>
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      {/if}
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onclick={onClose}
      >
        {t('common.close', {}, "Đóng")}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
