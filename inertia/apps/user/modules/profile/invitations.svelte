<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Check, X } from 'lucide-svelte'
  import { format } from 'date-fns'

  import Avatar from '@/apps/user/shared/ui/avatar.svelte'
  import AvatarFallback from '@/apps/user/shared/ui/avatar_fallback.svelte'
  import AvatarImage from '@/apps/user/shared/ui/avatar_image.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardDescription from '@/apps/user/shared/ui/card_description.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { dateFnsLocale, dateTimePattern } from '@/apps/user/shared/lib/date_locale'
  import type { OffsetPagePagination } from '@/apps/user/shared/lib/pagination'
  import { uiToast } from '@/apps/user/shared/lib/ui_toast'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'

  interface Invitation {
    organization_id: string
    organization_name: string | null
    organization_logo: string | null
    org_role: string
    invited_by: {
      id: string
      username: string | null
      email: string
      avatar_url: string | null
    } | null
    created_at: string
  }

  interface Props {
    invitations: Invitation[]
    pagination?: OffsetPagePagination
  }

  const { invitations = [], pagination }: Props = $props()
  const { locale, t } = $derived(useTranslation())

  const pageTitle = $derived(t('user.invitations.title', {}, 'Organization invitations'))

  function initialInvitations() {
    return invitations
  }

  let visibleInvitations = $state<Invitation[]>(initialInvitations())
  let isProcessing = $state<string | null>(null)

  function getInitials(name?: string | null, email?: string): string {
    if (name) return name.substring(0, 2).toUpperCase()
    if (email) return email.substring(0, 2).toUpperCase()
    return 'O'
  }

  function handleAccept(organizationId: string) {
    if (isProcessing) return
    isProcessing = organizationId

    router.put(
      `/api/v1/me/invitations/${organizationId}/accept`,
      {},
      {
        onSuccess: () => {
          uiToast.success(t('user.invitations.accept_success', {}, 'Invitation accepted.'))
        },
        onError: () => {
          uiToast.error(t('user.invitations.action_error', {}, 'Something went wrong. Please try again later.'))
        },
        onFinish: () => {
          isProcessing = null
        }
      }
    )
  }

  async function handleReject(organizationId: string) {
    if (isProcessing) return
    isProcessing = organizationId

    try {
      const csrfToken = document
        .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
        ?.getAttribute('content')
      const response = await fetch(`/api/v1/me/invitations/${organizationId}/reject`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        },
      })

      if (!response.ok) {
        throw new Error(`Reject invitation failed with ${response.status}`)
      }

      uiToast.success(t('user.invitations.reject_success', {}, 'Invitation rejected.'))
      visibleInvitations = visibleInvitations.filter(
        (invitation) => invitation.organization_id !== organizationId
      )
    } catch {
      uiToast.error(t('user.invitations.action_error', {}, 'Something went wrong. Please try again later.'))
    } finally {
      isProcessing = null
    }
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="container mx-auto max-w-4xl py-8 px-4">
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
      <p class="text-muted-foreground mt-2">
        {t('user.invitations.description', {}, 'Organization invitations waiting for you.')}
      </p>
    </div>

    {#if visibleInvitations.length === 0}
      <Card class="bg-muted/30 border-dashed border-2">
        <CardContent class="flex flex-col items-center justify-center py-16 text-center">
          <div class="rounded-full bg-muted p-4 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-muted-foreground"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <h3 class="text-lg font-semibold">{t('user.invitations.empty_title', {}, 'No invitations yet')}</h3>
          <p class="text-muted-foreground mt-1 max-w-sm">
            {t('user.invitations.empty_description', {}, 'You have not received any organization invitations yet.')}
          </p>
        </CardContent>
      </Card>
    {:else}
      <div class="grid gap-4 md:grid-cols-2">
        {#each visibleInvitations as inv}
          <Card class="overflow-hidden transition-all hover:border-primary/50">
            <CardHeader class="pb-3 border-b bg-muted/20">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <Avatar class="h-10 w-10 border bg-background">
                    <AvatarImage src={inv.organization_logo || ''} alt={inv.organization_name || t('user.invitations.organization_anonymous', {}, 'Anonymous organization')} />
                    <AvatarFallback>{getInitials(inv.organization_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle class="text-base">{inv.organization_name || t('user.invitations.organization_anonymous', {}, 'Anonymous organization')}</CardTitle>
                    <CardDescription>{t('user.invitations.role_label', {}, 'Role')}: <span class="font-medium text-foreground">{inv.org_role}</span></CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent class="pt-4 pb-4">
              <div class="space-y-4">
                <div class="flex items-center gap-3 text-sm">
                  {#if inv.invited_by}
                    <Avatar class="h-6 w-6">
                      <AvatarImage src={inv.invited_by.avatar_url || ''} alt={inv.invited_by.username || ''} />
                      <AvatarFallback class="text-[10px]">{getInitials(inv.invited_by.username, inv.invited_by.email)}</AvatarFallback>
                    </Avatar>
                    <span class="text-muted-foreground">
                      {t('user.invitations.invited_by', {}, 'Invited by')} <span class="font-medium text-foreground">{inv.invited_by.username || inv.invited_by.email}</span>
                    </span>
                  {:else}
                    <div class="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                      <span class="text-[10px]">?</span>
                    </div>
                    <span class="text-muted-foreground">{t('user.invitations.anonymous_inviter', {}, 'Anonymous inviter')}</span>
                  {/if}
                </div>
                <div class="text-xs text-muted-foreground">
                  {t('user.invitations.sent_at', {}, 'Sent at')}: {format(new Date(inv.created_at), dateTimePattern(locale), { locale: dateFnsLocale(locale) })}
                </div>
              </div>
              <div class="mt-6 flex items-center gap-3">
                <Button 
                  variant="default" 
                  class="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={isProcessing === inv.organization_id}
                  onclick={() => handleAccept(inv.organization_id)}
                >
                  <Check class="mr-2 h-4 w-4" />
                  {isProcessing === inv.organization_id
                    ? t('common.loading', {}, 'Loading...')
                    : t('user.invitations.accept', {}, 'Accept')}
                </Button>
                <Button 
                  variant="outline" 
                  class="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                  disabled={isProcessing === inv.organization_id}
                  onclick={() => handleReject(inv.organization_id)}
                >
                  <X class="mr-2 h-4 w-4" />
                  {isProcessing === inv.organization_id
                    ? t('common.loading', {}, 'Loading...')
                    : t('user.invitations.reject', {}, 'Reject')}
                </Button>
              </div>
            </CardContent>
          </Card>
        {/each}
      </div>
      {#if pagination}
        <UnifiedOffsetPagination {pagination} baseUrl="/profile/invitations" />
      {/if}
    {/if}
  </div>
</AppLayout>
