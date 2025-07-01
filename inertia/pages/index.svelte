<script lang="ts">
  import { page, Link } from '@inertiajs/svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { FRONTEND_ROUTES } from '@/constants'
  import {
    SquareCheckBig, Building, Users, FolderOpen, Plus, ArrowRight,
    TrendingUp, Clock, Star, Zap
  } from 'lucide-svelte'

  interface AuthUser {
    id?: string
    username?: string
    email?: string
    isAdmin?: boolean
    current_organization_id?: string | null
    organizations?: { id: string; name: string }[]
  }

  interface PageProps {
    auth?: { user?: AuthUser }
    [key: string]: unknown
  }

  const { t } = useTranslation()
  const props = $derived($page.props as unknown as PageProps)
  const user = $derived(props.auth?.user)
  const hasOrg = $derived(!!user?.current_organization_id)
</script>

<svelte:head>
  <title>{t('dashboard.title', {}, 'Bảng điều khiển')}</title>
</svelte:head>

<AppLayout title={t('dashboard.title', {}, 'Bảng điều khiển')}>
  <div class="p-4 sm:p-6 lg:p-8 space-y-8">
    <!-- Welcome Banner -->
    <div class="rounded-xl border-2 border-border bg-neo-purple/10 p-6 shadow-neo">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black tracking-tight">
            {t('dashboard.welcome', {}, 'Xin chào')}, {user?.username || 'User'}! 👋
          </h1>
          <p class="text-muted-foreground mt-1 text-lg">
            {t('dashboard.subtitle', {}, 'Quản lý công việc và dự án của bạn')}
          </p>
        </div>
        <Link href={FRONTEND_ROUTES.TASKS_CREATE}>
          <Button class="gap-2 font-bold">
            <Plus class="h-4 w-4" />
            {t('task.create_new', {}, 'Tạo nhiệm vụ mới')}
          </Button>
        </Link>
      </div>
    </div>

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-xl border-2 border-border p-5 shadow-neo-sm" style="background-color: var(--neo-cyan);">
        <div class="flex items-center gap-3">
          <div class="rounded-lg border-2 border-border bg-white/80 p-2">
            <SquareCheckBig class="h-6 w-6 text-foreground" />
          </div>
          <div>
            <p class="text-sm font-bold text-foreground/70">{t('dashboard.tasks', {}, 'Nhiệm vụ')}</p>
            <p class="text-2xl font-black text-foreground">{t('dashboard.view_all', {}, 'Xem tất cả')}</p>
          </div>
        </div>
        <Link href={FRONTEND_ROUTES.TASKS} class="mt-3 inline-flex items-center gap-1 text-sm font-bold text-foreground hover:underline">
          {t('common.go', {}, 'Đi đến')} <ArrowRight class="h-4 w-4" />
        </Link>
      </div>

      <div class="rounded-xl border-2 border-border p-5 shadow-neo-sm" style="background-color: var(--neo-pink);">
        <div class="flex items-center gap-3">
          <div class="rounded-lg border-2 border-border bg-white/80 p-2">
            <FolderOpen class="h-6 w-6 text-foreground" />
          </div>
          <div>
            <p class="text-sm font-bold text-foreground/70">{t('dashboard.projects', {}, 'Dự án')}</p>
            <p class="text-2xl font-black text-foreground">{t('dashboard.view_all', {}, 'Xem tất cả')}</p>
          </div>
        </div>
        <Link href={FRONTEND_ROUTES.PROJECTS} class="mt-3 inline-flex items-center gap-1 text-sm font-bold text-foreground hover:underline">
          {t('common.go', {}, 'Đi đến')} <ArrowRight class="h-4 w-4" />
        </Link>
      </div>

      <div class="rounded-xl border-2 border-border p-5 shadow-neo-sm" style="background-color: var(--neo-sunflower);">
        <div class="flex items-center gap-3">
          <div class="rounded-lg border-2 border-border bg-white/80 p-2">
            <Building class="h-6 w-6 text-foreground" />
          </div>
          <div>
            <p class="text-sm font-bold text-foreground/70">{t('dashboard.organizations', {}, 'Tổ chức')}</p>
            <p class="text-2xl font-black text-foreground">{user?.organizations?.length ?? 0}</p>
          </div>
        </div>
        <Link href={FRONTEND_ROUTES.ORGANIZATIONS} class="mt-3 inline-flex items-center gap-1 text-sm font-bold text-foreground hover:underline">
          {t('common.go', {}, 'Đi đến')} <ArrowRight class="h-4 w-4" />
        </Link>
      </div>

      <div class="rounded-xl border-2 border-border p-5 shadow-neo-sm" style="background-color: var(--neo-emerald);">
        <div class="flex items-center gap-3">
          <div class="rounded-lg border-2 border-border bg-white/80 p-2">
            <Users class="h-6 w-6 text-foreground" />
          </div>
          <div>
            <p class="text-sm font-bold text-foreground/70">{t('dashboard.users', {}, 'Thành viên')}</p>
            <p class="text-2xl font-black text-foreground">{t('dashboard.view_all', {}, 'Xem tất cả')}</p>
          </div>
        </div>
        <Link href="/users" class="mt-3 inline-flex items-center gap-1 text-sm font-bold text-foreground hover:underline">
          {t('common.go', {}, 'Đi đến')} <ArrowRight class="h-4 w-4" />
        </Link>
      </div>
    </div>

    <!-- Quick Actions + Tips -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Quick Actions -->
      <Card class="shadow-neo">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-xl font-black">
            <Zap class="h-5 w-5 text-neo-amber" />
            {t('dashboard.quick_actions', {}, 'Thao tác nhanh')}
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <Link href="/tasks/create" class="flex items-center gap-3 rounded-lg border-2 border-border p-3 hover:shadow-neo-sm transition-shadow" style="background-color: var(--neo-lavender);">
            <Plus class="h-5 w-5" />
            <span class="font-bold">{t('task.create_new', {}, 'Tạo nhiệm vụ mới')}</span>
          </Link>
          <Link href="/projects" class="flex items-center gap-3 rounded-lg border-2 border-border p-3 hover:shadow-neo-sm transition-shadow" style="background-color: var(--neo-mint);">
            <FolderOpen class="h-5 w-5" />
            <span class="font-bold">{t('dashboard.browse_projects', {}, 'Duyệt dự án')}</span>
          </Link>
          {#if !hasOrg}
            <Link href="/organizations/create" class="flex items-center gap-3 rounded-lg border-2 border-border p-3 hover:shadow-neo-sm transition-shadow" style="background-color: var(--neo-peach);">
              <Building class="h-5 w-5" />
              <span class="font-bold">{t('dashboard.create_org', {}, 'Tạo tổ chức')}</span>
            </Link>
          {/if}
        </CardContent>
      </Card>

      <!-- Getting Started -->
      <Card class="shadow-neo">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-xl font-black">
            <TrendingUp class="h-5 w-5 text-neo-emerald" />
            {t('dashboard.getting_started', {}, 'Bắt đầu')}
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-start gap-3">
            <Badge class="neo-chip-emerald shrink-0">1</Badge>
            <div>
              <p class="font-bold">{t('dashboard.step1_title', {}, 'Tạo hoặc tham gia tổ chức')}</p>
              <p class="text-sm text-muted-foreground">{t('dashboard.step1_desc', {}, 'Bắt đầu bằng cách tạo tổ chức hoặc được mời vào một tổ chức')}</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <Badge class="neo-chip-cyan shrink-0">2</Badge>
            <div>
              <p class="font-bold">{t('dashboard.step2_title', {}, 'Khám phá dự án')}</p>
              <p class="text-sm text-muted-foreground">{t('dashboard.step2_desc', {}, 'Tham gia các dự án có sẵn hoặc tạo dự án mới')}</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <Badge class="neo-chip-amber shrink-0">3</Badge>
            <div>
              <p class="font-bold">{t('dashboard.step3_title', {}, 'Quản lý nhiệm vụ')}</p>
              <p class="text-sm text-muted-foreground">{t('dashboard.step3_desc', {}, 'Tạo, phân công và theo dõi tiến độ nhiệm vụ')}</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <Badge class="neo-chip-pink shrink-0">4</Badge>
            <div>
              <p class="font-bold">{t('dashboard.step4_title', {}, 'Hợp tác cùng nhau')}</p>
              <p class="text-sm text-muted-foreground">{t('dashboard.step4_desc', {}, 'Trò chuyện, đánh giá kỹ năng và làm việc nhóm hiệu quả')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Feature Highlights -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="rounded-xl border-2 border-border p-5 shadow-neo-sm text-center" style="background-color: var(--neo-lavender);">
        <Clock class="h-8 w-8 mx-auto mb-2" />
        <h3 class="font-black text-lg">{t('dashboard.feature_kanban', {}, 'Kanban Board')}</h3>
        <p class="text-sm text-foreground/70 mt-1">{t('dashboard.feature_kanban_desc', {}, 'Kéo thả nhiệm vụ giữa các cột trạng thái')}</p>
      </div>
      <div class="rounded-xl border-2 border-border p-5 shadow-neo-sm text-center" style="background-color: var(--neo-coral);">
        <Star class="h-8 w-8 mx-auto mb-2" />
        <h3 class="font-black text-lg">{t('dashboard.feature_review', {}, 'Skill Review')}</h3>
        <p class="text-sm text-foreground/70 mt-1">{t('dashboard.feature_review_desc', {}, 'Đánh giá kỹ năng đa chiều với spider chart')}</p>
      </div>
      <div class="rounded-xl border-2 border-border p-5 shadow-neo-sm text-center" style="background-color: var(--neo-sky);">
        <TrendingUp class="h-8 w-8 mx-auto mb-2" />
        <h3 class="font-black text-lg">{t('dashboard.feature_gantt', {}, 'Gantt Timeline')}</h3>
        <p class="text-sm text-foreground/70 mt-1">{t('dashboard.feature_gantt_desc', {}, 'Theo dõi timeline dự án trực quan')}</p>
      </div>
    </div>
  </div>
</AppLayout>
