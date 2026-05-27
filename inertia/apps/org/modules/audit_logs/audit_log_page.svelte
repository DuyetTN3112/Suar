<script lang="ts">
  import { page, router } from '@inertiajs/svelte'

  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import type { CursorPagePagination } from '@/apps/org/shared/lib/pagination'
  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import UnifiedCursorPagination from '@/apps/org/shared/ui/unified_cursor_pagination.svelte'
  import type {
    AuditActivityCategory,
    AuditActivityOutcome,
    OrganizationAuditActivityItem,
  } from '@/apps/org/modules/audit_logs/models/activity_item'

  interface Props {
    auditLogs: OrganizationAuditActivityItem[]
    pagination: CursorPagePagination
    title: string
  }

  const { auditLogs, pagination, title }: Props = $props()
  const currentPath = $derived(page.url.split('?')[0] || '/')
  const hasCursorPagination = $derived(pagination.mode === 'cursor')

  function buildHref(options: { after?: string | null; before?: string | null } = {}) {
    const params = new URLSearchParams()
    if (options.after) params.set('after', options.after)
    if (options.before) params.set('before', options.before)
    const query = params.toString()
    return query ? `${currentPath}?${query}` : currentPath
  }

  function loadOlderPage() {
    if (pagination.cursor?.nextCursor) {
      router.visit(buildHref({ after: pagination.cursor.nextCursor }), { preserveScroll: true })
    }
  }

  function loadNewerPage() {
    if (pagination.cursor?.previousCursor) {
      router.visit(buildHref({ before: pagination.cursor.previousCursor }), { preserveScroll: true })
    }
  }

  function loadNewestPage() {
    router.visit(currentPath, { preserveScroll: true })
  }

  function categoryLabel(category: AuditActivityCategory): string {
    return {
      account: 'Tài khoản',
      access: 'Quyền truy cập',
      security: 'Bảo mật',
      organization: 'Tổ chức',
      membership: 'Thành viên',
      project: 'Dự án',
      task: 'Công việc',
      review: 'Đánh giá',
      billing: 'Gói dịch vụ',
      activity: 'Hoạt động',
    }[category]
  }

  function outcomeLabel(outcome: AuditActivityOutcome): string {
    return {
      recorded: 'Đã ghi nhận',
      success: 'Hoàn tất',
      warning: 'Cần chú ý',
      failure: 'Không hoàn tất',
    }[outcome]
  }

  function outcomeVariant(outcome: AuditActivityOutcome) {
    if (outcome === 'failure') return 'destructive'
    if (outcome === 'warning') return 'warning'
    if (outcome === 'success') return 'secondary'
    return 'outline'
  }

  function formatOccurredAt(value: string): string {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<OrganizationLayout {title}>
  <main class="mx-auto max-w-6xl space-y-7 px-1 pb-10">
    <header class="grid gap-4 border-b border-border pb-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
      <div>
        <p class="font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-primary">Governance record</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Lịch sử quản trị cần thiết để phối hợp trong tổ chức. Không hiển thị dữ liệu vận hành, định danh nội bộ hay payload hệ thống.
        </p>
      </div>
      <div class="border-l-2 border-primary pl-4 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
        <span class="block text-2xl font-semibold tracking-normal text-foreground">{pagination.total.toLocaleString()}</span>
        bản ghi trong phạm vi tổ chức
      </div>
    </header>

    <section class="overflow-hidden rounded-xl border border-border bg-card shadow-sm" aria-label="Lịch sử quản trị tổ chức">
      {#if hasCursorPagination}
        <div class="border-b border-border px-5">
          <UnifiedCursorPagination
            {pagination}
            summary="Duyệt lịch sử quản trị"
            onLoadNewer={loadNewerPage}
            onLoadNewest={loadNewestPage}
            onLoadOlder={loadOlderPage}
          />
        </div>
      {/if}

      {#if auditLogs.length === 0}
        <div class="px-6 py-16 text-center">
          <p class="font-medium text-foreground">Chưa có thay đổi quản trị nào.</p>
          <p class="mt-2 text-sm text-muted-foreground">Các thay đổi thành viên, quyền, dự án và công việc sẽ được ghi nhận ở đây.</p>
        </div>
      {:else}
        <div class="hidden grid-cols-[minmax(0,1fr)_10rem_9rem_10rem] gap-5 border-b border-border bg-muted/30 px-5 py-3 font-mono text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted-foreground md:grid">
          <span>Sự kiện</span>
          <span>Người thực hiện</span>
          <span>Phạm vi</span>
          <span class="text-right">Thời gian</span>
        </div>
        <ol class="divide-y divide-border">
          {#each auditLogs as log}
            <li class="grid gap-3 px-5 py-5 md:grid-cols-[minmax(0,1fr)_10rem_9rem_10rem] md:items-center md:gap-5">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-medium text-foreground">{log.title}</p>
                  <Badge variant="outline">{categoryLabel(log.category)}</Badge>
                </div>
                <p class="mt-1 text-sm leading-6 text-muted-foreground">{log.description}</p>
              </div>
              <div class="text-sm text-foreground">
                <span class="mr-2 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground md:hidden">Người thực hiện</span>{log.actorLabel}
              </div>
              <div class="text-sm text-muted-foreground">
                <span class="mr-2 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground md:hidden">Phạm vi</span>{log.subjectLabel}
              </div>
              <div class="flex items-center justify-between gap-2 md:flex-col md:items-end">
                <Badge variant={outcomeVariant(log.outcome)}>{outcomeLabel(log.outcome)}</Badge>
                <time class="whitespace-nowrap text-xs text-muted-foreground" datetime={log.occurredAt}>
                  {formatOccurredAt(log.occurredAt)}
                </time>
              </div>
            </li>
          {/each}
        </ol>
      {/if}
    </section>
  </main>
</OrganizationLayout>
