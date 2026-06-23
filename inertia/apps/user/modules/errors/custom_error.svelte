<script lang="ts">
  import Button from '@/apps/user/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    title?: string
    message?: string
    stack?: string
  }

  const { title = undefined, message = undefined, stack }: Props = $props()
  const { t } = useTranslation()
  const displayTitle = $derived(title ?? t('common.error_pages.custom_error.title', {}, 'System error'))
  const displayMessage = $derived(message ?? t('common.error_pages.custom_error.default_message', {}, 'An unknown error occurred'))
</script>

<svelte:head>
  <title>{displayTitle}</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
  <div class="mx-auto flex max-w-lg flex-col items-center space-y-6 text-center px-4">
    <div
      class="w-full rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-left"
    >
      <h2 class="text-xl font-bold text-destructive">{displayTitle}</h2>
      <p class="mt-2 text-destructive">{displayMessage}</p>

      {#if stack}
        <pre
          class="mt-4 max-h-[200px] overflow-auto rounded bg-black/10 p-3 text-xs dark:bg-white/10"
        >{stack}</pre>
      {/if}
    </div>

    <Button onclick={() => { window.location.reload(); }}>
      {t('common.error_pages.custom_error.reload', {}, 'Reload page')}
    </Button>
  </div>
</div>
