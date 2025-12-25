<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import ArrowLeft from 'lucide-svelte/icons/arrow-left'
  import Building from 'lucide-svelte/icons/building'
  import Calendar from 'lucide-svelte/icons/calendar'
  import Mail from 'lucide-svelte/icons/mail'
  import Edit from 'lucide-svelte/icons/pencil'
  import Shield from 'lucide-svelte/icons/shield'
  import UserIcon from 'lucide-svelte/icons/user'
  import { format } from 'date-fns'

  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import Separator from '@/apps/user/shared/ui/separator.svelte'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { dateFnsLocale, dateTimePattern } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import type { UserDirectoryRecord } from './types'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    user: UserDirectoryRecord & {
      bio?: string
      phone?: string
      avatar_url?: string
      trust_score?: number
    }
    permissions?: {
      canEdit: boolean
    }
  }

  const { user, permissions }: Props = $props()
  
  const { t } = useTranslation()

  const statusColors: Record<string, string> = {
    active: 'bg-primary/10 text-foreground border border-primary/20',
    inactive: 'bg-secondary text-secondary-foreground border border-border/50',
    suspended: 'bg-destructive/10 text-destructive border border-destructive/20',
    pending: 'border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-accent text-accent-foreground border border-primary/20',
    super_admin: 'bg-destructive/10 text-destructive border border-destructive/20',
    user: 'bg-secondary text-foreground border border-border/50',
    moderator: 'border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  }

  const pageTitle = $derived(t('user.user_detail', {}, 'User detail'))
  const reverseReviewSummary = $derived(user.reverse_review_summary ?? null)

  function handleBack() {
    router.visit('/users')
  }

  function handleEdit() {
    router.visit(`/users/${user.id}/edit`)
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return dateStr

    return format(date, dateTimePattern(), { locale: dateFnsLocale() })
  }
</script>

<svelte:head>
  <title>{user.username} — {pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex-1 space-y-3">
        <Button variant="ghost" size="sm" onclick={handleBack}>
          <ArrowLeft class="size-4 mr-1" />
          {t('common.back', {}, 'Back')}
        </Button>

        <div class="flex items-center gap-3">
          {#if user.avatar_url}
            <img
              src={user.avatar_url}
              alt={user.username}
              class="size-14 rounded-full border-2 border-border shadow-xs object-cover"
            />
          {:else}
            <div class="size-14 rounded-full border-2 border-border shadow-xs bg-muted flex items-center justify-center">
              <UserIcon class="size-6 text-muted-foreground" />
            </div>
          {/if}
          <div>
            <h1 class="text-3xl font-black tracking-tight">{user.username}</h1>
            <div class="flex flex-wrap items-center gap-2 mt-1">
              <Badge class={roleColors[user.system_role] || 'border border-border/50 bg-muted text-foreground'}>
                {user.system_role}
              </Badge>
              <Badge class={statusColors[user.status] || 'bg-muted text-foreground'}>
                {user.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        {#if permissions?.canEdit}
          <Button variant="outline" onclick={handleEdit}>
            <Edit class="size-4 mr-1" />
            {t('common.edit', {}, 'Edit')}
          </Button>
        {/if}
        <Button variant="ghost" onclick={handleBack}>
          {t('user.back_to_list', {}, 'Back to list')}
        </Button>
      </div>
    </div>

    <!-- User Info Card -->
    <Card class="border border-border bg-card shadow-suar-xs">
      <CardHeader>
        <CardTitle>{t('user.user_info', {}, 'User information')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <!-- Email -->
          <div class="flex items-start gap-3">
            <Mail class="size-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p class="text-xs font-bold uppercase text-muted-foreground">
                {t('user.email', {}, 'Email')}
              </p>
              <p class="font-bold">{user.email}</p>
            </div>
          </div>

          <Separator />

          <!-- System Role -->
          <div class="flex items-start gap-3">
            <Shield class="size-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p class="text-xs font-bold uppercase text-muted-foreground">
                {t('user.system_role', {}, 'System role')}
              </p>
              <Badge class={roleColors[user.system_role] || ''}>
                {user.system_role}
              </Badge>
            </div>
          </div>

          <Separator />

          <!-- Status -->
          <div class="flex items-start gap-3">
            <UserIcon class="size-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p class="text-xs font-bold uppercase text-muted-foreground">
                {t('user.status', {}, 'Status')}
              </p>
              <Badge class={statusColors[user.status] || ''}>
                {user.status}
              </Badge>
            </div>
          </div>

          {#if user.phone}
            <Separator />
            <div class="flex items-start gap-3">
              <UserIcon class="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p class="text-xs font-bold uppercase text-muted-foreground">
                  {t('user.phone', {}, 'Phone')}
                </p>
                <p class="font-bold">{user.phone}</p>
              </div>
            </div>
          {/if}

          {#if user.bio}
            <Separator />
            <div class="flex items-start gap-3">
              <UserIcon class="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p class="text-xs font-bold uppercase text-muted-foreground">
                  {t('user.bio', {}, 'Bio')}
                </p>
                <p class="text-sm whitespace-pre-wrap">{user.bio}</p>
              </div>
            </div>
          {/if}

          {#if user.trust_score != null}
            <Separator />
            <div class="flex items-start gap-3">
              <Shield class="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p class="text-xs font-bold uppercase text-muted-foreground">
                  {t('user.trust_score', {}, 'Trust score')}
                </p>
                <p class="font-bold">{user.trust_score}</p>
              </div>
            </div>
          {/if}

          <Separator />

          <!-- Created At -->
          <div class="flex items-start gap-3">
            <Calendar class="size-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p class="text-xs font-bold uppercase text-muted-foreground">
                {t('common.created_at', {}, 'Created at')}
              </p>
              <p class="font-bold">
                {user.created_at ? formatDate(user.created_at) : '—'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {#if reverseReviewSummary}
      <Card class="border border-border bg-card shadow-suar-xs">
        <CardHeader>
          <CardTitle>{t('user.reverse_feedback', {}, 'Reverse feedback')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-lg border border-border bg-secondary/30 p-4">
              <p class="text-xs font-bold uppercase text-muted-foreground">
                {t('common.total', {}, 'Total')}
              </p>
              <p class="mt-1 text-2xl font-black">{reverseReviewSummary.total_reviews}</p>
            </div>

            <div class="rounded-lg border border-border bg-secondary/30 p-4">
              <p class="text-xs font-bold uppercase text-muted-foreground">
                {t('reviews.average_rating', {}, 'Average rating')}
              </p>
              <p class="mt-1 text-2xl font-black">
                {reverseReviewSummary.average_rating ?? '—'}
              </p>
            </div>

            <div class="rounded-lg border border-border bg-secondary/30 p-4">
              <p class="text-xs font-bold uppercase text-muted-foreground">
                {t('reviews.peer_and_manager', {}, 'Peer / manager')}
              </p>
              <p class="mt-1 text-lg font-black">
                {reverseReviewSummary.peer_reviews} / {reverseReviewSummary.manager_reviews}
              </p>
            </div>

            <div class="rounded-lg border border-border bg-secondary/30 p-4">
              <p class="text-xs font-bold uppercase text-muted-foreground">
                {t('reviews.anonymous_reviews', {}, 'Anonymous')}
              </p>
              <p class="mt-1 text-2xl font-black">{reverseReviewSummary.anonymous_reviews}</p>
            </div>
          </div>

          <div class="mt-4 text-sm text-muted-foreground">
            {t('reviews.last_review_at', {}, 'Last review at')}:
            <span class="ml-1 font-bold text-foreground">
              {reverseReviewSummary.last_review_at
                ? formatDate(reverseReviewSummary.last_review_at)
                : '—'}
            </span>
          </div>
        </CardContent>
      </Card>
    {/if}

    <!-- Organization Memberships -->
    {#if user.organization_users && user.organization_users.length > 0}
      <Card class="border border-border bg-card shadow-suar-xs">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Building class="size-4 text-primary" />
            {t('user.organizations', {}, 'Organizations')} ({user.organization_users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-2">
            {#each user.organization_users as orgUser (orgUser.organization_id)}
              <div class="flex items-center justify-between border border-border bg-secondary/30 rounded-lg p-3">
                <span class="font-bold">{orgUser.organization_id}</span>
                <Badge variant="outline">{orgUser.org_role}</Badge>
              </div>
            {/each}
          </div>
        </CardContent>
      </Card>
    {/if}
  </div>
</AppLayout>
