<script lang="ts">
  interface Props {
    skillDepth: {
      total: number
      advanced: number
      deliveryReady: number
      foundation: number
    }
    t: (key: string, params?: Record<string, unknown>, fallback?: string) => string
  }

  const { skillDepth, t }: Props = $props()
</script>

<div class="rounded-2xl border border-border bg-card p-4 shadow-suar-xs">
  <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
    {t('user.profile_overview.skill_depth', {}, 'Skill depth')}
  </p>
  {#if skillDepth.total > 0}
    <div class="mt-4 space-y-3">
      {#if skillDepth.advanced > 0}
        <div class="flex items-center gap-3">
          <span class="w-16 text-[11px] font-bold tracking-wider text-muted-foreground">L9-L14</span>
          <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary/60 shadow-inner">
            <div class="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all duration-1000 ease-out" style="width: {(skillDepth.advanced / skillDepth.total) * 100}%"></div>
          </div>
          <span class="w-4 text-right text-[11px] font-black text-foreground">{skillDepth.advanced}</span>
        </div>
      {/if}
      {#if skillDepth.deliveryReady > 0}
        <div class="flex items-center gap-3">
          <span class="w-16 text-[11px] font-bold tracking-wider text-muted-foreground">L4-L8</span>
          <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary/60 shadow-inner">
            <div class="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_8px_rgba(56,189,248,0.5)] transition-all duration-1000 ease-out" style="width: {(skillDepth.deliveryReady / skillDepth.total) * 100}%"></div>
          </div>
          <span class="w-4 text-right text-[11px] font-black text-foreground">{skillDepth.deliveryReady}</span>
        </div>
      {/if}
      {#if skillDepth.foundation > 0}
        <div class="flex items-center gap-3">
          <span class="w-16 text-[11px] font-bold tracking-wider text-muted-foreground">L0-L3</span>
          <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary/60 shadow-inner">
            <div class="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] transition-all duration-1000 ease-out" style="width: {(skillDepth.foundation / skillDepth.total) * 100}%"></div>
          </div>
          <span class="w-4 text-right text-[11px] font-black text-foreground">{skillDepth.foundation}</span>
        </div>
      {/if}
    </div>
    <p class="mt-2 text-[10px] font-semibold text-muted-foreground">
      {t('user.profile_overview.total_skills', { count: skillDepth.total }, `Total: ${skillDepth.total} skills`)}
    </p>
  {:else}
    <p class="mt-3 text-xs text-muted-foreground">{t('user.profile_overview.no_skill_data', {}, 'No skills declared yet.')}</p>
  {/if}
</div>
