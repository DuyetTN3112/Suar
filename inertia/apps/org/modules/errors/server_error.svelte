<script lang="ts">
  import Button from '@/apps/org/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    error?: { message?: string; name?: string; stack?: string }
  }

  const { error }: Props = $props()
  const { t } = useTranslation()

  const errorMessage = $derived(
    error?.message ?? t('common.error_pages.server_error.default_message', {}, 'An unknown server error occurred')
  )
  const errorName = $derived(error?.name ?? 'Unknown')
</script>

<svelte:head>
  <title>{t('common.error_pages.server_error.title', {}, 'Server error')}</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
  <div class="mx-auto flex max-w-lg flex-col items-center space-y-6 text-center px-4">
    <h1 class="text-6xl font-bold text-foreground">500</h1>
    <h2 class="text-2xl font-semibold text-foreground">
      {t('common.error_pages.server_error.heading', {}, 'Server error')}
    </h2>

    <div
      class="w-full rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-left"
    >
      <p class="text-destructive">{errorMessage}</p>
      <p class="mt-2 text-sm text-destructive">
        <strong>{t('common.error_pages.server_error.type_label', {}, 'Type')}:</strong> {errorName}
      </p>

      {#if error?.stack}
        <pre
          class="mt-4 max-h-[200px] overflow-auto rounded bg-black/10 p-3 text-xs dark:bg-white/10"
        >{error.stack}</pre>
      {/if}
    </div>

    <Button onclick={() => { window.location.reload(); }}>
      {t('common.error_pages.server_error.reload', {}, 'Reload page')}
    </Button>
  </div>
</div>
