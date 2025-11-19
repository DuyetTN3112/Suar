<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import { ShieldAlert } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  const { t } = useTranslation()
</script>

<svelte:head>
  <title>{t('common.error_pages.forbidden.title', {}, 'Access denied')}</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
  <div class="mx-auto flex max-w-md flex-col items-center space-y-6 text-center px-4">
    <div
      class="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10"
    >
      <ShieldAlert class="h-10 w-10 text-destructive" />
    </div>

    <h1 class="text-6xl font-bold text-foreground">403</h1>
    <h2 class="text-2xl font-semibold text-foreground">
      {t('common.error_pages.forbidden.heading', {}, 'Access denied')}
    </h2>
    <p class="text-muted-foreground">
      {t('common.error_pages.forbidden.description', {}, 'You do not have access to this page. Contact an administrator if you believe this is an error.')}
    </p>

    <div class="flex gap-3">
      <Button variant="outline" onclick={() => { window.history.back(); }}>
        {t('common.error_pages.forbidden.back', {}, 'Go back')}
      </Button>
      <Button>
        <Link href="/">{t('common.error_pages.forbidden.home', {}, 'Home')}</Link>
      </Button>
    </div>
  </div>
</div>
