<script lang="ts">
  import { page, Link } from '@inertiajs/svelte'

  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'

  interface AuthUser {
    username?: string
    email?: string
    auth_method?: string | null
  }

  interface PageProps {
    auth?: {
      user?: AuthUser
    }
  }

  const pageProps = $derived(page.props as unknown as PageProps)
  const authUser = $derived(pageProps.auth?.user)
  const { t } = $derived(useTranslation())

  function authMethodLabel(authMethod?: string | null): string {
    switch (authMethod) {
      case undefined:
      case null:
        return 'OAuth'
      case 'google':
        return 'Google'
      case 'github':
        return 'GitHub'
      default:
        return 'OAuth'
    }
  }
</script>

<svelte:head>
  <title>{t('settings.account_title', {}, 'Account settings')}</title>
</svelte:head>

<OrganizationLayout title={t('settings.account_title', {}, 'Account settings')}>
  <div class="container py-8">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">{t('settings.account_title', {}, 'Account settings')}</h1>
    </div>

    <div class="mt-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.login_identity_title', {}, 'Sign-in and identity')}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center gap-2">
            <Badge variant="outline">{authMethodLabel(authUser?.auth_method)}</Badge>
            <span class="text-sm text-muted-foreground">
              {authUser?.email ?? t('settings.no_email', {}, 'No email yet')}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.account_package_title', {}, 'Account package')}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-4 md:grid-cols-3">
            <div class="rounded-lg border p-4">
              <p class="text-sm font-semibold text-muted-foreground">Base</p>
              <p class="mt-2 text-sm">{t('settings.plan_base_description', {}, 'Default plan.')}</p>
            </div>
            <div class="rounded-lg border p-4">
              <p class="text-sm font-semibold text-muted-foreground">Pro</p>
              <p class="mt-2 text-sm">{t('settings.plan_pro_description', {}, 'Higher visibility.')}</p>
            </div>
            <div class="rounded-lg border p-4">
              <p class="text-sm font-semibold text-muted-foreground">Pro Max</p>
              <p class="mt-2 text-sm">{t('settings.plan_pro_max_description', {}, 'Higher priority.')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.related_pages_title', {}, 'Related pages')}</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-wrap gap-3">
          <Link href="/profile">
            <Button variant="outline">{t('settings.profile_link', {}, 'Capability profile')}</Button>
          </Link>
          <Link href="/org/reviews/task-board">
            <Button variant="outline">{t('settings.task_review_board_link', {}, 'Board review task')}</Button>
          </Link>
          <Link href="/my-applications">
            <Button variant="outline">{t('settings.my_applications_link', {}, 'Participation proposals')}</Button>
          </Link>
          <Link href="/marketplace/tasks">
            <Button variant="outline">{t('settings.marketplace_tasks_link', {}, 'Open marketplace')}</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  </div>
</OrganizationLayout>
