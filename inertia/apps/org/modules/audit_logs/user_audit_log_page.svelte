<script lang="ts">
  import { page, router } from '@inertiajs/svelte'

  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import type { CursorPagePagination } from '@/apps/org/shared/lib/pagination'
  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import UnifiedCursorPagination from '@/apps/org/shared/ui/unified_cursor_pagination.svelte'
  import type {
    AuditActivityCategory,
    AuditActivityOutcome,
    UserAuditActivityItem,
  } from '@/apps/org/modules/audit_logs/models/activity_item'

  interface Props {
    auditLogs: UserAuditActivityItem[]
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
  <main class="mx-auto max-w-4xl space-y-7 px-1 pb-10">
    <header class="border-b border-border pb-6">
      <p class="font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-primary">Riêng tư</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Chỉ hiển thị hoạt động tác động đến tài khoản của bạn. Dữ liệu chẩn đoán và định danh nội bộ không xuất hiện ở đây.
      </p>
    </header>

    <section class="overflow-hidden rounded-xl border border-border bg-card shadow-sm" aria-label="Lịch sử hoạt động cá nhân">
      {#if hasCursorPagination}
        <div class="border-b border-border px-5">
          <UnifiedCursorPagination
            {pagination}
            summary="Duyệt lịch sử hoạt động"
            onLoadNewer={loadNewerPage}
            onLoadNewest={loadNewestPage}
            onLoadOlder={loadOlderPage}
          />
        </div>
      {/if}

      {#if auditLogs.length === 0}
        <div class="px-6 py-16 text-center">
          <p class="font-medium text-foreground">Chưa có hoạt động nào.</p>
          <p class="mt-2 text-sm text-muted-foreground">Các thay đổi liên quan đến tài khoản sẽ xuất hiện tại đây.</p>
        </div>
      {:else}
        <ol class="divide-y divide-border">
          {#each auditLogs as log}
            <li class="flex gap-4 px-5 py-5">
              <div class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true"></div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-medium text-foreground">{log.title}</p>
                  <Badge variant="outline">{categoryLabel(log.category)}</Badge>
                </div>
                <p class="mt-1 text-sm leading-6 text-muted-foreground">{log.description}</p>
                <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={outcomeVariant(log.outcome)}>{outcomeLabel(log.outcome)}</Badge>
                  <time class="text-xs text-muted-foreground" datetime={log.occurredAt}>{formatOccurredAt(log.occurredAt)}</time>
                </div>
              </div>
            </li>
          {/each}
        </ol>
      {/if}
    </section>
  </main>
</OrganizationLayout>
