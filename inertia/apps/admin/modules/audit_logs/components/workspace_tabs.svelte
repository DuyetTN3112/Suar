<script lang="ts">
  import { Activity, Binary, LayoutPanelTop, ShieldCheck } from 'lucide-svelte'

  import type { WorkspaceView } from '@/apps/admin/modules/audit_logs/console_view'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    activeView: WorkspaceView
    total: number
    selectedTrace: string | null
    onChange: (view: WorkspaceView) => void
  }

  const { activeView, total, selectedTrace, onChange }: Props = $props()
  const { t } = useTranslation()

  const views: WorkspaceView[] = ['overview', 'stream', 'evidence', 'payload']

  function labelFor(view: WorkspaceView) {
    if (view === 'overview') return t('task.admin_audit_logs.tabs.overview', {}, 'Overview')
    if (view === 'stream') return t('task.admin_audit_logs.tabs.stream', {}, 'Event stream')
    if (view === 'evidence') return t('admin_ui.audit_logs.trace', {}, 'Trace')
    return t('admin_ui.audit_logs.payload', {}, 'Payload')
  }

  function descriptionFor(view: WorkspaceView) {
    if (view === 'overview') return t('task.admin_audit_logs.tabs.overview_description', {}, 'Primary signals')
    if (view === 'stream') return t('task.admin_audit_logs.tabs.stream_description', {}, 'Track events')
    if (view === 'evidence') return t('task.admin_audit_logs.tabs.evidence_description', {}, 'Trace links')
    return t('task.admin_audit_logs.tabs.payload_description', {}, 'Compare data')
  }

  function badgeFor(view: WorkspaceView) {
    if (view === 'evidence' || view === 'payload') {
      return selectedTrace
        ? t('task.admin_audit_logs.has_trace', {}, 'Has trace')
        : t('task.admin_audit_logs.select_event', {}, 'Select event')
    }

    return t('task.admin_audit_logs.event_count', { count: total }, ':count events')
  }

  function iconFor(view: WorkspaceView) {
    if (view === 'overview') return LayoutPanelTop
    if (view === 'stream') return Activity
    if (view === 'evidence') return ShieldCheck
    return Binary
  }
</script>

<div class="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
  {#each views as view}
    {@const Icon = iconFor(view)}
    <button
      type="button"
      data-testid={`audit-workspace-tab-${view}`}
      class={`rounded-[24px] border px-4 py-4 text-left transition-colors ${
        activeView === view
          ? 'border-primary bg-primary text-primary-foreground shadow-[0_18px_40px_-30px_rgba(15,23,42,0.75)]'
          : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/60'
      }`}
      onclick={() => onChange(view)}
    >
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <Icon class="h-4 w-4" />
            {labelFor(view)}
          </div>
          <div class={`text-xs leading-5 ${activeView === view ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            {descriptionFor(view)}
          </div>
        </div>
        <span
          class={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            activeView === view ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          {badgeFor(view)}
        </span>
      </div>
    </button>
  {/each}
</div>
