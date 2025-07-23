<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import ArrowLeft from 'lucide-svelte/icons/arrow-left'
  import Building from 'lucide-svelte/icons/building'
  import Calendar from 'lucide-svelte/icons/calendar'
  import Mail from 'lucide-svelte/icons/mail'
  import Edit from 'lucide-svelte/icons/pencil'
  import Shield from 'lucide-svelte/icons/shield'
  import UserIcon from 'lucide-svelte/icons/user'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Separator from '@/components/ui/separator.svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import type { User } from './types'

  interface Props {
    user: User & {
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
    active: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-slate-100 text-slate-800',
    suspended: 'bg-red-100 text-red-800',
    pending: 'bg-amber-100 text-amber-800',
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-violet-100 text-violet-800',
    super_admin: 'bg-red-100 text-red-800',
    user: 'bg-blue-100 text-blue-800',
    moderator: 'bg-orange-100 text-orange-800',
  }

  const pageTitle = $derived(t('user.user_detail', {}, 'Chi tiết người dùng'))

  function handleBack() {
    router.visit('/users')
  }

  function handleEdit() {
    router.visit(`/users/${user.id}/edit`)
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
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
          {t('common.back', {}, 'Quay lại')}
        </Button>

        <div class="flex items-center gap-3">
          {#if user.avatar_url}
            <img
              src={user.avatar_url}
              alt={user.username}
              class="size-14 rounded-full border-2 border-border shadow-neo-sm object-cover"
            />
          {:else}
            <div class="size-14 rounded-full border-2 border-border shadow-neo-sm bg-muted flex items-center justify-center">
              <UserIcon class="size-6 text-muted-foreground" />
            </div>
          {/if}
          <div>
            <h1 class="text-3xl font-black tracking-tight">{user.username}</h1>
            <div class="flex flex-wrap items-center gap-2 mt-1">
              <Badge class={roleColors[user.system_role] || 'bg-blue-100 text-blue-800'}>
                {user.system_role}
              </Badge>
              <Badge class={statusColors[user.status] || 'bg-slate-100 text-slate-800'}>
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
            {t('common.edit', {}, 'Sửa')}
          </Button>
        {/if}
        <Button variant="ghost" onclick={handleBack}>
          {t('user.back_to_list', {}, 'Danh sách')}
        </Button>
      </div>
    </div>

    <!-- User Info Card -->
    <Card class="border-2 shadow-neo">
      <CardHeader>
        <CardTitle>{t('user.user_info', {}, 'Thông tin người dùng')}</CardTitle>
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
                {t('user.system_role', {}, 'Vai trò hệ thống')}
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
                {t('user.status', {}, 'Trạng thái')}
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
                  {t('user.phone', {}, 'Số điện thoại')}
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
                  {t('user.bio', {}, 'Giới thiệu')}
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
                  {t('user.trust_score', {}, 'Điểm tin cậy')}
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
                {t('common.created_at', {}, 'Ngày tạo')}
              </p>
              <p class="font-bold">
                {user.created_at ? formatDate(user.created_at) : '—'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Organization Memberships -->
    {#if user.organization_users && user.organization_users.length > 0}
      <Card class="border-2 shadow-neo">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Building class="size-4" />
            {t('user.organizations', {}, 'Tổ chức')} ({user.organization_users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-2">
            {#each user.organization_users as orgUser (orgUser.organization_id)}
              <div class="flex items-center justify-between rounded-md border-2 border-border p-3 shadow-neo-sm">
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
