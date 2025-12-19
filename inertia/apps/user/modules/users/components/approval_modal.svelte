<script lang="ts">
  import { LoaderCircle } from 'lucide-svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/user/shared/ui/dialog_content.svelte'
  import DialogDescription from '@/apps/user/shared/ui/dialog_description.svelte'
  import DialogFooter from '@/apps/user/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/user/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/user/shared/ui/dialog_title.svelte'
  import Table from '@/apps/user/shared/ui/table.svelte'
  import TableBody from '@/apps/user/shared/ui/table_body.svelte'
  import TableCell from '@/apps/user/shared/ui/table_cell.svelte'
  import TableHead from '@/apps/user/shared/ui/table_head.svelte'
  import TableHeader from '@/apps/user/shared/ui/table_header.svelte'
  import TableRow from '@/apps/user/shared/ui/table_row.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import type { UserDirectoryRecord } from '../types'
  import { getUserDisplayName } from '../utils/user_utils'

  interface Props {
    open: boolean
    onClose: () => void
    pendingUsers: UserDirectoryRecord[]
    isLoadingPendingUsers: boolean
    isApprovingUser: Record<string, boolean>
    onApproveUser: (user: UserDirectoryRecord) => void
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
      <DialogTitle>{t('user.approve_users', {}, 'Approve Users')}</DialogTitle>
      <DialogDescription>
        {t('user.pending_approval_list', {}, 'List of users pending approval')}
      </DialogDescription>
    </DialogHeader>

    <div class="py-4">
      {#if isLoadingPendingUsers}
        <div class="flex justify-center py-8">
          <LoaderCircle class="h-8 w-8 animate-spin text-primary" />
        </div>
      {:else if pendingUsers.length === 0}
        <div class="text-center py-4">
          <p class="text-muted-foreground">{t('user.no_pending_users', {}, 'No users pending approval')}</p>
        </div>
      {:else}
        <div class="flex justify-end mb-4">
          <Button onclick={onApproveAll}>{t('user.approve_all', {}, 'Approve All')}</Button>
        </div>

        <div class="overflow-y-auto max-h-[400px] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('user.name', {}, 'Name')}</TableHead>
                <TableHead>{t('user.email', {}, 'Email')}</TableHead>
                <TableHead class="text-right">{t('common.actions', {}, 'Actions')}</TableHead>
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
                      {isApprovingUser[user.id] ? t('common.processing', {}, 'Processing...') : t('user.approve', {}, 'Approve')}
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
        {t('common.close', {}, 'Close')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
