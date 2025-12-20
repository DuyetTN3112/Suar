<script lang="ts">
  import { page, Link, router } from '@inertiajs/svelte'

  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import { FRONTEND_ROUTES } from '@/apps/user/shared/constants'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'

  interface ProfileUserUrl {
    url: string
  }

  interface AuthUser {
    id?: string
    username?: string
    email?: string
    auth_method?: string | null
    user_profile?: { bio?: string | null } | null
    user_urls?: ProfileUserUrl[] | null
  }

  interface PageProps {
    auth?: {
      user?: AuthUser
    }
  }

  const pageProps = $derived(page.props as unknown as PageProps)
  const authUser = $derived(pageProps.auth?.user)
  const { t } = $derived(useTranslation())
  const username = $derived(authUser?.username ?? t('settings.default_user_name', {}, 'User'))
  const email = $derived(authUser?.email ?? t('settings.no_email', {}, 'No email yet'))

  let formInitialized = $state(false)
  let bio = $state('')
  let urls = $state<string[]>([])

  $effect(() => {
    if (formInitialized || !authUser) {
      return
    }

    bio = authUser.user_profile?.bio ?? ''
    urls = (authUser.user_urls ?? []).map((item) => item.url)
    formInitialized = true
  })

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

  function handleProfileSubmit(e: Event) {
    e.preventDefault()
    router.post(
      FRONTEND_ROUTES.SETTINGS_PROFILE,
      { bio, urls },
      {
        preserveState: true,
        preserveScroll: true,
      }
    )
  }

  function handleBioInput(event: Event) {
    bio = (event.currentTarget as HTMLTextAreaElement).value
  }

  function addUrl() {
    urls = [...urls, '']
  }

  function removeUrl(index: number) {
    urls = urls.filter((_, i) => i !== index)
  }

  function updateUrl(index: number, value: string) {
    const updatedUrls = [...urls]
    updatedUrls[index] = value
    urls = updatedUrls
  }

  function handleUrlInput(index: number) {
    return (event: Event) => {
      updateUrl(index, (event.currentTarget as HTMLInputElement).value)
    }
  }
</script>

<svelte:head>
  <title>{t('settings.account_personal_title', {}, 'Account & personal information')}</title>
</svelte:head>

<AppLayout title={t('settings.account_personal_title', {}, 'Account & personal information')}>
  <div class="container py-8">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">{t('settings.account_personal_title', {}, 'Account & personal information')}</h1>
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
              {email}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.personal_information_title', {}, 'Personal information')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onsubmit={handleProfileSubmit} class="space-y-5">
            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <Label>{t('settings.display_name', {}, 'Display name')}</Label>
                <Input value={username} disabled />
              </div>

              <div class="space-y-2">
                <Label>{t('settings.email', {}, 'Email')}</Label>
                <Input value={email} disabled />
              </div>
            </div>

            <div class="space-y-2">
              <Label for="bio">{t('settings.bio', {}, 'Bio')}</Label>
              <Textarea
                id="bio"
                value={bio}
                oninput={handleBioInput}
                rows={3}
                placeholder={t('settings.bio_placeholder', {}, 'Write a few sentences about yourself')}
              />
            </div>

            <div class="space-y-2">
              <Label>{t('settings.urls', {}, 'Links')}</Label>

              <div class="space-y-2">
                {#each urls as url, index}
                  <div class="flex gap-2">
                    <Input
                      value={url}
                      oninput={handleUrlInput(index)}
                      placeholder="https://example.com"
                      class="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onclick={() => {
                        removeUrl(index)
                      }}
                    >
                      {t('settings.remove', {}, 'Remove')}
                    </Button>
                  </div>
                {/each}
                <Button type="button" variant="outline" size="sm" onclick={addUrl}>
                  {t('settings.add_url', {}, 'Add URL')}
                </Button>
              </div>
            </div>

            <Button type="submit">{t('settings.update_personal_info', {}, 'Update personal information')}</Button>
          </form>
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
          <Link href={FRONTEND_ROUTES.PROFILE}>
            <Button variant="outline">{t('settings.profile_link', {}, 'Capability profile')}</Button>
          </Link>
          <Link href="/reviews/task-board">
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
</AppLayout>
