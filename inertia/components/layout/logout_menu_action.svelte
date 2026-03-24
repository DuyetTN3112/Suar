<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { LogOut } from 'lucide-svelte'
  import ConfirmDialog from '@/components/confirm_dialog.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { cn } from '$lib/utils-svelte'

  type Props = {
    class?: string
    withIcon?: boolean
  }

  const { class: className, withIcon = false }: Props = $props()
  const { t } = useTranslation()

  let logoutDialogOpen = $state(false)
  let isLoggingOut = $state(false)

  function handleOpenConfirm(e: Event) {
    e.preventDefault()
    logoutDialogOpen = true
  }

  function confirmLogout() {
    isLoggingOut = true

    router.post('/logout', {}, {
      onSuccess: () => {
        window.location.href = '/login'
      },
      onError: (errors) => {
        console.error('[LogoutMenuAction] Logout error:', errors)
      },
      onFinish: () => {
        isLoggingOut = false
        logoutDialogOpen = false
      },
    })
  }
</script>

<button
  type="button"
  class={cn('flex w-full items-center text-left', className)}
  onclick={handleOpenConfirm}
>
  {#if withIcon}
    <LogOut class="mr-2 h-4 w-4" />
  {/if}
  {t('auth.logout', {}, 'Đăng xuất')}
</button>

<ConfirmDialog
  bind:open={logoutDialogOpen}
  title={t('auth.logout', {}, 'Đăng xuất')}
  desc={t('auth.confirm_logout', {}, 'Bạn có chắc muốn đăng xuất?')}
  cancelBtnText={t('common.cancel', {}, 'Hủy')}
  confirmText={t('auth.logout', {}, 'Đăng xuất')}
  handleConfirm={confirmLogout}
  isLoading={isLoggingOut}
  destructive={true}
/>
