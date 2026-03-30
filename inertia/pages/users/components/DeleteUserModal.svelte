<script lang="ts">
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { User } from '../types'
  import { getUserDisplayName } from '../utils/user_utils'

  interface Props {
    open: boolean
    onClose: () => void
    user: User | null
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
      <DialogTitle>{t('common.confirm', {}, "Xác nhận xóa")}</DialogTitle>
      <DialogDescription>
        {#if user}
          {t('user.confirm_remove', { name: getUserDisplayName(user) }, `Bạn có chắc chắn muốn xóa ${getUserDisplayName(user)} khỏi tổ chức không?`)}
        {/if}
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button
        variant="outline"
        onclick={onClose}
        disabled={isDeleting}
      >
        {t('common.cancel', {}, "Hủy")}
      </Button>
      <Button
        variant="destructive"
        onclick={onConfirm}
        disabled={isDeleting}
      >
        {isDeleting ? t('common.processing', {}, 'Đang xử lý...') : t('common.confirm', {}, 'Xác nhận xóa')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
