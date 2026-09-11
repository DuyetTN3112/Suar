<script lang="ts">
  import ConfirmDialogHost from '@/apps/user/shared/components/confirm_dialog_host.svelte'
  import { Toaster } from 'svelte-sonner'

  import { useTheme } from '@/apps/user/shared/stores/theme.svelte'

  const { theme: currentThemeStore } = useTheme()
  const resolvedTheme = $derived($currentThemeStore === 'dark' ? 'dark' : 'light')
</script>

<Toaster
  theme={resolvedTheme}
  position="bottom-right"
  style="max-width: calc(100vw - 2rem);"
  closeButton
  richColors
  duration={4000}
/>

<ConfirmDialogHost />
