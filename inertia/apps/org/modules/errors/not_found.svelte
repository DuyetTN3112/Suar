<script lang="ts">
  import { Link } from '@inertiajs/svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    message?: string
  }

  const { message = undefined }: Props = $props()
  const { t } = useTranslation()
  const pageMessage = $derived(message ?? t('common.error_pages.not_found.title', {}, 'Page not found'))
</script>

<div class="h-screen flex flex-col items-center justify-center bg-background text-foreground">
  <div class="text-center">
    <h1 class="text-9xl font-extrabold text-foreground">404</h1>
    <h2 class="text-3xl font-bold text-foreground mt-4">{pageMessage}</h2>
    <p class="text-lg text-muted-foreground mt-2">
      {t('common.error_pages.not_found.description', {}, 'The page you are looking for does not exist or has moved.')}
    </p>
    <div class="mt-8">
      <Button>
        <Link href="/">{t('common.error_pages.not_found.home', {}, 'Back to home')}</Link>
      </Button>
    </div>
  </div>
</div>
