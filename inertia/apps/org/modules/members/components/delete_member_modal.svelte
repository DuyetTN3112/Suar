<script lang="ts">
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogDescription from '@/apps/org/shared/ui/dialog_description.svelte'
  import DialogFooter from '@/apps/org/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import { getMemberDisplayName } from '../member_display'
  import type { OrganizationMemberIdentity } from '../types'

  interface Props {
    open: boolean
    onClose: () => void
    user: OrganizationMemberIdentity | null
    isDeleting: boolean
    onConfirm: () => void
  }

  let { open = $bindable(false), onClose, user, isDeleting, onConfirm }: Props = $props()

  const { t } = useTranslation()
</script>

<Dialog bind:open onOpenChange={onClose}>
  <DialogContent class="sm:max-w-106.25">
    <DialogHeader>
      <DialogTitle>{t('common.confirm', {}, 'Confirm')}</DialogTitle>
      <DialogDescription>
        {#if user}
          {t('user.confirm_remove', { name: getMemberDisplayName(user) }, `Are you sure you want to remove ${getMemberDisplayName(user)} from the organization?`)}
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
