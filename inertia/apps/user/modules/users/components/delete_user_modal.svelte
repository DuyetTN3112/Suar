<script lang="ts">
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/user/shared/ui/dialog_content.svelte'
  import DialogDescription from '@/apps/user/shared/ui/dialog_description.svelte'
  import DialogFooter from '@/apps/user/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/user/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/user/shared/ui/dialog_title.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import type { UserDirectoryRecord } from '../types'
  import { getUserDisplayName } from '../utils/user_utils'

  interface Props {
    open: boolean
    onClose: () => void
    user: UserDirectoryRecord | null
    isDeleting: boolean
    onConfirm: () => void
  }

  export let open = false
  export let onClose: Props['onClose']
  export let user: Props['user']
  export let isDeleting: Props['isDeleting']
  export let onConfirm: Props['onConfirm']

  const { t } = useTranslation()
</script>

<Dialog bind:open onOpenChange={onClose}>
  <DialogContent class="sm:max-w-106.25">
    <DialogHeader>
      <DialogTitle>{t('common.confirm', {}, 'Confirm')}</DialogTitle>
      <DialogDescription>
        {#if user}
          {t('user.confirm_remove', { name: getUserDisplayName(user) }, `Are you sure you want to remove ${getUserDisplayName(user)} from the organization?`)}
        {/if}
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button
        variant="outline"
        onclick={onClose}
        disabled={isDeleting}
      >
        {t('common.cancel', {}, 'Cancel')}
      </Button>
      <Button
        variant="destructive"
        onclick={onConfirm}
        disabled={isDeleting}
      >
        {isDeleting ? t('common.processing', {}, 'Processing...') : t('common.confirm', {}, 'Confirm')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
