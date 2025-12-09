<script lang="ts">
  import ConfirmDialogHost from '@/apps/org/shared/components/confirm_dialog_host.svelte'
  import { Toaster } from 'svelte-sonner'

  import { useTheme } from '@/apps/org/shared/stores/theme.svelte'

  const { theme: currentThemeStore } = useTheme()
  const resolvedTheme = $derived($currentThemeStore === 'dark' ? 'dark' : 'light')
</script>

<Toaster
  theme={resolvedTheme}
  position="bottom-right"
  closeButton
  richColors
  duration={4000}
/>

<ConfirmDialogHost />
