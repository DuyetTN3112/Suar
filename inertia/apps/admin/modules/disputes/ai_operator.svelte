<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import { Activity, AlertTriangle, Bot, CheckCircle2, Clock3, RefreshCw, WifiOff } from 'lucide-svelte'

  interface ActiveEvaluation { evaluation_id: string; title?: string; started_at: string; stage: string }
  interface AgentRuntime {
    state: 'online' | 'offline' | 'misconfigured'
    checked_at: string
    diagnostic: string | null
    service?: string
    started_at?: string
    active_evaluations?: ActiveEvaluation[]
  }
  interface Metrics { totalEvaluations: number; activeEvaluations: number; completedEvaluations: number; failedEvaluations: number; queuedDisputes: number }
  interface Dispute { id: string; task_title: string | null; status: string; created_at: string }
  interface Props { metrics: Metrics; disputes: { data: Dispute[] }; agent_runtime: AgentRuntime }
  const { metrics, disputes, agent_runtime }: Props = $props()
  const locale = typeof document !== 'undefined' && document.documentElement.lang.startsWith('vi') ? 'vi-VN' : 'en-US'
  const checkedAt = $derived(new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(agent_runtime.checked_at)))
  const stateLabel = $derived(agent_runtime.state === 'online' ? 'Đang trực tuyến' : agent_runtime.state === 'misconfigured' ? 'Chưa cấu hình' : 'Không thể kết nối')
  const stateTone = $derived(agent_runtime.state === 'online' ? 'border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'border-destructive/40 bg-destructive/10 text-destructive')
  function elapsed(value: string): string {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
    return minutes < 1 ? 'vừa bắt đầu' : `${minutes} phút`
  }
</script>

<svelte:head><title>Admin · Theo dõi AI Agent</title></svelte:head>

<div class="mx-auto max-w-7xl space-y-5">
  <header class="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
    <div class="max-w-3xl">
      <p class="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Vận hành hệ thống</p>
      <h1 class="mt-1 text-3xl font-black tracking-tight text-foreground">Theo dõi AI Agent</h1>
      <p class="mt-2 text-sm leading-6 text-muted-foreground">Tình trạng runtime và tiến độ thực tế của các phân tích tranh chấp. Màn hình này chỉ quan sát, không chạy lại AI.</p>
    </div>
    <Link href="/admin/disputes/ai-operator" class="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold transition hover:border-primary hover:text-primary"><RefreshCw class="h-4 w-4" /> Kiểm tra lại</Link>
  </header>

  <section class="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.75fr)]">
    <article class="rounded-2xl border border-border bg-card p-5 shadow-xs">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class={`grid h-11 w-11 place-items-center rounded-xl border ${stateTone}`}>{#if agent_runtime.state === 'online'}<Activity class="h-5 w-5" />{:else}<WifiOff class="h-5 w-5" />{/if}</div>
          <div><h2 class="font-black text-foreground">Clawagent runtime</h2><p class="mt-1 text-sm text-muted-foreground">Kiểm tra lúc {checkedAt}</p></div>
        </div>
        <span class={`rounded-full border px-3 py-1 text-xs font-black ${stateTone}`}>{stateLabel}</span>
      </div>
      {#if agent_runtime.state === 'online'}
        <dl class="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-3"><div><dt class="text-xs font-bold text-muted-foreground">Dịch vụ</dt><dd class="mt-1 font-semibold text-foreground">{agent_runtime.service ?? 'suar-dispute'}</dd></div><div><dt class="text-xs font-bold text-muted-foreground">Đang xử lý</dt><dd class="mt-1 font-semibold text-foreground">{agent_runtime.active_evaluations?.length ?? 0} case</dd></div><div><dt class="text-xs font-bold text-muted-foreground">Khởi động</dt><dd class="mt-1 font-semibold text-foreground">{agent_runtime.started_at ? new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(agent_runtime.started_at)) : 'Không rõ'}</dd></div></dl>
      {:else}<p class="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive">{agent_runtime.diagnostic ?? 'Chưa có phản hồi từ agent.'}</p>{/if}
    </article>
    <aside class="rounded-2xl border border-border bg-muted/35 p-5"><h2 class="font-black text-foreground">Cách đọc trạng thái</h2><ul class="mt-3 space-y-3 text-sm leading-5 text-muted-foreground"><li><strong class="text-foreground">Chưa dispatch:</strong> report chưa tạo evaluation.</li><li><strong class="text-foreground">Đang phân tích:</strong> agent nhận được case và runtime đang giữ job.</li><li><strong class="text-foreground">Chờ admin:</strong> callback đã hoàn tất, cần quyết định của người quản trị.</li></ul></aside>
  </section>

  <section class="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-5">
    {#each [["Report chờ dispatch", metrics.queuedDisputes], ["AI đang phân tích", metrics.activeEvaluations], ["Đã hoàn tất", metrics.completedEvaluations], ["Lỗi", metrics.failedEvaluations], ["Tổng evaluation", metrics.totalEvaluations]] as metric}
      <div class="bg-card p-4"><p class="text-xs font-bold text-muted-foreground">{metric[0]}</p><p class="mt-2 text-2xl font-black text-foreground">{metric[1]}</p></div>
    {/each}
  </section>

  <section class="overflow-hidden rounded-2xl border border-border bg-card">
    <header class="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 class="font-black text-foreground">Job đang chạy trên agent</h2><p class="mt-1 text-sm text-muted-foreground">Thời lượng được tính từ lúc agent bắt đầu nhận case.</p></div><Bot class="h-5 w-5 text-primary" /></header>
    {#if agent_runtime.active_evaluations?.length}
      <div class="divide-y divide-border">{#each agent_runtime.active_evaluations as job (job.evaluation_id)}<div class="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p class="font-semibold text-foreground">{job.title ?? job.evaluation_id}</p><p class="mt-1 font-mono text-xs text-muted-foreground">{job.evaluation_id}</p></div><div class="flex items-center gap-4 text-sm"><span class="inline-flex items-center gap-1.5 text-muted-foreground"><Clock3 class="h-4 w-4" /> {elapsed(job.started_at)}</span><span class="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{job.stage}</span></div></div>{/each}</div>
    {:else}<div class="px-5 py-10 text-center text-sm text-muted-foreground">Hiện không có job nào đang được agent xử lý.</div>{/if}
  </section>

  <section class="rounded-2xl border border-border bg-card"><header class="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 class="font-black text-foreground">Case cần theo dõi</h2><p class="mt-1 text-sm text-muted-foreground">Mở case để xem evidence và kết quả callback.</p></div><AlertTriangle class="h-5 w-5 text-primary" /></header><div class="divide-y divide-border">{#each disputes.data.filter((d) => !['resolved', 'done'].includes(d.status)) as dispute (dispute.id)}<Link href={`/admin/disputes/${dispute.id}`} class="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-muted/50"><div><p class="font-semibold text-foreground">{dispute.task_title ?? dispute.id}</p><p class="mt-1 text-xs text-muted-foreground">{dispute.status}</p></div><CheckCircle2 class="h-4 w-4 text-muted-foreground" /></Link>{:else}<p class="px-5 py-8 text-center text-sm text-muted-foreground">Không có case mở trong trang hiện tại.</p>{/each}</div></section>
</div>
