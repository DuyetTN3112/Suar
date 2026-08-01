<script lang="ts">
  import Button from '@/apps/org/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    requestId?: string | null
  }

  const { requestId = null }: Props = $props()
  const { t } = useTranslation()

  const errorMessage = $derived(
    t(
      'common.error_pages.server_error.default_message',
      {},
      'The service could not complete your request. Please try again.'
    )
  )
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
      {#if requestId}
        <p class="mt-2 break-all text-sm text-muted-foreground">
          <strong>{t('common.error_pages.server_error.reference_label', {}, 'Reference')}:</strong>
          {requestId}
        </p>
      {/if}
    </div>

    <Button onclick={() => { window.location.reload(); }}>
      {t('common.error_pages.server_error.reload', {}, 'Reload page')}
    </Button>
  </div>
</div>
